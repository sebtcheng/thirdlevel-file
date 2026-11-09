import { execSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { dirname, join, resolve } from "node:path";
import type { Plugin } from "vite";
import { fingerprintOf, sanitizePayload, sanitizeString, setRuntimeSecrets } from "./sanitize";

const MAX_BODY = 1024 * 1024;
const SECRET_ENV_KEY = /secret|token|pass|key|dsn|credential|url/i;

function findRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "dev-diagnostics.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

/** Secret values from .env files, kept in memory only, to redact them if they ever reach a log line. */
function loadEnvSecrets(root: string): string[] {
  const values: string[] = [];
  for (const name of [".env", ".env.local", ".env.development"]) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_]\w*)\s*=\s*(.*)\s*$/.exec(line);
      const value = m?.[2]?.replace(/^["']|["']$/g, "");
      if (m && value && SECRET_ENV_KEY.test(m[1] ?? "")) values.push(value);
    }
  }
  return values;
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        req.destroy();
        done(null);
      } else chunks.push(c);
    });
    req.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => done(null));
  });
}

/** Vite echoes browser console output to the terminal as `[console.warn] ...`; the browser logger already has it. */
const FORWARDED_BROWSER_CONSOLE = /\[console\.(?:log|info|warn|error|debug)\]/;

const isLocal = (host: string | undefined): boolean =>
  /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host ?? "");

/** Serves `POST /__dev/log` (dev server only) and writes `.logs/browser.jsonl`. Adds nothing to production bundles. */
export function devLogSink(): Plugin {
  const root = findRoot(process.cwd());
  const configFile = join(root, "dev-diagnostics.config.json");
  const config = JSON.parse(readFileSync(configFile, "utf8")) as {
    logDir: string;
    maxFileBytes: number;
    maxErrorsFileBytes?: number;
    summaryDebounceMs: number;
    summaryWarnDebounceMs?: number;
  };
  const logDir = resolve(root, config.logDir);
  const commit = (() => {
    try {
      return execSync("git rev-parse --short=12 HEAD", {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      return "unknown";
    }
  })();
  let summaryTimer: ReturnType<typeof setTimeout> | undefined;

  const capFor = (file: string): number =>
    file === "errors.jsonl" ? (config.maxErrorsFileBytes ?? 10_485_760) : config.maxFileBytes;
  const rotateIfLarge = (file: string): void => {
    const target = join(logDir, file);
    try {
      if (statSync(target).size > capFor(file)) renameSync(target, `${target}.1`);
    } catch {
      // file does not exist yet
    }
  };
  const append = (file: string, lines: string): void => {
    mkdirSync(logDir, { recursive: true });
    rotateIfLarge(file);
    appendFileSync(join(logDir, file), lines, "utf8");
  };
  /** Errors are also kept in errors.jsonl, so rotating busy output cannot push an error out. */
  const appendErrors = (lines: string[]): void => {
    if (lines.length) append("errors.jsonl", `${lines.join("")}`);
  };
  // A warning rebuilds LATEST.md later than an error does, so a burst of warnings is one rebuild.
  let warnTimer: ReturnType<typeof setTimeout> | undefined;
  const runSummary = (): void => {
    clearTimeout(summaryTimer);
    clearTimeout(warnTimer);
    summaryTimer = undefined;
    warnTimer = undefined;
    const script = join(root, "tools/dev-diagnostics/summarize-logs.mjs");
    if (existsSync(script))
      spawn(process.execPath, [script], { cwd: root, stdio: "ignore" }).unref();
  };
  const scheduleSummary = (level: "error" | "warn" = "error"): void => {
    if (level === "error") {
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(runSummary, config.summaryDebounceMs);
    } else if (!warnTimer && !summaryTimer) {
      warnTimer = setTimeout(runSummary, config.summaryWarnDebounceMs ?? 10_000);
    }
  };
  const consoleEntry = (level: "error" | "warn", kind: string, message: string): void => {
    const msg = sanitizeString(message);
    const ts = new Date().toISOString();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: process.env["DEV_DIAG_SESSION"] ?? "unknown",
      ts,
      level,
      layer: "console",
      kind,
      context: "vite",
      message: msg,
      fingerprint: fingerprintOf("console", "vite", msg),
      count: 1,
      firstSeen: ts,
      lastSeen: ts,
    };
    const line = `${JSON.stringify(entry)}\n`;
    append("console.jsonl", line);
    if (level === "error") appendErrors([line]);
    scheduleSummary(level);
  };

  return {
    name: "dev-diagnostics-log-sink",
    config(userConfig, env) {
      if (env.command === "build") {
        // Production: no sink, no constants. Only hidden source maps, when the app has not chosen.
        return userConfig.build?.sourcemap === undefined
          ? { build: { sourcemap: "hidden" as const } }
          : {};
      }
      return {
        define: {
          __DEV_DIAG_CONFIG__: JSON.stringify(JSON.parse(readFileSync(configFile, "utf8"))),
          __DEV_DIAG_BUILD__: JSON.stringify(commit),
        },
      };
    },
    configureServer(server) {
      setRuntimeSecrets(loadEnvSecrets(root));
      // Size check at startup: an oversized file from an earlier run is rotated before anything is appended to it.
      for (const file of ["browser.jsonl", "console.jsonl", "errors.jsonl"]) rotateIfLarge(file);
      const logger = server.config.logger;
      const origError = logger.error.bind(logger);
      const origWarn = logger.warn.bind(logger);
      logger.error = (msg, opts) => {
        try {
          if (!FORWARDED_BROWSER_CONSOLE.test(String(msg).slice(0, 24)))
            consoleEntry("error", "vite-error", String(msg));
        } catch {
          // ignore
        }
        origError(msg, opts);
      };
      logger.warn = (msg, opts) => {
        try {
          if (!FORWARDED_BROWSER_CONSOLE.test(String(msg).slice(0, 24)))
            consoleEntry("warn", "vite-warning", String(msg));
        } catch {
          // ignore
        }
        origWarn(msg, opts);
      };
      server.ws.on("error", (err: Error) => consoleEntry("error", "vite-ws-error", err.message));

      // Fault routes for scripts/verify.mjs. Dev server only, localhost only.
      server.middlewares.use("/__dev/fault", (req, res) => {
        if (!isLocal(req.headers.host)) return void res.writeHead(403).end();
        if (req.url?.startsWith("/http-500")) {
          return void res
            .writeHead(500, { "content-type": "application/json" })
            .end('{"error":"injected"}');
        }
        res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
      });

      server.middlewares.use("/__dev/log", (req, res) => {
        if (req.method !== "POST") return void res.writeHead(405).end();
        if (!isLocal(req.headers.host)) return void res.writeHead(403).end();
        void (async () => {
          const raw = await readBody(req);
          let lines = "";
          const errorLines: string[] = [];
          let hasError = false;
          let hasWarn = false;
          try {
            const batch = JSON.parse(raw ?? "") as {
              sessionId?: string;
              dropped?: number;
              entries?: unknown[];
            };
            if (!Array.isArray(batch.entries)) throw new Error("entries");
            for (const item of batch.entries.slice(0, 100)) {
              const e = sanitizePayload(item) as Record<string, unknown>;
              if (typeof e["message"] !== "string" || typeof e["level"] !== "string") continue;
              delete e["seq"];
              e["layer"] = "browser";
              e["sessionId"] = process.env["DEV_DIAG_SESSION"] ?? batch.sessionId ?? "unknown";
              if (batch.dropped) e["droppedBefore"] = batch.dropped;
              const line = `${JSON.stringify(e)}\n`;
              if (e["level"] === "error") {
                hasError = true;
                errorLines.push(line);
              } else if (e["level"] === "warn") hasWarn = true;
              lines += line;
            }
          } catch {
            return void res.writeHead(400).end();
          }
          if (lines) append("browser.jsonl", lines);
          appendErrors(errorLines);
          if (hasError) scheduleSummary("error");
          else if (hasWarn) scheduleSummary("warn");
          res.writeHead(204).end();
        })().catch(() => res.writeHead(500).end());
      });
    },
  };
}

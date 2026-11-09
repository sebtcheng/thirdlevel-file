/**
 * Dev-only backend diagnostics. Writes `.logs/backend.jsonl`. Active only when NODE_ENV !== 'production'.
 * Call `initDevDiagnostics()` first in the backend entry, before any import with side effects.
 * Never replaces the app's logger, never throws.
 */
import { spawn } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import {
  fingerprintOf,
  formatError,
  hash32,
  sanitizePayload,
  sanitizeString,
  setRuntimeSecrets,
  type FormattedError,
} from "./sanitize.ts";

export type BackendLevel = "debug" | "info" | "warn" | "error";

export interface BackendEntry {
  id: string;
  sessionId: string;
  ts: string;
  level: BackendLevel;
  layer: "backend";
  kind: string;
  context: string;
  message: string;
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  error?: FormattedError | undefined;
  details?: unknown;
  route?: string | undefined;
  requestId?: string | undefined;
  durationMs?: number | undefined;
}

interface Config {
  logDir: string;
  maxFileBytes: number;
  maxErrorsFileBytes: number;
  summaryDebounceMs: number;
  summaryWarnDebounceMs: number;
  perfRateLimit: { perFingerprint: number; windowMs: number };
  thresholds: Record<string, number>;
}

interface RequestContext {
  requestId: string;
  started: number;
  queries: Map<string, { count: number; totalMs: number; sample: string }>;
  reportedShapes: Set<string>;
}

const als = new AsyncLocalStorage<RequestContext>();
const SECRET_ENV_KEY = /secret|token|pass|key|dsn|credential|url/i;
const sessionId = process.env["DEV_DIAG_SESSION"] ?? randomUUID();
let config: Config | undefined;
let initialized = false;

const enabled = (): boolean => process.env["NODE_ENV"] !== "production";

function findRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "dev-diagnostics.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

function loadConfig(root: string): Config {
  const defaults: Config = {
    logDir: ".logs",
    maxFileBytes: 5_242_880,
    maxErrorsFileBytes: 10_485_760,
    summaryDebounceMs: 2000,
    summaryWarnDebounceMs: 10_000,
    perfRateLimit: { perFingerprint: 6, windowMs: 60_000 },
    thresholds: {},
  };
  try {
    const raw = JSON.parse(
      readFileSync(join(root, "dev-diagnostics.config.json"), "utf8"),
    ) as Partial<Config>;
    return { ...defaults, ...raw, logDir: resolve(root, raw.logDir ?? ".logs") };
  } catch {
    return { ...defaults, logDir: resolve(root, ".logs") };
  }
}

/** Reads .env values into memory only, to redact them if they reach a log line. */
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

const threshold = (name: string, fallback: number): number => config?.thresholds[name] ?? fallback;

/** Renames `<file>` to `<file>.1` once it is over the cap (the previous `.1` is replaced). */
function rotateIfLarge(file: string, maxBytes: number): void {
  if (!config) return;
  const target = join(config.logDir, file);
  try {
    if (statSync(target).size > maxBytes) renameSync(target, `${target}.1`);
  } catch {
    // file does not exist yet
  }
}

function write(file: string, lines: string): void {
  if (!config) return;
  mkdirSync(config.logDir, { recursive: true });
  rotateIfLarge(file, file === "errors.jsonl" ? config.maxErrorsFileBytes : config.maxFileBytes);
  appendFileSync(join(config.logDir, file), lines, "utf8");
}

let rootDir = process.cwd();
let errorTimer: ReturnType<typeof setTimeout> | undefined;
let warnTimer: ReturnType<typeof setTimeout> | undefined;

/** Rebuilds LATEST.md: soon after an error, later after a warning, so a burst of warnings is one rebuild. */
function scheduleSummary(level: BackendLevel): void {
  if (!config || (level !== "error" && level !== "warn")) return;
  const run = (): void => {
    clearTimeout(errorTimer);
    clearTimeout(warnTimer);
    errorTimer = undefined;
    warnTimer = undefined;
    const script = join(rootDir, "tools/dev-diagnostics/summarize-logs.mjs");
    if (existsSync(script))
      spawn(process.execPath, [script], { cwd: rootDir, stdio: "ignore" }).unref();
  };
  if (level === "error") {
    clearTimeout(errorTimer);
    errorTimer = setTimeout(run, config.summaryDebounceMs);
    errorTimer.unref();
  } else if (!warnTimer && !errorTimer) {
    warnTimer = setTimeout(run, config.summaryWarnDebounceMs);
    warnTimer.unref();
  }
}

/** Per-fingerprint budget for perf entries, so one hot path cannot flood the file. */
const perfSeen = new Map<string, { windowStart: number; count: number }>();
function perfAllowed(fingerprint: string): boolean {
  const limit = config?.perfRateLimit ?? { perFingerprint: 6, windowMs: 60_000 };
  const now = Date.now();
  const seen = perfSeen.get(fingerprint);
  if (!seen || now - seen.windowStart > limit.windowMs) {
    perfSeen.set(fingerprint, { windowStart: now, count: 1 });
    return true;
  }
  seen.count += 1;
  return seen.count <= limit.perFingerprint;
}

let last: BackendEntry | undefined;

/** Appends one sanitized entry to backend.jsonl; collapses identical consecutive entries into a count. */
export function devLog(
  level: BackendLevel,
  kind: string,
  context: string,
  message: string,
  extra: {
    error?: unknown;
    details?: unknown;
    route?: string;
    durationMs?: number | undefined;
  } = {},
): void {
  try {
    if (!enabled() || !config) return;
    const formatted = formatError(extra.error);
    const msg = sanitizeString(message);
    const fingerprint = fingerprintOf("backend", context, msg, formatted?.stack);
    const now = new Date().toISOString();
    if (kind.startsWith("perf:") && !perfAllowed(fingerprint)) return;
    if (
      last &&
      last.fingerprint === fingerprint &&
      last.level === level &&
      level !== "info" &&
      level !== "debug"
    ) {
      last.count += 1;
      last.lastSeen = now;
      write("backend.jsonl", `${JSON.stringify({ ...last, collapsedRepeat: true })}\n`);
      return;
    }
    const entry: BackendEntry = {
      id: randomUUID(),
      sessionId,
      ts: now,
      level,
      layer: "backend",
      kind,
      context,
      message: msg,
      fingerprint,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      ...(formatted ? { error: formatted } : {}),
      ...(extra.details === undefined ? {} : { details: sanitizePayload(extra.details) }),
      ...(extra.route ? { route: extra.route } : {}),
      ...(als.getStore() ? { requestId: als.getStore()?.requestId } : {}),
      ...(extra.durationMs === undefined ? {} : { durationMs: Math.round(extra.durationMs) }),
    };
    last = entry;
    const line = `${JSON.stringify(entry)}\n`;
    write("backend.jsonl", line);
    // Errors are also kept in their own file, so rotating busy perf output can never push an error out.
    if (level === "error") write("errors.jsonl", line);
    scheduleSummary(level);
  } catch {
    // diagnostics must never break the app
  }
}

/** Normalizes SQL so repeated shapes can be counted: literals and parameters become `?`. */
export function normalizeSql(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "?")
    .replace(/\$\d+/g, "?")
    .replace(/\b\d+(?:\.\d+)?\b/g, "?")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Feeds the N+1 detector; called by instrumentPool. */
export function recordQueryShape(sql: string, durationMs: number): void {
  try {
    const ctx = als.getStore();
    if (!ctx) return;
    const shape = normalizeSql(sql);
    const key = hash32(shape);
    const stat = ctx.queries.get(key) ?? { count: 0, totalMs: 0, sample: shape };
    stat.count += 1;
    stat.totalMs += durationMs;
    ctx.queries.set(key, stat);
    if (stat.count > threshold("nPlusOneRepeats", 10) && !ctx.reportedShapes.has(key)) {
      ctx.reportedShapes.add(key);
      devLog(
        "warn",
        "perf:n-plus-one",
        "Database",
        `Possible N+1: one query shape repeated ${stat.count}+ times in a single request`,
        {
          details: { shape: stat.sample, repeats: stat.count, requestId: ctx.requestId },
          durationMs: stat.totalMs,
        },
      );
    }
  } catch {
    // ignore
  }
}

/** Milliseconds since the current request started (undefined outside a request). */
export function requestElapsedMs(): number | undefined {
  const ctx = als.getStore();
  return ctx ? Math.round(performance.now() - ctx.started) : undefined;
}

export function currentRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

type MiddlewareReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  route?: { path?: string };
  baseUrl?: string;
};
type MiddlewareRes = {
  statusCode: number;
  on: (event: string, cb: () => void) => void;
  getHeader: (name: string) => unknown;
};

/** Request context + timing. Mount before the routes. Slow requests are keyed by route pattern, not raw URL. */
export function devRequestMiddleware() {
  return (req: MiddlewareReq, res: MiddlewareRes, next: () => void): void => {
    if (!enabled()) return next();
    const incoming = req.headers["x-request-id"];
    // The HTTP logger (pino-http) assigns the id and sets the response header first; reuse it so every layer agrees.
    const assigned = res.getHeader("x-request-id");
    const requestId =
      typeof assigned === "string"
        ? assigned
        : ((Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID());
    const started = performance.now();
    als.run({ requestId, started, queries: new Map(), reportedShapes: new Set() }, () => {
      res.on("finish", () => {
        try {
          const ms = performance.now() - started;
          const pattern = req.route?.path
            ? `${req.baseUrl ?? ""}${req.route.path}`
            : ((req.url ?? "").split("?")[0] ?? "");
          const route = `${req.method ?? "GET"} ${pattern}`;
          const bytes = Number(res.getHeader("content-length") ?? 0);
          if (res.statusCode >= 400)
            devLog(
              res.statusCode >= 500 ? "error" : "warn",
              "http",
              "Request",
              `${route} responded ${res.statusCode}`,
              {
                route,
                durationMs: ms,
                details: { status: res.statusCode, requestId },
              },
            );
          if (ms > threshold("slowRequestMs", 500))
            devLog(
              "warn",
              "perf:slow-request",
              "Request",
              `Slow request ${route}: ${Math.round(ms)} ms`,
              { route, durationMs: ms, details: { status: res.statusCode, requestId } },
            );
          if (bytes > threshold("payloadBytes", 512000))
            devLog(
              "warn",
              "perf:large-payload",
              "Request",
              `Large response ${route}: ${bytes} bytes`,
              { route, details: { bytes, requestId } },
            );
        } catch {
          // ignore
        }
      });
      next();
    });
  };
}

/** A pino-compatible destination: add it to a multistream to also write warn+ entries to backend.jsonl. */
export function devPinoStream(): { write: (chunk: string) => void } | undefined {
  if (!enabled()) return undefined;
  devLog("info", "init", "DevDiagnostics", "pino stream attached", {
    details: { sources: ["pino-stream"] },
  });
  return {
    write(chunk: string): void {
      try {
        const rec = JSON.parse(chunk) as {
          level?: number;
          msg?: string;
          err?: { message?: string; stack?: string; type?: string };
          req?: { url?: string };
        };
        if (!rec.level || rec.level < 40) return;
        const error = rec.err
          ? Object.assign(new Error(rec.err.message ?? "error"), {
              stack: rec.err.stack,
              name: rec.err.type ?? "Error",
            })
          : undefined;
        devLog(rec.level >= 50 ? "error" : "warn", "pino", "pino", rec.msg ?? "pino entry", {
          error,
          details: rec,
        });
      } catch {
        // not JSON
      }
    },
  };
}

/** Idempotent. Registers process hooks, event-loop and memory monitors. No-op in production. */
export function initDevDiagnostics(): void {
  if (!enabled() || initialized) return;
  initialized = true;
  const root = findRoot(process.cwd());
  rootDir = root;
  config = loadConfig(root);
  setRuntimeSecrets(loadEnvSecrets(root));
  // Size check at startup: an oversized file from an earlier run is rotated before anything is appended to it.
  rotateIfLarge("backend.jsonl", config.maxFileBytes);
  rotateIfLarge("errors.jsonl", config.maxErrorsFileBytes);
  devLog("info", "init", "DevDiagnostics", "backend diagnostics active", {
    details: {
      sources: [
        "uncaughtExceptionMonitor",
        "unhandledRejection",
        "warning",
        "event-loop",
        "memory",
        "request-timing",
        "express-errors",
      ],
    },
  });

  process.on("uncaughtExceptionMonitor", (err, origin) =>
    devLog("error", "crash", "Process", `Uncaught exception (${origin}): ${err.message}`, {
      error: err,
    }),
  );
  process.on("unhandledRejection", (reason) =>
    devLog(
      "error",
      "rejection",
      "Process",
      `Unhandled rejection: ${formatError(reason)?.message ?? "unknown"}`,
      { error: reason },
    ),
  );
  process.on("warning", (w) =>
    devLog("warn", "node-warning", "Process", `${w.name}: ${w.message}`, { error: w }),
  );
  process.on("SIGTERM", () => devLog("info", "shutdown", "Process", "SIGTERM received"));

  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const limitMs = threshold("eventLoopP99Ms", 100);
  const loop = setInterval(() => {
    const p99 = histogram.percentile(99) / 1e6;
    const max = histogram.max / 1e6;
    histogram.reset();
    // p99 alone hides a single long block inside a 5 s window, so a max above twice the limit is reported too.
    if (p99 > limitMs || max > limitMs * 2) {
      devLog(
        "warn",
        "perf:event-loop",
        "Process",
        `Event loop delay p99 ${Math.round(p99)} ms, max ${Math.round(max)} ms`,
        { durationMs: Math.max(p99, max) },
      );
    }
  }, 5000);
  loop.unref();

  let base = { at: Date.now(), rss: process.memoryUsage().rss };
  const mem = setInterval(() => {
    const rss = process.memoryUsage().rss;
    if (Date.now() - base.at > 300_000) base = { at: Date.now(), rss };
    else if ((rss - base.rss) / 1048576 > threshold("rssGrowthMb", 100)) {
      devLog(
        "warn",
        "perf:memory",
        "Process",
        `RSS grew ${Math.round((rss - base.rss) / 1048576)} MB in under 5 minutes`,
      );
      base = { at: Date.now(), rss };
    }
  }, 30_000);
  mem.unref();
}

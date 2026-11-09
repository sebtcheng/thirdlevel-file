#!/usr/bin/env node
// Wraps `npm run dev:raw`: output passes through unchanged and is also captured to .logs/. Installed to
// tools/dev-diagnostics/. Also runs tsc --watch and the repo linter and writes .logs/static.json.
import { spawn, execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = JSON.parse(readFileSync(join(root, "dev-diagnostics.config.json"), "utf8"));
const stack = existsSync(join(root, "tools/dev-diagnostics/stack.json"))
  ? JSON.parse(readFileSync(join(root, "tools/dev-diagnostics/stack.json"), "utf8"))
  : {};
const logDir = resolve(root, config.logDir);
const sessionId = randomUUID();
const isWin = process.platform === "win32";
const pm = stack.packageManager ?? "npm";

// ---------------------------------------------------------------- session archive
mkdirSync(logDir, { recursive: true });
const previousDir = join(logDir, "previous");
const stale = readdirSync(logDir).filter((n) => n !== "previous");
if (stale.length) {
  const dest = join(previousDir, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dest, { recursive: true });
  for (const n of stale) renameSync(join(logDir, n), join(dest, n));
}
if (existsSync(previousDir)) {
  const sessions = readdirSync(previousDir).sort();
  for (const old of sessions.slice(0, Math.max(0, sessions.length - config.keepPreviousSessions)))
    rmSync(join(previousDir, old), { recursive: true, force: true });
}

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};
const session = {
  sessionId,
  startedAt: new Date().toISOString(),
  branch: git("rev-parse --abbrev-ref HEAD"),
  commit: git("rev-parse --short HEAD"),
  node: process.version,
  ports: [],
};
const saveSession = () =>
  writeFileSync(join(logDir, "session.json"), `${JSON.stringify(session, null, 2)}\n`);
saveSession();

// ---------------------------------------------------------------- helpers
// oxlint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const stripAnsi = (s) => s.replace(ANSI, "");
const SECRET_PATTERNS = [
  [/\bBearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[REDACTED_JWT]"],
  [
    /([?&;\s"'][\w.-]*(?:password|passwd|secret|token|session|jwt|csrf|otp|ssn|api[_-]?key|apikey|access[_-]?key|private[_-]?key)[\w.-]*=)[^&#\s"']*/gi,
    "$1[REDACTED]",
  ],
  [
    /((?:password|passwd|passcode|secret|token|session|jwt|csrf|otp|ssn|api[_-]?key|apikey|access[_-]?key|private[_-]?key|authorization|cookie)["']?\s*[:=]\s*["']?)(?!\[REDACTED)([^"'\s,&;}]+)/gi,
    "$1[REDACTED]",
  ],
  [/\b[a-f0-9]{33,}\b/gi, "[REDACTED_HEX]"],
];
// Values from .env files, in memory only.
const envSecrets = [];
for (const name of [".env", ".env.local", ".env.development"]) {
  const file = join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_]\w*)\s*=\s*(.*)\s*$/.exec(line);
    const v = m?.[2]?.replace(/^["']|["']$/g, "");
    if (m && v && v.length >= 8 && /secret|token|pass|key|dsn|credential|url/i.test(m[1]))
      envSecrets.push(v);
  }
}
envSecrets.sort((a, b) => b.length - a.length);
const redact = (text) => {
  let out = text.slice(0, 20_000);
  for (const s of envSecrets) if (out.includes(s)) out = out.split(s).join("[REDACTED_ENV]");
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
};
const hash32 = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};
const normalize = (t) =>
  t
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "U")
    .replace(/\d+/g, "N")
    .slice(0, 300);

function append(file, text) {
  const target = join(logDir, file);
  try {
    if (statSync(target).size > config.maxFileBytes) renameSync(target, `${target}.1`);
  } catch {
    // does not exist yet
  }
  appendFileSync(target, text, "utf8");
}

let summaryTimer;
function scheduleSummary() {
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(runSummary, config.summaryDebounceMs);
}
function runSummary() {
  clearTimeout(summaryTimer);
  const script = join(root, "tools/dev-diagnostics/summarize-logs.mjs");
  if (existsSync(script)) spawn(process.execPath, [script], { cwd: root, stdio: "ignore" }).unref();
}

function consoleEntry(level, kind, message, stackText) {
  const msg = redact(message).slice(0, 2000);
  const ts = new Date().toISOString();
  const frames = (stackText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^at\s/.test(l))
    .slice(0, 3)
    .map((l) => l.replace(/:\d+:\d+\)?$/, ""));
  append(
    "console.jsonl",
    `${JSON.stringify({
      id: randomUUID(),
      sessionId,
      ts,
      level,
      layer: "console",
      kind,
      context: "dev-runner",
      message: msg,
      fingerprint: hash32(["console", "dev-runner", normalize(msg), ...frames].join("|")),
      count: 1,
      firstSeen: ts,
      lastSeen: ts,
      ...(stackText ? { error: { name: kind, message: msg, stack: redact(stackText) } } : {}),
    })}\n`,
  );
  if (level === "error") scheduleSummary();
}

// ---------------------------------------------------------------- child output capture
const ERROR_RE =
  /(\bError:|TypeError|ReferenceError|SyntaxError|ECONNREFUSED|EADDRINUSE|Cannot find module|Failed to resolve import|\[vite\] error|\[vite\] Internal server error|Pre-transform error|\bERR_[A-Z_]+|\bFATAL\b)/;
const WARN_RE = /(MaxListenersExceededWarning|DeprecationWarning|ExperimentalWarning)/;
const RESTART_RE = /(app crashed|restarting|Restarting)/i;
const PORT_RE = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d{4,5})|port[":\s]+(\d{4,5})/gi;

let pending = null;
const restarts = [];
const flushPending = () => {
  if (!pending) return;
  consoleEntry(
    pending.level,
    pending.kind,
    pending.message,
    pending.stack.length ? pending.stack.join("\n") : undefined,
  );
  pending = null;
};

function handleLine(raw) {
  const line = stripAnsi(raw).replace(/\r$/, "");
  append("console.log", `${redact(line)}\n`);
  // Vite echoes browser console output as `[console.warn] ...`; browser.jsonl already has it,
  // so it is not a dev-console problem.
  if (/^\s*\[console\.(?:log|info|warn|error|debug)\]/.test(line)) return;
  for (const m of line.matchAll(PORT_RE)) {
    const port = Number(m[1] ?? m[2]);
    if (port > 1023 && !session.ports.includes(port)) {
      session.ports.push(port);
      saveSession();
    }
  }
  if (pending && /^\s+at\s/.test(line)) return void pending.stack.push(line);
  if (pending && /^\s*(\^|\||\d+ \|)/.test(line)) return void pending.extra.push(line);
  flushPending();
  if (RESTART_RE.test(line)) {
    const now = Date.now();
    restarts.push(now);
    while (restarts.length && now - restarts[0] > 30_000) restarts.shift();
    if (restarts.length === 3)
      consoleEntry("error", "crash-loop", `3 restarts/crashes within 30 s: ${line.trim()}`);
  }
  const kind = ERROR_RE.test(line) ? "error-line" : WARN_RE.test(line) ? "warning-line" : null;
  if (kind)
    pending = {
      level: kind === "error-line" ? "error" : "warn",
      kind,
      message: line.trim(),
      stack: [],
      extra: [],
    };
}

function pipeLines(stream, passthrough) {
  let buffer = "";
  stream.on("data", (chunk) => {
    passthrough.write(chunk);
    buffer += chunk.toString("utf8");
    let i;
    while ((i = buffer.indexOf("\n")) > -1) {
      handleLine(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
    }
    clearTimeout(pipeLines.timer);
    pipeLines.timer = setTimeout(flushPending, 150);
  });
  stream.on("end", () => {
    if (buffer) handleLine(buffer);
    flushPending();
  });
}

const env = {
  ...process.env,
  DEV_DIAG_SESSION: sessionId,
  ...(process.stdout.isTTY ? { FORCE_COLOR: process.env.FORCE_COLOR ?? "1" } : {}),
};
// One child per dev command (frontend and backend), or the original `dev:raw` when none were recorded.
const devCommands = stack.devCommands?.length ? stack.devCommands : [`${pm} run dev:raw`];
const devChildren = devCommands.map((command) => {
  const c = spawn(command, { cwd: root, env, shell: true, stdio: ["inherit", "pipe", "pipe"] });
  pipeLines(c.stdout, process.stdout);
  pipeLines(c.stderr, process.stderr);
  return c;
});

// ---------------------------------------------------------------- static analysis
const snapshot = { generatedAt: null, sources: {}, files: {} };
const tscFindings = {};
let lintFindings = [];
const writeStatic = () => {
  const files = {};
  const add = (f) =>
    (files[f.file] ??= []).push({
      source: f.source,
      rule: f.rule,
      severity: f.severity,
      line: f.line,
      column: f.column,
      message: f.message,
    });
  Object.values(tscFindings).flat().forEach(add);
  lintFindings.forEach(add);
  snapshot.files = files;
  snapshot.generatedAt = new Date().toISOString();
  writeFileSync(join(logDir, "static.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  scheduleSummary();
};

const children = [...devChildren];
if (config.staticAnalysis?.tsc) {
  for (const dir of stack.tsconfigDirs ?? []) {
    if (!existsSync(join(root, dir, "tsconfig.json"))) continue;
    snapshot.sources.tsc = {
      active: true,
      packages: [...(snapshot.sources.tsc?.packages ?? []), dir],
    };
    const tsc = spawn(
      `npx --no-install tsc --noEmit --watch --preserveWatchOutput --pretty false -p ${dir}`,
      { cwd: root, shell: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    children.push(tsc);
    tscFindings[dir] = [];
    let current = [];
    let buf = "";
    tsc.stdout.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\n")) > -1) {
        const line = stripAnsi(buf.slice(0, i)).trim();
        buf = buf.slice(i + 1);
        const m = /^(.+?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)$/.exec(line);
        if (m) {
          const file = resolve(root, dir, m[1]);
          current.push({
            source: "tsc",
            file: file.startsWith(root) ? file.slice(root.length + 1).replaceAll("\\", "/") : m[1],
            line: Number(m[2]),
            column: Number(m[3]),
            severity: m[4],
            rule: m[5],
            message: redact(m[6]),
          });
        } else if (/Starting (incremental )?compilation|File change detected/.test(line))
          current = [];
        else if (/Watching for file changes/.test(line)) {
          tscFindings[dir] = current;
          writeStatic();
        }
      }
    });
  }
}
if (config.staticAnalysis?.lint && stack.linter) {
  snapshot.sources.lint = { active: true, tool: stack.linter };
  const dirs = [stack.frontendDir, stack.backendDir].filter(Boolean);
  let running = false;
  let lintTimer;
  const runLint = async () => {
    if (running) return;
    running = true;
    const all = [];
    for (const dir of dirs) {
      const cfgArg = existsSync(join(root, "eslint.config.js")) ? " --config eslint.config.js" : "";
      const cmd =
        stack.linter === "oxlint"
          ? `npx --no-install oxlint -f json ${dir}/src`
          : `npx --no-install eslint${cfgArg} -f json ${dir}/src`;
      const out = await new Promise((done) => {
        const p = spawn(cmd, {
          cwd: root,
          shell: true,
          stdio: ["ignore", "pipe", "ignore"],
        });
        let text = "";
        p.stdout.on("data", (c) => (text += c));
        p.on("close", () => done(text));
        p.on("error", () => done(""));
      });
      try {
        const json = JSON.parse(out.slice(out.indexOf(out.includes('{"diagnostics"') ? "{" : "[")));
        const rel = (f) =>
          `${dir}/${String(f)
            .replaceAll("\\", "/")
            .replace(/^.*?\/src\//, "src/")}`;
        if (Array.isArray(json)) {
          for (const r of json)
            for (const m of r.messages)
              all.push({
                source: "lint",
                file: rel(r.filePath),
                line: m.line,
                column: m.column,
                severity: m.severity === 2 ? "error" : "warning",
                rule: m.ruleId ?? "parse",
                message: redact(m.message),
              });
        } else {
          for (const d of json.diagnostics ?? [])
            all.push({
              source: "lint",
              file: rel(d.filename),
              line: d.labels?.[0]?.span?.line ?? 0,
              column: d.labels?.[0]?.span?.column ?? 0,
              severity: d.severity === "error" ? "error" : "warning",
              rule: d.code ?? "oxlint",
              message: redact(d.message),
            });
        }
      } catch {
        // linter missing or not JSON: no findings for this package
      }
    }
    lintFindings = all;
    running = false;
    writeStatic();
  };
  const schedule = () => {
    clearTimeout(lintTimer);
    lintTimer = setTimeout(() => void runLint(), config.staticAnalysis.lintDebounceMs);
  };
  schedule();
  // Node 20+ supports recursive watching on all platforms.
  for (const dir of dirs) {
    const src = join(root, dir, "src");
    if (!existsSync(src)) continue;
    try {
      watch(src, { recursive: true }, (_e, name) => {
        if (name && /\.(ts|tsx|js|jsx)$/.test(name)) schedule();
      });
    } catch {
      // watching unsupported: lint runs once at start
    }
  }
}
writeStatic();

// ---------------------------------------------------------------- lifecycle
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    try {
      if (isWin && c.pid)
        spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
      else c.kill(signal);
    } catch {
      // already gone
    }
  }
}
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

let running = devChildren.length;
let firstFailure = 0;
for (const [index, c] of devChildren.entries()) {
  c.on("exit", (code, signal) => {
    flushPending();
    const exitCode = code ?? (signal ? 1 : 0);
    if (!stopping && exitCode !== 0) {
      consoleEntry(
        "error",
        "child-exit",
        `${devCommands[index]} exited with code ${exitCode}${signal ? ` (${signal})` : ""}`,
      );
      firstFailure ||= exitCode;
    }
    running -= 1;
    // The other dev servers keep running; the runner ends when the last one has exited or on SIGINT/SIGTERM.
    if (running > 0 && !stopping) return;
    stop("SIGTERM");
    clearTimeout(summaryTimer);
    const done = spawn(process.execPath, [join(root, "tools/dev-diagnostics/summarize-logs.mjs")], {
      cwd: root,
      stdio: "ignore",
    });
    done.on("close", () => process.exit(firstFailure || exitCode));
    done.on("error", () => process.exit(firstFailure || exitCode));
  });
}

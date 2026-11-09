#!/usr/bin/env node
// Builds .logs/LATEST.md from the .jsonl files and static.json. Facts and measurements only: no diagnosis, no fixes.
// Usage: node summarize-logs.mjs [--since ISO] [--level error|warn|all] [--out path] [--json]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = existsSync(join(process.cwd(), "dev-diagnostics.config.json"))
  ? process.cwd()
  : resolve(here, "../..");
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const config = JSON.parse(readFileSync(join(root, "dev-diagnostics.config.json"), "utf8"));
const logDir = resolve(root, config.logDir);
const since = opt("--since") ? Date.parse(opt("--since")) : 0;
const levelOpt = opt("--level") ?? "warn";
const outFile = resolve(root, opt("--out") ?? join(config.logDir, "LATEST.md"));
const MAX_LINES = 400;
const KEEP_ERRORS = 25;
const KEEP_INEFFICIENCIES = 20;
const KEEP_STATIC = 50;
const DEFAULT_STACK_IGNORE = [
  "devtools/",
  "src/api/client\\.",
  "src/api/apiClient\\.",
  "node_modules",
  "\\.vite/deps",
  "react-dom",
  "react-router",
  "@tanstack",
  "@mantine",
  "chunk-",
];
const stackIgnore = (config.stackIgnore ?? DEFAULT_STACK_IGNORE).map((p) => new RegExp(p));
// Logger files, the API client and library internals are not where the problem is; the first frame past them is.
const isInfrastructure = (frame) => stackIgnore.some((re) => re.test(frame));
const statusOf = (e) =>
  e.details?.status ??
  /HTTP (\d{3})|-> (\d{3})$/
    .exec(e.message ?? "")
    ?.slice(1)
    .find(Boolean);
const isAuth = (e) => [401, 403].includes(Number(statusOf(e)));

const readJsonl = (name) => {
  const file = join(logDir, name);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((l) => {
      try {
        return l.trim() ? [JSON.parse(l)] : [];
      } catch {
        return [];
      }
    });
};
const readJson = (name) => {
  try {
    return JSON.parse(readFileSync(join(logDir, name), "utf8"));
  } catch {
    return null;
  }
};
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
};

// ---------------------------------------------------------------- source-map resolution (best effort)
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeMappings(mappings) {
  const lines = [];
  let src = 0,
    sl = 0,
    sc = 0,
    nm = 0;
  for (const part of mappings.split(";")) {
    let gc = 0;
    const segs = [];
    for (const seg of part.split(",")) {
      if (!seg) continue;
      const nums = [];
      let shift = 0,
        val = 0;
      for (const ch of seg) {
        const d = B64.indexOf(ch);
        val += (d & 31) << shift;
        if (d & 32) shift += 5;
        else {
          nums.push(val & 1 ? -(val >> 1) : val >> 1);
          shift = 0;
          val = 0;
        }
      }
      gc += nums[0];
      if (nums.length >= 4) {
        src += nums[1];
        sl += nums[2];
        sc += nums[3];
        if (nums.length >= 5) nm += nums[4];
        segs.push([gc, src, sl, sc]);
      }
    }
    lines.push(segs);
  }
  return lines;
}
const mapCache = new Map();
function resolveFrame(frame) {
  const m = /^(\s*at .*?\()?(.+?\.js):(\d+):(\d+)\)?$/.exec(frame.trim());
  if (!m) return frame;
  const [, , file, ln, col] = m;
  const name = file.split(/[\\/]/).pop();
  if (!mapCache.has(name)) {
    let found = null;
    for (const dir of ["dist", "build", "apps/frontend/dist", "apps/backend/dist"]) {
      const p = join(root, dir, `${name}.map`);
      if (existsSync(p)) {
        try {
          found = JSON.parse(readFileSync(p, "utf8"));
        } catch {
          /* ignore */
        }
        break;
      }
    }
    mapCache.set(name, found && { sources: found.sources, lines: decodeMappings(found.mappings) });
  }
  const map = mapCache.get(name);
  const segs = map?.lines[Number(ln) - 1];
  if (!segs) return frame;
  let best;
  for (const s of segs) if (s[0] <= Number(col) - 1) best = s;
  return best
    ? `at ${map.sources[best[1]]}:${best[2] + 1}:${best[3] + 1} (mapped from ${name}:${ln}:${col})`
    : frame;
}

// ---------------------------------------------------------------- load and group
// errors.jsonl keeps errors that rotating busy files would otherwise lose. The same entry can sit in two files.
const seenKeys = new Set();
const runtime = [
  ...readJsonl("browser.jsonl"),
  ...readJsonl("backend.jsonl"),
  ...readJsonl("errors.jsonl"),
].filter((e) => {
  const key = `${e.id}|${e.count ?? 1}|${e.collapsedRepeat ? 1 : 0}`;
  if (seenKeys.has(key)) return false;
  seenKeys.add(key);
  return !since || Date.parse(e.ts) >= since;
});
const consoleEntries = readJsonl("console.jsonl").filter(
  (e) => !since || Date.parse(e.ts) >= since,
);
const staticData = readJson("static.json");
const session = readJson("session.json") ?? {};
const rank = { error: 3, warn: 2, info: 1, debug: 0 };
const minRank = levelOpt === "all" ? 0 : (rank[levelOpt] ?? 2);

function group(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = e.fingerprint ?? `${e.layer}|${e.context}|${e.message}`;
    const g = map.get(key) ?? {
      ...e,
      count: 0,
      firstSeen: e.firstSeen ?? e.ts,
      lastSeen: e.lastSeen ?? e.ts,
      maxDuration: 0,
      totalDuration: 0,
    };
    // Collapsed repeats re-write the same entry with a higher count; take the highest.
    g.count = Math.max(g.count, 0) + (e.collapsedRepeat ? 0 : 1);
    if (e.collapsedRepeat) g.count = Math.max(g.count, e.count);
    else if ((e.count ?? 1) > 1) g.count += e.count - 1;
    if ((e.lastSeen ?? e.ts) > g.lastSeen) g.lastSeen = e.lastSeen ?? e.ts;
    if ((e.firstSeen ?? e.ts) < g.firstSeen) g.firstSeen = e.firstSeen ?? e.ts;
    if (e.durationMs) {
      g.maxDuration = Math.max(g.maxDuration, e.durationMs);
      g.totalDuration += e.durationMs * (e.collapsedRepeat ? 0 : 1);
    }
    if (e.breadcrumbs) g.breadcrumbs = e.breadcrumbs;
    map.set(key, g);
  }
  return [...map.values()];
}

const meaningful = runtime.filter((e) => e.kind !== "init");
const rid = (e) => e.requestId ?? e.details?.requestId ?? e.details?.req?.id;
const is401 = (e) => Number(statusOf(e)) === 401;
// Recovered: a refresh succeeded within 5 s after the 401 and the same request did not fail with 401 again.
const refreshes = runtime.filter((e) => e.kind === "auth-refresh");
const browser401s = meaningful.filter(
  (e) => e.layer === "browser" && e.kind === "http" && is401(e),
);
const recoveredEntries = browser401s.filter((e) => {
  const t = Date.parse(e.ts);
  const refreshed = refreshes.some(
    (r) => Date.parse(r.ts) - t >= 0 && Date.parse(r.ts) - t <= 5000,
  );
  const failedAgain = browser401s.some(
    (o) =>
      o !== e &&
      o.details?.path === e.details?.path &&
      o.details?.method === e.details?.method &&
      Date.parse(o.ts) - t > 0 &&
      Date.parse(o.ts) - t <= 10000,
  );
  return refreshed && !failedAgain;
});
const recoveredIds = new Set(recoveredEntries.map(rid).filter(Boolean));
const isRecovered = (e) =>
  is401(e) && (recoveredEntries.includes(e) || (rid(e) && recoveredIds.has(rid(e))));
const errorGroups = group(
  meaningful.filter(
    (e) =>
      !String(e.kind).startsWith("perf:") &&
      rank[e.level] >= Math.max(minRank, 2) &&
      !isRecovered(e),
  ),
).sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1));
// One request is one entry: when the browser side of a request is listed, its backend side is shown under it
// ("Same request, backend ...") instead of as a second error.
const browserRequestIds = new Set(
  errorGroups
    .filter((g) => g.layer === "browser")
    .map(rid)
    .filter(Boolean),
);
const errors = errorGroups.filter(
  (g) => g.layer === "browser" || !rid(g) || !browserRequestIds.has(rid(g)),
);
const ineff = group(meaningful.filter((e) => String(e.kind).startsWith("perf:")))
  .map((g) => ({ ...g, impact: g.totalDuration || g.count * (g.maxDuration || 1) }))
  .sort((a, b) => b.impact - a.impact);
const consoleProblems = group(
  consoleEntries.filter((e) => rank[e.level] >= Math.max(minRank, 2)),
).sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1));

// ---------------------------------------------------------------- render
// Every section is always present and in the fixed order. Sections 1 and 3-6 are rendered first with their own caps;
// the errors section then fills whatever remains of the line budget, newest first.
const cut = [];
const fence = (t) => `\`\`\`\n${t}\n\`\`\``;
const short = (iso) => (iso ? iso.replace("T", " ").slice(0, 19) : "?");

const s1 = ["## 1. Session"];
s1.push(`- Session id: ${session.sessionId ?? "unknown (dev runner not used)"}`);
s1.push(`- Started: ${session.startedAt ?? "unknown"}`);
s1.push(
  `- Git: ${session.branch ?? git("rev-parse --abbrev-ref HEAD")} @ ${session.commit ?? git("rev-parse --short HEAD")}`,
);
s1.push(`- Node: ${session.node ?? process.version}`);
s1.push(`- Ports seen in dev output: ${(session.ports ?? []).join(", ") || "none"}`);
s1.push(
  `- Counts: ${errors.length} error group(s), ${ineff.length} inefficiency group(s), ${consoleProblems.length} dev-console problem(s)`,
);
s1.push("");

const s3 = ["## 3. Inefficiencies (ranked by impact = total measured time, else count x duration)"];
if (!ineff.length) s3.push("", "None recorded.");
if (ineff.some((e) => e.devMode))
  s3.push(
    "",
    "Entries marked [dev build] were measured in development: durations include dev-mode overhead (StrictMode double renders, the Profiler). Confirm in a production build before judging severity.",
  );
for (const [i, e] of ineff.slice(0, KEEP_INEFFICIENCIES).entries()) {
  s3.push(
    `${i + 1}. [${e.layer}] ${e.kind.replace("perf:", "")}${e.devMode ? " [dev build]" : ""}: ${e.message}`,
  );
  s3.push(
    `   - Count: ${e.count} | Max: ${e.maxDuration || "n/a"} ms | Total: ${Math.round(e.totalDuration) || "n/a"} ms | Last: ${short(e.lastSeen)}${e.route ? ` | Route: ${e.route}` : ""}`,
  );
  if (e.details && typeof e.details === "object") {
    const d = e.details;
    const facts = [
      "shape",
      "repeats",
      "bytes",
      "responseBytes",
      "paramCount",
      "rowCount",
      "path",
      "method",
      "status",
    ]
      .filter((k) => d[k] !== undefined)
      .map((k) => `${k}=${JSON.stringify(d[k])}`);
    if (facts.length) s3.push(`   - ${facts.join(", ")}`);
  }
}
if (ineff.length > KEEP_INEFFICIENCIES)
  cut.push(`${ineff.length - KEEP_INEFFICIENCIES} lower-impact inefficiency group(s)`);
s3.push("");

const s4 = ["## 4. Static analysis"];
if (!staticData) s4.push("", "No static.json (dev runner not used or no analysis ran yet).");
else {
  const all = Object.entries(staticData.files ?? {}).flatMap(([file, list]) =>
    list.map((f) => ({ file, ...f })),
  );
  const order = (f) => (f.source === "tsc" ? 0 : f.severity === "error" ? 1 : 2);
  all.sort((a, b) => order(a) - order(b) || a.file.localeCompare(b.file) || a.line - b.line);
  s4.push(
    "",
    `Generated ${short(staticData.generatedAt)} | total findings: ${all.length} (type errors ${all.filter((f) => f.source === "tsc").length}, lint errors ${all.filter((f) => f.source === "lint" && f.severity === "error").length}, warnings ${all.filter((f) => f.source === "lint" && f.severity !== "error").length})`,
  );
  for (const f of all.slice(0, KEEP_STATIC))
    s4.push(
      `- ${f.source === "tsc" ? "type" : f.severity} ${f.file}:${f.line}:${f.column ?? 0} ${f.rule}: ${f.message}`,
    );
  if (all.length > KEEP_STATIC) cut.push(`${all.length - KEEP_STATIC} static finding(s)`);
}
s4.push("");

const s5 = ["## 5. Dev console problems"];
if (!consoleProblems.length) s5.push("", "None recorded.");
for (const e of consoleProblems.slice(0, 10)) {
  s5.push(
    `- [${e.level}] ${e.kind} x${e.count} (last ${short(e.lastSeen)}): ${e.message.slice(0, 300)}`,
  );
  const frames = (e.error?.stack ?? "").split("\n").slice(0, 3);
  if (frames.length > 1) s5.push(fence(frames.join("\n")));
}
if (consoleProblems.length > 10) cut.push(`${consoleProblems.length - 10} dev-console problem(s)`);
s5.push("");

const sourcesOf = (layer) =>
  new Set(
    runtime
      .filter((e) => e.layer === layer && e.kind === "init")
      .flatMap((e) => e.details?.sources ?? []),
  );
const browserSources = sourcesOf("browser");
const backendSources = sourcesOf("backend");
const stack = (() => {
  try {
    return JSON.parse(readFileSync(join(root, "tools/dev-diagnostics/stack.json"), "utf8"));
  } catch {
    return {};
  }
})();
const s6 = ["## 6. Coverage"];
s6.push(
  `- Browser logger: ${browserSources.size ? `active (${[...browserSources].join(", ")})` : "NOT captured this session: no init entry seen (not installed, or no page was loaded)"}`,
);
s6.push(
  `- Backend: ${backendSources.size ? `active (${[...backendSources].join(", ")})` : "NOT captured this session: no entries from the backend process (it was not started through the dev runner, or the diagnostics bootstrap is not the first import)"}`,
);
s6.push(
  `- pino: ${stack.has?.pino ? (backendSources.has("pino-stream") ? "stream attached (warn and above go to backend.jsonl)" : "NOT attached: pino is used but devPinoStream() is not wired into the logger") : "not detected"}`,
);
s6.push(
  `- pg pool: ${stack.has?.pg ? (backendSources.has("pg-pool") ? "instrumented" : "NOT instrumented: wrap the pool with instrumentPool()") : "not installed (pg not detected)"}`,
);
s6.push(
  `- Drizzle: ${stack.has?.drizzle ? "detected (runs on the pg Pool, covered by the pool instrument)" : "not detected"}`,
);
s6.push(
  "- Retention: errors also go to errors.jsonl (kept when busy files rotate); perf entries are rate-limited per fingerprint.",
);
s6.push(
  `- Static analysis: tsc ${staticData?.sources?.tsc?.active ? `active for ${staticData.sources.tsc.packages.join(", ")}` : "not active"}; lint ${staticData?.sources?.lint?.active ? staticData.sources.lint.tool : "not active"}`,
);
s6.push(
  `- Playwright: ${stack.playwright ? "available for verify.mjs" : "not detected (verify.mjs uses synthetic browser entries)"}`,
);
s6.push("- SQL tuning is out of scope here; the orm-optimizer skill covers it.");

// Errors fill the remaining budget (at least a few groups always fit).
const renderError = (e, i) => {
  const lines = ["", `### ${i + 1}. [${e.layer}] ${e.context}: ${e.message}`];
  lines.push(
    `- Level: ${e.level} | Count: ${e.count} | First: ${short(e.firstSeen)} | Last: ${short(e.lastSeen)}`,
  );
  if (e.route) lines.push(`- Route: ${e.route}`);
  const requestId = rid(e);
  if (requestId) lines.push(`- Request id: ${requestId}`);
  if (requestId) {
    // The other side of the same request: what the browser saw and what the backend logged, side by side.
    const joined = meaningful
      .filter((o) => o.id !== e.id && o.layer !== e.layer && rid(o) === requestId)
      .slice(0, 4);
    for (const o of joined) {
      const issues = Array.isArray(o.details?.issues)
        ? ` | issues: ${o.details.issues
            .slice(0, 5)
            .map((issue) => `${issue.path ?? issue.field}: ${issue.message}`)
            .join("; ")}`
        : "";
      lines.push(
        `- Same request, ${o.layer} [${o.kind}]: ${String(o.message).slice(0, 100)}${o.details?.status ? ` (status ${o.details.status})` : ""}${issues}`,
      );
    }
  }
  if (statusOf(e))
    lines.push(`- Status: ${statusOf(e)}${e.details?.path ? ` | Path: ${e.details.path}` : ""}`);
  if (e.error?.name) lines.push(`- Error: ${e.error.name}: ${e.error.message}`);
  let cause = e.error?.cause;
  for (let d = 0; cause && d < 4; d++) {
    lines.push(
      `- Caused by: ${typeof cause === "string" ? cause : `${cause.name}: ${cause.message}`}`,
    );
    cause = typeof cause === "string" ? null : cause.cause;
  }
  const allFrames = (e.error?.stack ?? "").split("\n").filter((l) => /^\s*at\s|@/.test(l));
  const callerFrames = allFrames.filter((f) => !isInfrastructure(f));
  // If everything is infrastructure, show it rather than nothing.
  const frames = (callerFrames.length ? callerFrames : allFrames).slice(0, 10).map(resolveFrame);
  if (callerFrames.length) lines.push(`- Called from: ${resolveFrame(callerFrames[0]).trim()}`);
  if (frames.length)
    lines.push(
      "",
      `Stack (top ${frames.length}${callerFrames.length && allFrames.length > callerFrames.length ? `, ${allFrames.length - callerFrames.length} logger/API-client/library frame(s) skipped` : ""}):`,
      fence(frames.map((f) => f.trim()).join("\n")),
    );
  if (e.details !== undefined)
    lines.push("", "Payload (sanitized):", fence(JSON.stringify(e.details, null, 2).slice(0, 800)));
  const crumbs = (e.breadcrumbs ?? []).slice(-10);
  if (crumbs.length)
    lines.push(
      "",
      "Last breadcrumbs:",
      ...crumbs.map((b, n) => `${n + 1}. [${b.type}] ${b.message}`),
    );
  return lines;
};
// Fenced blocks are single strings holding several lines, so count real lines.
const lineCount = (arr) => arr.join("\n").split("\n").length;
const fixed = lineCount(s1) + lineCount(s3) + lineCount(s4) + lineCount(s5) + lineCount(s6) + 6;
let budget = Math.max(40, MAX_LINES - fixed);
const s2 = ["## 2. Errors (newest first)"];
if (recoveredEntries.length)
  s2.push(
    "",
    `- Info: ${recoveredEntries.length} 401 response(s) were expected token refreshes (a refresh and retry then succeeded): ${[...new Set(recoveredEntries.map((e) => e.details?.path))].slice(0, 5).join(", ")}`,
  );
if (!errors.length) s2.push("", "None recorded.");
let shown = 0;
// Auth problems (401/403) get their own group, listed first, so they are easy to spot.
const ordered = [...errors.filter(isAuth), ...errors.filter((e) => !isAuth(e))];
const authCount = errors.filter(isAuth).length;
for (const [i, e] of ordered.slice(0, KEEP_ERRORS).entries()) {
  if (i === 0 && authCount > 0) s2.push("", `### Auth problems (401/403): ${authCount} group(s)`);
  if (i === authCount && authCount > 0 && ordered.length > authCount)
    s2.push("", "### Other errors");
  const block = renderError(e, i);
  const size = lineCount(block);
  if (shown > 0 && size > budget) break;
  s2.push(...block);
  budget -= size;
  shown += 1;
}
if (errors.length > shown) cut.push(`${errors.length - shown} older error group(s)`);
s2.push("");

const out = ["# Dev diagnostics digest", "", ...s1, ...s2, ...s3, ...s4, ...s5, ...s6];
if (cut.length) out.push("", `Truncated: ${cut.join("; ")}.`);
writeFileSync(outFile, `${out.join("\n")}\n`, "utf8");
if (args.includes("--json")) {
  writeFileSync(
    join(logDir, "latest.json"),
    `${JSON.stringify({ session, errors, inefficiencies: ineff, consoleProblems, static: staticData }, null, 2)}\n`,
  );
}

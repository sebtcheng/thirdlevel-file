/**
 * Dev-only browser diagnostics. Captures runtime errors, failed requests and measurable inefficiencies and
 * posts them to the Vite dev sink (`/__dev/log`), which writes `.logs/browser.jsonl`.
 *
 * Must be the FIRST import of the app entry and called before React renders. Every code path is guarded by
 * `import.meta.env.DEV`, so production builds drop it. Never throws, never recurses.
 */
import { LOG_BADGE_STYLE } from "../theme/log-colors";
import {
  fingerprintOf,
  formatError,
  routeOf,
  sanitizePayload,
  sanitizeString,
  sanitizeUrl,
  type FormattedError,
} from "./sanitize";

export type DevLevel = "debug" | "info" | "warn" | "error" | "silent";
type Crumb = { ts: string; type: "route" | "click" | "fetch" | "console" | "log"; message: string };

export interface DevLogEntry {
  id: string;
  sessionId: string;
  ts: string;
  level: Exclude<DevLevel, "silent">;
  layer: "browser";
  kind: string;
  context: string;
  message: string;
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  error?: FormattedError;
  details?: unknown;
  route: string;
  userAgent: string;
  viewport: string;
  online: boolean;
  build: string;
  user: { id: string; role: string } | null;
  durationMs?: number;
  /** Perf entries only: measured in a dev build, so the numbers include dev-mode overhead (StrictMode, Profiler). */
  devMode?: boolean;
  breadcrumbs?: Crumb[];
}

interface DevConfig {
  levels: DevLevel;
  thresholds: Record<string, number>;
  verboseBodies: boolean;
  perfRateLimit?: { perFingerprint: number; windowMs: number };
}

declare global {
  interface Window {
    __DEV_DIAGNOSTICS_LEVEL__?: DevLevel;
    exportDevErrorReport?: (options?: { format?: "json" | "markdown" }) => string;
    copyDevErrorReport?: () => Promise<boolean>;
    downloadDevErrorReport?: () => void;
    __DEV_DIAG_CRASH__?: () => void;
  }
  /** Injected by the Vite plugin (`define`). */
  const __DEV_DIAG_CONFIG__: DevConfig | undefined;
  const __DEV_DIAG_BUILD__: string | undefined;
}

const DEFAULT_CONFIG: DevConfig = {
  levels: "debug",
  verboseBodies: false,
  thresholds: {
    slowFetchMs: 1000,
    longTaskMs: 100,
    slowCommitMs: 50,
    excessiveCommitsPer5s: 20,
    duplicateGetWindowMs: 500,
    requestsPerRouteLoad: 30,
    payloadBytes: 512000,
    heapGrowthMb: 50,
  },
};

const PRIORITY: Record<DevLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const LEVEL_KEY = "dev_diagnostics_level";
const PERSIST_KEY = "dev_diagnostics_errors";
const SINK = "/__dev/log";
const PATCHED = Symbol.for("dev-diagnostics.patched");
const MAX_NOISE = 100;
const MAX_IMPORTANT = 200;
const MAX_CRUMBS = 30;
const BADGE: Record<Exclude<DevLevel, "silent">, string> = LOG_BADGE_STYLE;

/** Key names of a JSON request body (never values); arrays are summarised by their first element. */
function keyShape(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value))
    return value.length ? [keyShape(value[0], depth + 1) ?? typeof value[0]] : [];
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, keyShape(v, depth + 1) ?? typeof v]),
  );
}

function requestBodyKeys(body: unknown): unknown {
  if (typeof body !== "string") return undefined;
  try {
    return keyShape(JSON.parse(body));
  } catch {
    return undefined;
  }
}

const MAX_BODY_CHARS = 16_384;

/** Sanitized, size-capped body: JSON is parsed so nested arrays (validation issues) stay fully expanded. */
function readBody(text: string): unknown {
  if (text.length > MAX_BODY_CHARS)
    return `${sanitizeString(text.slice(0, 2048))}…[body truncated, ${text.length} chars]`;
  try {
    return sanitizePayload(JSON.parse(text));
  } catch {
    return sanitizeString(text);
  }
}

const stripSeq = <T extends { seq: number }>(entry: T): Omit<T, "seq"> => {
  const { seq, ...rest } = entry;
  void seq;
  return rest;
};

const isLevel = (v: unknown): v is DevLevel => typeof v === "string" && v in PRIORITY;
const nowIso = (): string => new Date().toISOString();
const uid = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

type Patchable = ((...a: never[]) => unknown) & { [PATCHED]?: true };
type Ctx = () => { user?: { id: string; role: string } | null };

class DevLogger {
  private config: DevConfig =
    typeof __DEV_DIAG_CONFIG__ === "undefined" || !__DEV_DIAG_CONFIG__
      ? DEFAULT_CONFIG
      : __DEV_DIAG_CONFIG__;
  private explicit: DevLevel | undefined;
  private readonly sessionId = uid();
  private readonly noise: Array<DevLogEntry & { seq: number }> = [];
  private readonly important: Array<DevLogEntry & { seq: number }> = [];
  private readonly crumbs: Crumb[] = [];
  private readonly queue: DevLogEntry[] = [];
  private readonly seenErrors = new WeakSet<object>();
  private readonly perfSeen = new Map<string, { windowStart: number; count: number }>();
  private readonly recentApi = new Map<
    string,
    { entry: DevLogEntry; at: number; status: number }
  >();
  private readonly recentGets = new Map<string, number>();
  private readonly commits = new Map<string, number[]>();
  private seq = 0;
  private dropped = 0;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private emitting = false;
  private recording = false;
  private initialized = false;
  private disposers: Array<() => void> = [];
  private ctx: Ctx = () => ({});
  public routeRequests = 0;
  private realFetch: typeof fetch | undefined;
  private heapBaseline: { at: number; used: number } | undefined;

  /* ---------------------------------------------------------------- level */

  /** explicit setLevel > window.__DEV_DIAGNOSTICS_LEVEL__ > localStorage > config default */
  public getLevel(): DevLevel {
    if (this.explicit) return this.explicit;
    const flag = typeof window === "undefined" ? undefined : window.__DEV_DIAGNOSTICS_LEVEL__;
    if (isLevel(flag)) return flag;
    try {
      const stored = localStorage.getItem(LEVEL_KEY);
      if (isLevel(stored)) return stored;
    } catch {
      // storage blocked
    }
    return this.config.levels;
  }

  public setLevel(level: DevLevel): void {
    this.explicit = level;
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      // ignore
    }
  }

  /** Drops the explicit level so the window flag, localStorage and the default apply again. */
  public resetLevel(): void {
    this.explicit = undefined;
  }

  public isVerbose(): boolean {
    return this.getLevel() === "debug";
  }

  public setVerbose(enabled: boolean): void {
    this.setLevel(enabled ? "debug" : "warn");
  }

  public setContextProvider(provider: Ctx): void {
    this.ctx = provider;
  }

  /* -------------------------------------------------------------- public API */

  public debug(context: string, message: string, details?: unknown): void {
    this.log("debug", "log", context, message, undefined, details);
  }
  public info(context: string, message: string, details?: unknown): void {
    this.log("info", "log", context, message, undefined, details);
  }
  public warn(context: string, message: string, details?: unknown): void {
    this.addBreadcrumb("log", `warn ${context}: ${message}`);
    this.log("warn", "log", context, message, undefined, details);
  }
  /** (context, message, errorOrDetails, extra): same shape as the loggers this replaces. */
  public error(context: string, message: string, errorOrDetails?: unknown, extra?: unknown): void {
    const [err, details] =
      errorOrDetails instanceof Error ? [errorOrDetails, extra] : [extra, errorOrDetails];
    this.log("error", "error", context, message, err, details);
  }

  /**
   * One failed request is one entry, whichever of the fetch hook and this call sees it first: the second one merges
   * its facts (response body, request id, the caller's stack) into the first. Every non-2xx is an error.
   */
  public logApiError(
    method: string,
    path: string,
    status: number,
    error: unknown,
    details?: unknown,
  ): void {
    const key = `${method.toUpperCase()} ${path.split("?")[0]}`;
    const hit = this.recentApi.get(key);
    if (hit && hit.status === status && Date.now() - hit.at < 5000) {
      hit.entry.details = {
        ...(typeof hit.entry.details === "object" && hit.entry.details ? hit.entry.details : {}),
        enrichment: sanitizePayload(details),
      };
      if (!hit.entry.error) hit.entry.error = formatError(error);
      return;
    }
    const requestId = (error as { requestId?: unknown } | null)?.requestId;
    const entry = this.log(
      "error",
      "http",
      "API",
      `${method.toUpperCase()} ${path} failed with HTTP ${status}`,
      error,
      {
        method: method.toUpperCase(),
        path: sanitizeUrl(path),
        status,
        requestId: typeof requestId === "string" ? requestId : undefined,
        enrichment: details,
      },
    );
    if (entry) this.recentApi.set(key, { entry, at: Date.now(), status });
  }

  public logReactError(error: Error, info: { componentStack?: string | null }): void {
    this.error("ReactErrorBoundary", `Component render crash: ${error.message}`, error, {
      componentStack: info.componentStack,
    });
  }

  /** Spread into `createRoot(el, devLogger.reactRootErrorHandlers)`. */
  public readonly reactRootErrorHandlers = {
    onUncaughtError: (error: unknown, info: { componentStack?: string | null }): void =>
      this.error(
        "ReactUncaughtError",
        `Uncaught render error: ${formatError(error)?.message ?? "unknown"}`,
        error,
        { componentStack: info.componentStack },
      ),
    onCaughtError: (error: unknown, info: { componentStack?: string | null }): void => {
      if (error instanceof Error) this.logReactError(error, info);
      else
        this.error("ReactErrorBoundary", "Component render crash", error, {
          componentStack: info.componentStack,
        });
    },
    onRecoverableError: (error: unknown, info: { componentStack?: string | null }): void =>
      this.warn(
        "ReactRecoverableError",
        `React recovered from: ${formatError(error)?.message ?? "unknown"}`,
        { componentStack: info.componentStack },
      ),
  };

  /** `new QueryCache({ onError: devLogger.queryCacheOnError })`. */
  public readonly queryCacheOnError = (
    error: unknown,
    query: { queryKey: readonly unknown[] },
  ): void =>
    this.error("QueryCache", `Query failed: [${query.queryKey.map(String).join(" > ")}]`, error, {
      queryKey: query.queryKey,
    });

  /** `new MutationCache({ onError: devLogger.mutationCacheOnError })`. */
  public readonly mutationCacheOnError = (
    error: unknown,
    variables: unknown,
    _context: unknown,
    mutation: { options: { mutationKey?: readonly unknown[] } },
  ): void => {
    const key = mutation.options.mutationKey?.map(String).join(" > ") || "unnamed";
    this.error("MutationCache", `Mutation failed: [${key}]`, error, {
      mutationKey: mutation.options.mutationKey,
      variables,
    });
  };

  /** Called by DevProfiler for every commit. */
  public reportCommit(id: string, phase: string, actualMs: number): void {
    try {
      const t = this.config.thresholds;
      const now = Date.now();
      const list = (this.commits.get(id) ?? []).filter((x) => now - x < 5000);
      list.push(now);
      this.commits.set(id, list);
      if (actualMs > (t["slowCommitMs"] ?? 50)) {
        this.log(
          "warn",
          "perf:slow-commit",
          "React",
          `Slow commit in ${id} (${phase}): ${actualMs.toFixed(1)} ms`,
          undefined,
          { id, phase },
          actualMs,
        );
      }
      if (list.length > (t["excessiveCommitsPer5s"] ?? 20)) {
        // The Profiler counts a commit for ANY component below it, so this is the subtree, not just `id` itself.
        this.log(
          "warn",
          "perf:excessive-renders",
          "React",
          `More than ${t["excessiveCommitsPer5s"] ?? 20} commits under ${id} within 5 s`,
          undefined,
          {
            id,
            threshold: t["excessiveCommitsPer5s"] ?? 20,
            windowMs: 5000,
            counts: "every component under the Profiler",
          },
        );
        this.commits.set(id, []);
      }
    } catch {
      // never throw
    }
  }

  /** Lets an existing logger forward its entries when `captureGlobals` is false. */
  public ingest(
    level: Exclude<DevLevel, "silent">,
    context: string,
    message: string,
    error?: unknown,
    details?: unknown,
  ): void {
    this.log(level, "ingested", context, message, error, details);
  }

  public addBreadcrumb(type: Crumb["type"], message: string): void {
    if (!import.meta.env.DEV) return;
    try {
      this.crumbs.push({ ts: nowIso(), type, message: sanitizeString(message).slice(0, 200) });
      if (this.crumbs.length > MAX_CRUMBS) this.crumbs.shift();
    } catch {
      // ignore
    }
  }

  public getHistory(): readonly DevLogEntry[] {
    return [...this.noise, ...this.important].sort((a, b) => a.seq - b.seq).map(stripSeq);
  }

  public clearHistory(): void {
    this.noise.length = 0;
    this.important.length = 0;
    this.recentApi.clear();
    try {
      sessionStorage.removeItem(PERSIST_KEY);
    } catch {
      // ignore
    }
  }

  /* ---------------------------------------------------------------- record */

  private env(): Pick<
    DevLogEntry,
    "route" | "userAgent" | "viewport" | "online" | "build" | "user"
  > {
    let user: DevLogEntry["user"] = null;
    try {
      const u = this.ctx().user;
      user = u ? { id: u.id, role: u.role } : null;
    } catch {
      // ignore
    }
    return {
      route: routeOf(location.href),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      build: typeof __DEV_DIAG_BUILD__ === "string" ? __DEV_DIAG_BUILD__ : "dev",
      user,
    };
  }

  private log(
    level: Exclude<DevLevel, "silent">,
    kind: string,
    context: string,
    message: string,
    error?: unknown,
    details?: unknown,
    durationMs?: number,
    skipConsole = false,
  ): DevLogEntry | undefined {
    if (!import.meta.env.DEV) {
      // Production: warn/error still reach the console. No capture, buffering, breadcrumbs or transport.
      if (level === "warn" || level === "error") {
        console[level](
          `[${context}] ${sanitizeString(message)}`,
          error ?? sanitizePayload(details) ?? "",
        );
      }
      return undefined;
    }
    if (this.recording) return undefined;
    this.recording = true;
    try {
      const important = level === "warn" || level === "error";
      if (error instanceof Error) {
        if (this.seenErrors.has(error)) return undefined;
        if (important) this.seenErrors.add(error);
      }
      const formatted = formatError(error);
      const safeMsg = sanitizeString(message);
      const fingerprint = fingerprintOf("browser", context, safeMsg, formatted?.stack);
      const now = nowIso();
      if (kind.startsWith("perf:") && !this.perfAllowed(fingerprint)) return undefined;
      const last = this.important[this.important.length - 1];
      if (important && last && last.fingerprint === fingerprint && last.level === level) {
        last.count += 1;
        last.lastSeen = now;
        return last;
      }
      const entry: DevLogEntry & { seq: number } = {
        seq: ++this.seq,
        id: uid(),
        sessionId: this.sessionId,
        ts: now,
        level,
        layer: "browser",
        kind,
        context,
        message: safeMsg,
        fingerprint,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        ...(formatted ? { error: formatted } : {}),
        details: sanitizePayload(details),
        ...(durationMs === undefined ? {} : { durationMs: Math.round(durationMs) }),
        ...(kind.startsWith("perf:") ? { devMode: true } : {}),
        ...this.env(),
        ...(important ? { breadcrumbs: [...this.crumbs] } : {}),
      };
      const buf = important ? this.important : this.noise;
      buf.push(entry);
      if (buf.length > (important ? MAX_IMPORTANT : MAX_NOISE)) buf.shift();
      if (important || kind.startsWith("perf:") || kind === "auth-refresh") this.enqueue(entry);
      if (level === "error") this.persist();
      if (!skipConsole) this.print(level, entry);
      return entry;
    } catch {
      return undefined;
    } finally {
      this.recording = false;
    }
  }

  private print(level: Exclude<DevLevel, "silent">, entry: DevLogEntry): void {
    if (PRIORITY[level] < PRIORITY[this.getLevel()] || entry.count > 1) return;
    this.emitting = true;
    try {
      console[level](
        `%c[DEV:${level.toUpperCase()}]%c [${entry.context}] ${entry.message}`,
        `${BADGE[level]};border-radius:4px;padding:1px 5px;font-weight:700`,
        "color:inherit",
        entry.details ?? "",
      );
    } catch {
      // ignore
    } finally {
      this.emitting = false;
    }
  }

  /* ------------------------------------------------------------- transport */

  private enqueue(entry: DevLogEntry): void {
    this.queue.push(entry);
    if (this.queue.length >= 20) this.flush();
    else this.flushTimer ??= setTimeout(() => this.flush(), 500);
  }

  /** Per-fingerprint budget for perf entries, so one hot path cannot flood the file. */
  private perfAllowed(fingerprint: string): boolean {
    const limit = this.config.perfRateLimit ?? { perFingerprint: 6, windowMs: 60_000 };
    const now = Date.now();
    const seen = this.perfSeen.get(fingerprint);
    if (!seen || now - seen.windowStart > limit.windowMs) {
      this.perfSeen.set(fingerprint, { windowStart: now, count: 1 });
      return true;
    }
    seen.count += 1;
    return seen.count <= limit.perFingerprint;
  }

  public flush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (this.queue.length === 0) return;
    const entries = this.queue.splice(0, 50);
    const body = JSON.stringify({ sessionId: this.sessionId, dropped: this.dropped, entries });
    try {
      if (
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon(SINK, new Blob([body], { type: "application/json" }))
      ) {
        this.dropped = 0;
      } else {
        void (this.realFetch ?? fetch)(SINK, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body,
        })
          .then((r) => {
            if (r.ok) this.dropped = 0;
            else this.dropped += entries.length;
          })
          .catch(() => {
            this.dropped += entries.length;
          });
      }
    } catch {
      this.dropped += entries.length;
    }
    if (this.queue.length > 0) this.flushTimer = setTimeout(() => this.flush(), 0);
  }

  private persist(): void {
    try {
      let errors = this.important
        .filter((e) => e.level === "error")
        .slice(-30)
        .map(stripSeq);
      let json = JSON.stringify(errors);
      while (json.length > 150_000 && errors.length > 1) {
        errors = errors.slice(1);
        json = JSON.stringify(errors);
      }
      sessionStorage.setItem(PERSIST_KEY, json);
    } catch {
      // full or blocked
    }
  }

  private rehydrate(): void {
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(PERSIST_KEY) ?? "[]");
      if (!Array.isArray(parsed)) return;
      const have = new Set(this.important.map((e) => e.id));
      const restored = (parsed as DevLogEntry[])
        .filter(
          (e) => e && typeof e.id === "string" && !have.has(e.id) && typeof e.message === "string",
        )
        .map((e, i) => ({ ...e, seq: i - parsed.length }));
      this.important.unshift(...restored);
    } catch {
      // corrupted payload
    }
  }

  /* ---------------------------------------------------------------- report */

  public exportReport(options: { format?: "json" | "markdown" } = {}): string {
    const entries = this.getHistory()
      .filter((e) => e.level === "warn" || e.level === "error")
      .reverse();
    const env = { sessionId: this.sessionId, ...this.env() };
    if (options.format !== "markdown")
      return JSON.stringify({ environment: env, entries }, null, 2);
    const out = [
      "# Browser diagnostics report",
      "",
      `- Route: ${env.route}`,
      `- Build: ${env.build}`,
      `- Viewport: ${env.viewport}`,
      `- Session: ${env.sessionId}`,
      "",
    ];
    entries.forEach((e, i) => {
      out.push(
        `## ${i + 1}. [${e.level.toUpperCase()}] ${e.context}: ${e.message}`,
        `- Count: ${e.count} (last ${e.lastSeen})`,
      );
      const frames = (e.error?.stack ?? "")
        .split("\n")
        .filter((l) => /^\s*at\s/.test(l))
        .slice(0, 10);
      if (frames.length) out.push("```", ...frames.map((f) => f.trim()), "```");
      if (e.breadcrumbs?.length)
        out.push(
          "Repro trail:",
          ...e.breadcrumbs.map((b, n) => `${n + 1}. [${b.type}] ${b.message}`),
        );
      out.push("");
    });
    return out.join("\n");
  }

  public async copyReport(): Promise<boolean> {
    const text = this.exportReport({ format: "markdown" });
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;top:-1000px;opacity:0;";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  public downloadReport(): void {
    try {
      const url = URL.createObjectURL(
        new Blob([this.exportReport()], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `dev-error-report-${nowIso().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // ignore
    }
  }

  /* ------------------------------------------------------------------ init */

  /**
   * Idempotent. `captureGlobals: false` skips the window/console/fetch hooks (use it only when an existing
   * logger already installs them and forwards to `ingest`).
   */
  public init(options: { captureGlobals?: boolean } = {}): void {
    if (!import.meta.env.DEV || this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.realFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : undefined;
    this.rehydrate();
    this.log(
      "info",
      "init",
      "DevDiagnostics",
      "browser diagnostics active (__DEV_DIAGNOSTICS__)",
      undefined,
      {
        sources:
          options.captureGlobals === false
            ? ["react", "query"]
            : [
                "window.error",
                "unhandledrejection",
                "csp",
                "console",
                "fetch",
                "xhr",
                "perf-observers",
                "react",
                "query",
              ],
      },
      undefined,
      true,
    );
    if (options.captureGlobals !== false) this.installCapture();
    window.exportDevErrorReport = (o) => this.exportReport(o);
    window.copyDevErrorReport = () => this.copyReport();
    window.downloadDevErrorReport = () => this.downloadReport();
    this.disposers.push(() => {
      delete window.exportDevErrorReport;
      delete window.copyDevErrorReport;
      delete window.downloadDevErrorReport;
    });
  }

  /** Restores every patched global (HMR, tests). */
  public dispose(): void {
    this.flush();
    for (const d of this.disposers.splice(0).reverse()) {
      try {
        d();
      } catch {
        // ignore
      }
    }
    this.initialized = false;
  }

  private on<K extends keyof WindowEventMap>(
    type: K,
    handler: (e: WindowEventMap[K]) => void,
    capture = false,
  ): void {
    const safe = (e: WindowEventMap[K]): void => {
      try {
        handler(e);
      } catch {
        // a logging failure must never surface
      }
    };
    window.addEventListener(type, safe as EventListener, capture);
    this.disposers.push(() => window.removeEventListener(type, safe as EventListener, capture));
  }

  private installCapture(): void {
    const t = this.config.thresholds;

    // Capture phase: failed img/script/link loads do not bubble to window.
    this.on(
      "error",
      (event) => {
        const target = event.target;
        if (target && target !== window && target instanceof Element) {
          const el = target as Element & { src?: string; href?: string; currentSrc?: string };
          const url = sanitizeUrl(el.currentSrc || el.src || el.href || "");
          this.log(
            "error",
            "resource",
            "ResourceError",
            `Failed to load <${el.tagName.toLowerCase()}>: ${url}`,
            undefined,
            { tag: el.tagName.toLowerCase(), url },
          );
          return;
        }
        this.log(
          "error",
          "error",
          "WindowError",
          `Uncaught error: ${event.message || "Script error"}`,
          event.error ?? new Error(event.message || "Script error"),
          {
            filename: sanitizeUrl(event.filename || ""),
            lineno: event.lineno,
            colno: event.colno,
          },
        );
      },
      true,
    );
    this.on("unhandledrejection", (event) => {
      const reason: unknown = event.reason;
      const f = formatError(reason);
      this.log(
        "error",
        "rejection",
        "UnhandledPromise",
        `Unhandled Promise Rejection: ${f?.message ?? "unknown"}`,
        reason instanceof Error ? reason : new Error(f?.message ?? "rejection"),
        { rawReason: sanitizePayload(reason) },
      );
    });
    this.on("rejectionhandled", () =>
      this.addBreadcrumb("log", "A previously unhandled rejection was handled late"),
    );
    this.on("securitypolicyviolation", (e) =>
      this.log(
        "error",
        "csp",
        "CSP",
        `CSP violation: ${e.effectiveDirective} blocked ${sanitizeUrl(e.blockedURI)}`,
        undefined,
        {
          violatedDirective: e.violatedDirective,
          blockedURI: sanitizeUrl(e.blockedURI),
          sourceFile: sanitizeUrl(e.sourceFile),
          lineNumber: e.lineNumber,
        },
      ),
    );
    this.on("pagehide", () => this.flush());
    this.on("popstate", () => {
      this.routeRequests = 0;
      this.addBreadcrumb("route", routeOf(location.href));
    });
    this.on(
      "click",
      (e) => {
        const el = (e.target as Element | null)?.closest?.("[data-testid],[role],[aria-label]");
        const id =
          el?.getAttribute("data-testid") ??
          el?.getAttribute("aria-label") ??
          el?.getAttribute("role");
        if (el && id)
          this.addBreadcrumb(
            "click",
            `${el.tagName.toLowerCase()}[${sanitizeString(id).slice(0, 80)}]`,
          );
      },
      true,
    );
    const onVis = (): void => {
      if (document.visibilityState === "hidden") this.flush();
    };
    document.addEventListener("visibilitychange", onVis);
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVis));

    for (const m of ["pushState", "replaceState"] as const) {
      const original = Reflect.get(history, m) as History["pushState"];
      if ((original as Patchable)[PATCHED]) continue;
      const wrapped = (...args: Parameters<History["pushState"]>): void => {
        original.apply(history, args);
        try {
          this.routeRequests = 0;
          this.addBreadcrumb("route", routeOf(location.href));
        } catch {
          // ignore
        }
      };
      (wrapped as Patchable)[PATCHED] = true;
      history[m] = wrapped;
      this.disposers.push(() => {
        if (Reflect.get(history, m) === wrapped) history[m] = original;
      });
    }

    // console.error / console.warn: call the original first, ignore our own output.
    for (const m of ["error", "warn"] as const) {
      const original = Reflect.get(console, m) as typeof console.error;
      if ((original as Patchable)[PATCHED]) continue;
      const wrapped = (...args: unknown[]): void => {
        original.apply(console, args);
        try {
          if (this.emitting || this.recording) return;
          const first = args[0];
          const message = sanitizeString(
            typeof first === "string"
              ? first.replace(/%[sdifoOjc]/g, "").trim() || args.slice(1).map(String).join(" ")
              : args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "),
          );
          this.addBreadcrumb("console", `console.${m}: ${message.slice(0, 120)}`);
          this.log(
            m,
            "console",
            "console",
            message,
            args.find((a): a is Error => a instanceof Error),
            undefined,
            undefined,
            true,
          );
        } catch {
          // ignore
        }
      };
      (wrapped as Patchable)[PATCHED] = true;
      console[m] = wrapped;
      this.disposers.push(() => {
        if (Reflect.get(console, m) === wrapped) console[m] = original;
      });
    }

    // fetch
    const currentFetch = Reflect.get(window, "fetch") as typeof fetch | undefined;
    if (typeof currentFetch === "function" && !(currentFetch as Patchable)[PATCHED]) {
      const originalFetch = currentFetch;
      const wrapped = async (
        input: globalThis.RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const raw =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (raw.includes(SINK)) return originalFetch.call(window, input, init);
        const method = (
          init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")
        ).toUpperCase();
        const path = sanitizeUrl(raw);
        const started = performance.now();
        this.routeRequests += 1;
        if (this.routeRequests === (t["requestsPerRouteLoad"] ?? 30) + 1) {
          this.log(
            "warn",
            "perf:request-burst",
            "Network",
            `More than ${t["requestsPerRouteLoad"] ?? 30} requests during one route load`,
            undefined,
            { route: routeOf(location.href) },
          );
        }
        if (method === "GET") {
          const last = this.recentGets.get(path);
          if (last !== undefined && started - last < (t["duplicateGetWindowMs"] ?? 500)) {
            this.log(
              "warn",
              "perf:duplicate-get",
              "Network",
              `Duplicate GET ${path} within ${t["duplicateGetWindowMs"] ?? 500} ms`,
              undefined,
              { path },
            );
          }
          this.recentGets.set(path, started);
          if (this.recentGets.size > 200)
            this.recentGets.delete(this.recentGets.keys().next().value as string);
        }
        try {
          const res = await originalFetch.call(window, input, init);
          const ms = performance.now() - started;
          this.addBreadcrumb("fetch", `${method} ${path} -> ${res.status}`);
          const size = Number(res.headers.get("content-length") ?? 0);
          const requestId = res.headers.get("x-request-id") ?? undefined;
          const facts = {
            method,
            path,
            status: res.status,
            requestId,
            responseBytes: size || undefined,
          };
          // A successful refresh is what turns an earlier 401 into an expected, recovered step (the digest reads this).
          if (res.ok && method === "POST" && path.endsWith("/api/auth/refresh"))
            this.log(
              "info",
              "auth-refresh",
              "Auth",
              "Session refreshed",
              undefined,
              { status: res.status, requestId },
              ms,
            );
          if (!res.ok) {
            // 4xx and 5xx: keep the sanitized response body (validation issues included) and the request's key
            // names. Successful responses never get a body. The entry is written once the body has been read.
            const message = `${method} ${path} failed with HTTP ${res.status}`;
            const key = `${method} ${path.split("?")[0]}`;
            // A 401 is followed by a refresh and a replay of the same GET: that replay is not a duplicate request.
            if (res.status === 401) this.recentGets.delete(path);
            const requestKeys = requestBodyKeys(init?.body);
            let written = false;
            const write = (responseBody?: unknown): void => {
              if (written) return;
              written = true;
              const merged = { ...facts, requestBodyKeys: requestKeys, responseBody };
              const hit = this.recentApi.get(key);
              if (hit && hit.status === res.status && Date.now() - hit.at < 5000) {
                // logApiError got here first: add what only the hook knows to that entry.
                hit.entry.details = {
                  ...(typeof hit.entry.details === "object" && hit.entry.details
                    ? hit.entry.details
                    : {}),
                  ...merged,
                };
                hit.entry.durationMs ??= Math.round(ms);
                return;
              }
              const entry = this.log("error", "http", "API", message, undefined, merged, ms);
              if (entry) this.recentApi.set(key, { entry, at: Date.now(), status: res.status });
            };
            const timer = setTimeout(() => write(), 2000);
            void res
              .clone()
              .text()
              .then(
                (text) => write(readBody(text)),
                () => write(),
              )
              .finally(() => clearTimeout(timer));
          } else if (ms > (t["slowFetchMs"] ?? 1000)) {
            this.log(
              "warn",
              "perf:slow-fetch",
              "Network",
              `Slow fetch ${method} ${path}: ${Math.round(ms)} ms`,
              undefined,
              facts,
              ms,
            );
          }
          if (size > (t["payloadBytes"] ?? 512000)) {
            this.log(
              "warn",
              "perf:large-payload",
              "Network",
              `Large response ${method} ${path}: ${size} bytes`,
              undefined,
              facts,
              ms,
            );
          }
          return res;
        } catch (err) {
          const aborted = err instanceof DOMException && err.name === "AbortError";
          this.addBreadcrumb(
            "fetch",
            `${method} ${path} -> ${aborted ? "aborted" : "network error"}`,
          );
          if (!aborted)
            this.log(
              "error",
              "http",
              "API",
              `${method} ${path} failed: no response (network error)`,
              err,
              { method, path },
              performance.now() - started,
            );
          throw err;
        }
      };
      (wrapped as unknown as Patchable)[PATCHED] = true;
      window.fetch = wrapped;
      this.disposers.push(() => {
        if (Reflect.get(window, "fetch") === wrapped) window.fetch = originalFetch;
      });
    }

    // XMLHttpRequest
    if (
      typeof XMLHttpRequest !== "undefined" &&
      !(Reflect.get(XMLHttpRequest.prototype, "open") as Patchable)[PATCHED]
    ) {
      const proto = XMLHttpRequest.prototype;
      const open: XMLHttpRequest["open"] = Reflect.get(proto, "open");
      const send: XMLHttpRequest["send"] = Reflect.get(proto, "send");
      const meta = new WeakMap<
        XMLHttpRequest,
        { method: string; path: string; raw: string; keys?: unknown }
      >();
      const crumb = (message: string): void => this.addBreadcrumb("fetch", message);
      const record = (
        level: Exclude<DevLevel, "silent">,
        kind: string,
        message: string,
        details: unknown,
        durationMs: number,
      ): void => {
        this.log(level, kind, "Network", message, undefined, details, durationMs);
      };
      const wOpen = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: unknown[]
      ): void {
        try {
          meta.set(this, {
            method: method.toUpperCase(),
            path: sanitizeUrl(String(url)),
            raw: String(url),
          });
        } catch {
          // ignore
        }
        (open as (...a: unknown[]) => void).call(this, method, url, ...rest);
      };
      const wSend = function (
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null,
      ): void {
        try {
          const m = meta.get(this);
          if (m && !m.raw.includes(SINK)) {
            m.keys = requestBodyKeys(body);
            const started = performance.now();
            this.addEventListener("loadend", () => {
              try {
                const ms = performance.now() - started;
                crumb(`${m.method} ${m.path} -> ${this.status || "network error"}`);
                const failed = this.status === 0 || this.status >= 400;
                const responseBody =
                  failed && (this.responseType === "" || this.responseType === "text")
                    ? readBody(this.responseText)
                    : undefined;
                const facts = {
                  method: m.method,
                  path: m.path,
                  status: this.status || undefined,
                  requestId: this.getResponseHeader("x-request-id") ?? undefined,
                  ...(failed ? { requestBodyKeys: m.keys, responseBody } : {}),
                };
                if (this.status > 0 && this.status < 400) {
                  if (ms > (t["slowFetchMs"] ?? 1000))
                    record(
                      "warn",
                      "perf:slow-fetch",
                      `Slow XHR ${m.method} ${m.path}: ${Math.round(ms)} ms`,
                      facts,
                      ms,
                    );
                  return;
                }
                const failure = this.status
                  ? `${m.method} ${m.path} failed with HTTP ${this.status}`
                  : `${m.method} ${m.path} failed: no response (network error)`;
                record(
                  this.status >= 400 && this.status < 500 ? "warn" : "error",
                  "http",
                  failure,
                  facts,
                  ms,
                );
              } catch {
                // ignore
              }
            });
          }
        } catch {
          // ignore
        }
        send.call(this, body);
      };
      (wOpen as Patchable)[PATCHED] = true;
      proto.open = wOpen;
      proto.send = wSend;
      this.disposers.push(() => {
        if (Reflect.get(proto, "open") === wOpen) proto.open = open;
        if (Reflect.get(proto, "send") === wSend) proto.send = send;
      });
    }

    // Performance observers: long tasks, LCP, layout shift, INP.
    if (typeof PerformanceObserver !== "undefined") {
      const observe = (type: string, handle: (entry: PerformanceEntry) => void): void => {
        try {
          const po = new PerformanceObserver((list) =>
            list.getEntries().forEach((e) => {
              try {
                handle(e);
              } catch {
                /* ignore */
              }
            }),
          );
          po.observe({
            type,
            buffered: true,
            ...(type === "event" ? { durationThreshold: 200 } : {}),
          });
          this.disposers.push(() => po.disconnect());
        } catch {
          // entry type unsupported
        }
      };
      observe("longtask", (e) => {
        if (e.duration > (t["longTaskMs"] ?? 100))
          this.log(
            "warn",
            "perf:long-task",
            "Performance",
            `Long task: ${Math.round(e.duration)} ms`,
            undefined,
            { startTime: Math.round(e.startTime) },
            e.duration,
          );
      });
      observe("largest-contentful-paint", (e) => {
        if (e.startTime > 4000)
          this.log(
            "warn",
            "perf:lcp",
            "Performance",
            `Slow LCP: ${Math.round(e.startTime)} ms`,
            undefined,
            undefined,
            e.startTime,
          );
      });
      observe("layout-shift", (e) => {
        const shift = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if ((shift.value ?? 0) > 0.1 && !shift.hadRecentInput)
          this.log(
            "warn",
            "perf:layout-shift",
            "Performance",
            `Layout shift ${(shift.value ?? 0).toFixed(3)}`,
            undefined,
            { value: shift.value },
          );
      });
      // One user action fires several events (pointerover, mouseover, mouseenter...) with the same duration:
      // events within 50 ms of each other, with durations within 50 ms, become one entry listing the names.
      let pending:
        | {
            names: string[];
            duration: number;
            startTime: number;
            timer: ReturnType<typeof setTimeout>;
          }
        | undefined;
      const flushInteraction = (): void => {
        if (!pending) return;
        const { names, duration } = pending;
        clearTimeout(pending.timer);
        pending = undefined;
        this.log(
          "warn",
          "perf:slow-interaction",
          "Performance",
          `Slow interaction (${names.join(", ")}): ${Math.round(duration)} ms`,
          undefined,
          { names },
          duration,
        );
      };
      this.disposers.push(flushInteraction);
      observe("event", (e) => {
        if (e.duration < 200) return;
        if (
          pending &&
          Math.abs(pending.duration - e.duration) <= 50 &&
          Math.abs(pending.startTime - e.startTime) <= 50
        ) {
          if (!pending.names.includes(e.name)) pending.names.push(e.name);
          pending.duration = Math.max(pending.duration, e.duration);
          return;
        }
        flushInteraction();
        pending = {
          names: [e.name],
          duration: e.duration,
          startTime: e.startTime,
          timer: setTimeout(flushInteraction, 100),
        };
      });
    }

    // Heap growth where performance.memory exists.
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    if (mem) {
      const timer = setInterval(() => {
        const used = mem.usedJSHeapSize;
        const base = this.heapBaseline;
        if (!base || Date.now() - base.at > 60_000) {
          this.heapBaseline = { at: Date.now(), used };
        } else if ((used - base.used) / 1048576 > (t["heapGrowthMb"] ?? 50)) {
          this.log(
            "warn",
            "perf:heap-growth",
            "Performance",
            `JS heap grew ${Math.round((used - base.used) / 1048576)} MB in under 60 s`,
          );
          this.heapBaseline = { at: Date.now(), used };
        }
      }, 10_000);
      this.disposers.push(() => clearInterval(timer));
    }
  }
}

export const devLogger = new DevLogger();
/** Drop-in name for call sites that used `logger`. */
export const logger = devLogger;
export const reactRootErrorHandlers = devLogger.reactRootErrorHandlers;

export function initDevDiagnostics(options: { captureGlobals?: boolean } = {}): void {
  if (import.meta.env.DEV) devLogger.init(options);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => devLogger.dispose());
}

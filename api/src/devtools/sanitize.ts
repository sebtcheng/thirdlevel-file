/**
 * Shared redaction for browser and Node code. Pure, dependency-free, never throws.
 * Dev-diagnostics only: see .claude/skills/dev-diagnostics-logger/rules.md.
 */

const MAX_DEPTH = 5;
const MAX_STRING = 2048;
const MAX_ARRAY = 50;
const MAX_KEYS = 100;
const MAX_CAUSE_DEPTH = 3;

/** Bare `key` is deliberately absent: it would hide queryKey, sortKey, primaryKey. */
export const SENSITIVE_KEY_REGEX =
  /(?:password|passwd|passcode|secret|token|authorization|set-cookie|cookie|bearer|session|jwt|csrf|otp|ssn|api[_-]?key|access[_-]?key|private[_-]?key)/i;

const SECRET_PARAM =
  "(?:[\\w.-]*(?:password|passwd|passcode|secret|token|session|jwt|csrf|otp|ssn|api[_-]?key|apikey|access[_-]?key|private[_-]?key)[\\w.-]*)";
const QUERY_SECRET_REGEX = new RegExp(`([?&;\\s"'](?:${SECRET_PARAM})=)[^&#\\s"']*`, "gi");
const BEARER_REGEX = /\bBearer\s+[^\s"',;]+/gi;
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const KEY_VALUE_REGEX =
  /((?:password|passwd|passcode|secret|token|session|jwt|csrf|otp|ssn|api[_-]?key|apikey|access[_-]?key|private[_-]?key|authorization|cookie)["']?\s*[:=]\s*["']?)(?!\[REDACTED)([^"'\s,&;}]+)/gi;
const LONG_HEX_REGEX = /\b[a-f0-9]{33,}\b/gi;
// UUIDs (ids, request ids) are 36 base64url-looking characters; they are not secrets.
// Plain base64 characters only: a string with slashes or hyphens (a URL path, a UUID, a slug) is never one token.
const LONG_BASE64_REGEX = /\b(?=[A-Za-z0-9+]*\d)(?=[A-Za-z0-9+]*[A-Za-z])[A-Za-z0-9+]{33,}={0,2}/g;

/** Fields that hold a location, not a credential: the long-string rules are skipped for them. */
const LOCATION_KEY_REGEX =
  /^(?:path|pathname|url|uri|href|src|route|endpoint|filename|sourceFile|blockedURI)$/i;

/** Secret values known to the Node side (loaded from .env into memory only; never logged, never written). */
let runtimeSecrets: string[] = [];

export function setRuntimeSecrets(values: readonly string[]): void {
  runtimeSecrets = values.filter((v) => v.length >= 8).sort((a, b) => b.length - a.length);
}

export interface FormattedError {
  name: string;
  message: string;
  stack?: string;
  cause?: FormattedError | string;
  errors?: FormattedError[];
}

const truncate = (value: string, max = MAX_STRING): string =>
  value.length > max ? `${value.slice(0, max)}…[truncated ${value.length - max} chars]` : value;

function safeString(value: unknown): string {
  try {
    return truncate(String(value));
  } catch {
    return "[UNPRINTABLE]";
  }
}

/** Redacts secrets inside free text (messages, stacks, URLs) and caps the length. */
export function sanitizeString(value: string, isLocation = false): string {
  try {
    // Cap first so a multi-megabyte string never reaches the regexes.
    let out = value.length > MAX_STRING * 4 ? value.slice(0, MAX_STRING * 4) : value;
    for (const secret of runtimeSecrets) {
      if (out.includes(secret)) out = out.split(secret).join("[REDACTED_ENV]");
    }
    out = out
      .replace(BEARER_REGEX, "Bearer [REDACTED]")
      .replace(JWT_REGEX, "[REDACTED_JWT]")
      .replace(QUERY_SECRET_REGEX, "$1[REDACTED]")
      .replace(KEY_VALUE_REGEX, "$1[REDACTED]");
    // Credentials in a location are still caught above (bearer, JWT, ?token=); only the opaque-blob rules are skipped.
    if (!isLocation)
      out = out
        .replace(LONG_HEX_REGEX, "[REDACTED_HEX]")
        .replace(LONG_BASE64_REGEX, "[REDACTED_SECRET]");
    return truncate(out.length < value.length && value.length > MAX_STRING * 4 ? `${out}…` : out);
  } catch {
    return "[UNSANITIZABLE_STRING]";
  }
}

/** `location.href` in a browser, a placeholder elsewhere. Typed through globalThis so Node-only tsconfigs (no DOM lib) compile. */
function baseHref(): string {
  return (globalThis as { location?: { href?: string } }).location?.href ?? "http://localhost";
}

/** Path plus query with secret values redacted; the hash is dropped. */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw, baseHref());
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_KEY_REGEX.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    url.hash = "";
    const out = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? url.toString() : `${url.pathname}${url.search}`;
    return sanitizeString(out.replace(/%5BREDACTED%5D/g, "[REDACTED]"), true);
  } catch {
    return sanitizeString(raw);
  }
}

/** Route for display: URL without any query values. */
export function routeOf(raw: string): string {
  try {
    const url = new URL(raw, baseHref());
    const keys = [...url.searchParams.keys()];
    return `${url.pathname}${keys.length ? `?${keys.join("&")}` : ""}`;
  } catch {
    return sanitizeString(raw);
  }
}

/** Never throws. Preserves `cause` (depth limited) and AggregateError members. */
export function formatError(
  err: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): FormattedError | undefined {
  if (err === undefined || err === null || err === "") return undefined;
  try {
    if (err instanceof Error) {
      if (seen.has(err)) return { name: err.name, message: "[CIRCULAR]" };
      seen.add(err);
      const out: FormattedError = { name: err.name, message: sanitizeString(err.message) };
      if (err.stack) out.stack = sanitizeString(err.stack);
      const cause = (err as Error & { cause?: unknown }).cause;
      if (cause !== undefined) {
        out.cause =
          depth >= MAX_CAUSE_DEPTH
            ? "[MAX_CAUSE_DEPTH]"
            : (formatError(cause, depth + 1, seen) ?? safeString(cause));
      }
      if (
        typeof AggregateError !== "undefined" &&
        err instanceof AggregateError &&
        depth < MAX_CAUSE_DEPTH
      ) {
        out.errors = (err.errors as unknown[])
          .slice(0, 10)
          .map((e) => formatError(e, depth + 1, seen))
          .filter((e): e is FormattedError => e !== undefined);
      }
      return out;
    }
    if (typeof DOMException !== "undefined" && err instanceof DOMException) {
      return { name: err.name, message: sanitizeString(err.message) };
    }
    if (typeof err === "string") return { name: "string", message: sanitizeString(err) };
    let message: string;
    try {
      message = JSON.stringify(sanitizePayload(err)) ?? safeString(err);
    } catch {
      message = safeString(err);
    }
    return { name: typeof err, message: truncate(message) };
  } catch {
    return { name: "unknown", message: safeString(err) };
  }
}

/** Redacts secrets and bounds size. Handles cycles and the built-in types listed in the skill spec. Never throws. */
export function sanitizePayload(
  payload: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  try {
    return walk(payload, depth, seen);
  } catch {
    return safeString(payload);
  }
}

function walk(payload: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (payload === null || payload === undefined) return payload;
  switch (typeof payload) {
    case "string":
      return sanitizeString(payload);
    case "number":
    case "boolean":
      return payload;
    case "bigint":
      return `${payload}n`;
    case "symbol":
    case "function":
      return `[${typeof payload}]`;
    default:
      break;
  }
  const obj = payload as object;
  if (depth > MAX_DEPTH) return "[MAX_DEPTH_REACHED]";
  if (seen.has(obj)) return "[CIRCULAR]";
  seen.add(obj);

  if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
  if (
    obj instanceof Error ||
    (typeof DOMException !== "undefined" && obj instanceof DOMException)
  ) {
    // `seen` already holds this object; formatError tracks its own cycle guard for the cause chain.
    return formatError(obj);
  }
  if (typeof URL !== "undefined" && obj instanceof URL) return sanitizeUrl(obj.href);
  if (typeof Headers !== "undefined" && obj instanceof Headers) {
    const out: Record<string, string> = {};
    obj.forEach((value, key) => {
      out[key] = SENSITIVE_KEY_REGEX.test(key) ? "[REDACTED]" : sanitizeString(value);
    });
    return out;
  }
  if (typeof Response !== "undefined" && obj instanceof Response) {
    return {
      type: "Response",
      status: obj.status,
      statusText: obj.statusText,
      url: sanitizeUrl(obj.url),
    };
  }
  if (typeof Request !== "undefined" && obj instanceof Request) {
    return { type: "Request", method: obj.method, url: sanitizeUrl(obj.url) };
  }
  if (typeof Event !== "undefined" && obj instanceof Event) {
    // Only the type and target tag: never a form control's value.
    return {
      type: obj.type,
      target: (obj.target as { tagName?: string } | null)?.tagName?.toLowerCase(),
    };
  }
  if (obj instanceof Map) {
    return {
      type: "Map",
      size: obj.size,
      entries: [...obj.entries()]
        .slice(0, MAX_ARRAY)
        .map(([k, v]) => [walk(k, depth + 1, seen), walk(v, depth + 1, seen)]),
    };
  }
  if (obj instanceof Set) {
    return {
      type: "Set",
      size: obj.size,
      values: [...obj].slice(0, MAX_ARRAY).map((v) => walk(v, depth + 1, seen)),
    };
  }
  if (Array.isArray(obj)) {
    const items = obj.slice(0, MAX_ARRAY).map((item) => walk(item, depth + 1, seen));
    if (obj.length > MAX_ARRAY) items.push(`[${obj.length - MAX_ARRAY} more items]`);
    return items;
  }
  const withToJson = obj as { toJSON?: unknown };
  if (typeof withToJson.toJSON === "function") {
    try {
      return walk((withToJson.toJSON as () => unknown).call(obj), depth + 1, seen);
    } catch {
      // fall through to the plain-object walk
    }
  }

  const out: Record<string, unknown> = {};
  const keys = Object.keys(obj);
  for (const key of keys.slice(0, MAX_KEYS)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    try {
      const value = (obj as Record<string, unknown>)[key];
      out[key] =
        typeof value === "string" && LOCATION_KEY_REGEX.test(key)
          ? sanitizeString(value, true)
          : walk(value, depth + 1, seen);
    } catch {
      out[key] = "[UNREADABLE]";
    }
  }
  if (keys.length > MAX_KEYS) out["…"] = `[${keys.length - MAX_KEYS} more keys]`;
  return out;
}

/** FNV-1a 32-bit, hex. Same function in browser and Node so fingerprints agree. */
export function hash32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const normalize = (text: string): string =>
  text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "U")
    .replace(/\d+/g, "N")
    .slice(0, 300);

/** Fingerprint = hash(layer | context | normalized message | top 3 stack frames). */
export function fingerprintOf(
  layer: string,
  context: string,
  message: string,
  stack?: string,
): string {
  const frames = (stack ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^at\s/.test(l) || l.includes("@"))
    .slice(0, 3)
    .map((l) => l.replace(/:\d+:\d+\)?$/, ""));
  return hash32([layer, context, normalize(message), ...frames].join("|"));
}

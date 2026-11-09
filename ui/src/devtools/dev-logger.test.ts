import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { devLogger, initDevDiagnostics } from "./dev-logger";
import { sanitizePayload, sanitizeString, sanitizeUrl } from "./sanitize";

const JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function createMockStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

class MockEventTarget {
  private listeners: Record<string, ((e: unknown) => void)[]> = {};
  addEventListener(type: string, listener: (e: unknown) => void) {
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type]?.push(listener);
  }
  removeEventListener(type: string, listener: (e: unknown) => void) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type]?.filter((l) => l !== listener);
  }
  dispatchEvent(e: { type: string }): boolean {
    const list = this.listeners[e.type] ?? [];
    for (const l of list) l(e);
    return true;
  }
}

const mockWindow = Object.assign(new MockEventTarget(), {
  location: { pathname: "/", href: "http://localhost/" },
  innerWidth: 1280,
  innerHeight: 800,
  navigator: { userAgent: "test", onLine: true },
  fetch: globalThis.fetch,
  __DEV_DIAGNOSTICS_LEVEL__: undefined as string | undefined,
});

if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", { value: mockWindow, writable: true, configurable: true });
} else {
  Object.assign(globalThis.window, {
    innerWidth: 1280,
    innerHeight: 800,
  });
}

if (typeof (globalThis as unknown as { location?: unknown }).location === "undefined") {
  Object.defineProperty(globalThis, "location", {
    value: { pathname: "/", href: "http://localhost/" },
    writable: true,
    configurable: true,
  });
}

if (typeof (globalThis as unknown as { navigator?: unknown }).navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "test", onLine: true },
    writable: true,
    configurable: true,
  });
}

if (typeof (globalThis as unknown as { history?: unknown }).history === "undefined") {
  Object.defineProperty(globalThis, "history", {
    value: { pushState: () => {}, replaceState: () => {} },
    writable: true,
    configurable: true,
  });
}

class MockElement extends MockEventTarget {
  public tagName: string;
  public src = "";
  public href = "";
  constructor(tag: string) {
    super();
    this.tagName = tag.toUpperCase();
  }
  remove() {}
  override dispatchEvent(e: { type: string; target?: unknown }): boolean {
    Object.defineProperty(e, "target", { value: this, configurable: true });
    super.dispatchEvent(e);
    mockWindow.dispatchEvent(e);
    return true;
  }
}

if (typeof globalThis.Element === "undefined") {
  Object.defineProperty(globalThis, "Element", { value: MockElement, writable: true, configurable: true });
}

const mockDoc = Object.assign(new MockEventTarget(), {
  body: Object.assign(new MockEventTarget(), {
    appendChild: (el: unknown) => el,
  }),
  createElement: (tag: string) => new MockElement(tag),
});
if (typeof globalThis.document === "undefined") {
  Object.defineProperty(globalThis, "document", { value: mockDoc, writable: true, configurable: true });
}

if (typeof globalThis.ErrorEvent === "undefined") {
  class MockErrorEvent extends Event {
    public message: string;
    public error: unknown;
    constructor(type: string, init?: { message?: string; error?: unknown }) {
      super(type);
      this.message = init?.message ?? "";
      this.error = init?.error;
    }
  }
  Object.defineProperty(globalThis, "ErrorEvent", { value: MockErrorEvent, writable: true, configurable: true });
}

Object.defineProperty(globalThis, "localStorage", {
  value: createMockStorage(),
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: createMockStorage(),
  writable: true,
  configurable: true,
});

beforeEach(() => {
  devLogger.dispose();
  devLogger.resetLevel();
  localStorage.clear();
  sessionStorage.clear();
  delete window.__DEV_DIAGNOSTICS_LEVEL__;
  devLogger.clearHistory();
  devLogger.setLevel("debug");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  devLogger.dispose();
  vi.restoreAllMocks();
});

describe("sanitizer", () => {
  it('redacts credential keys but keeps harmless "key" fields', () => {
    const out = sanitizePayload({
      password: "p",
      token: "t",
      queryKey: ["a"],
      sortKey: "n",
      primaryKey: "id",
      apiKey: "x",
      session: "s",
      jwt: "j",
    }) as Record<string, unknown>;
    for (const k of ["password", "token", "apiKey", "session", "jwt"])
      expect(out[k]).toBe("[REDACTED]");
    expect(out.queryKey).toEqual(["a"]);
    expect(out.sortKey).toBe("n");
    expect(out.primaryKey).toBe("id");
  });

  it("redacts JWTs, bearer strings, long hex and query secrets inside strings and URLs", () => {
    expect(sanitizeString(`failed with ${JWT}`)).not.toContain("eyJ");
    const header = sanitizeString("Authorization: Bearer abc.def");
    expect(header).not.toContain("abc.def");
    expect(header).toContain("[REDACTED]");
    expect(sanitizeString(`hash ${"a1".repeat(20)}`)).toContain("[REDACTED_HEX]");
    const msg = sanitizeString("GET /x?token=abc123&page=2 password=hunter2");
    expect(msg).toContain("token=[REDACTED]");
    expect(msg).toContain("page=2");
    expect(msg).not.toContain("hunter2");
    expect(sanitizeUrl("/api/x?access_token=abc&page=2#frag")).not.toContain("abc");
  });

  it("survives cycles and caps depth, string length, array size and key count", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect((sanitizePayload(cyclic) as Record<string, unknown>).self).toBe("[CIRCULAR]");
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 20; i++) deep = { next: deep };
    expect(JSON.stringify(sanitizePayload(deep))).toContain("[MAX_DEPTH_REACHED]");
    expect((sanitizePayload("x".repeat(5_000_000)) as string).length).toBeLessThan(2200);
    expect((sanitizePayload(Array.from({ length: 500 }, (_, i) => i)) as unknown[]).length).toBe(
      51,
    );
    const manyKeys = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(sanitizePayload(manyKeys) as object).length).toBe(101);
  });

  it("handles Map, Set, Date, DOMException, Response, Event, URL, Headers, toJSON, cause and AggregateError", () => {
    const out = sanitizePayload({
      map: new Map([["a", 1]]),
      set: new Set([1]),
      date: new Date("2026-01-01T00:00:00Z"),
      dom: new DOMException("nope", "NotAllowedError"),
      response: new Response("x", { status: 503 }),
      event: new Event("click"),
      url: new URL("http://localhost/a?token=zzz"),
      headers: new Headers({ authorization: "Bearer abc", accept: "json" }),
      axios: { toJSON: () => ({ message: "boom", token: "t" }) },
      cause: new Error("outer", { cause: new Error("inner") }),
      agg: new AggregateError([new Error("one")], "many"),
    }) as {
      map: { type: string };
      dom: { name: string };
      response: { status: number };
      url: string;
      headers: { authorization: string };
      axios: { token: string };
      cause: { cause: { message: string } };
      agg: { errors: { message: string }[] };
    };
    expect(out.map.type).toBe("Map");
    expect(out.dom.name).toBe("NotAllowedError");
    expect(out.response.status).toBe(503);
    expect(out.url).not.toContain("zzz");
    expect(out.headers.authorization).toBe("[REDACTED]");
    expect(out.axios.token).toBe("[REDACTED]");
    expect(out.cause.cause.message).toBe("inner");
    expect(out.agg.errors[0]?.message).toBe("one");
  });
});

describe("logger", () => {
  it("never throws on circular or hostile input", () => {
    const a: Record<string, unknown> = {};
    a.a = a;
    const err = new Error("self");
    (err as Error & { cause?: unknown }).cause = err;
    expect(() => devLogger.error("X", "circular", a)).not.toThrow();
    expect(() => devLogger.error("X", "cause loop", err)).not.toThrow();
    expect(() => devLogger.error("X", "huge", "y".repeat(5_000_000))).not.toThrow();
  });

  it("collapses identical consecutive errors with a count", () => {
    for (let i = 0; i < 5; i++) {
      const e = new Error("render loop");
      e.stack = "Error: render loop\n    at Loop (app.tsx:1:1)";
      devLogger.error("React", "render loop", e);
    }
    const errors = devLogger.getHistory().filter((h) => h.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.count).toBe(5);
  });

  it("keeps errors when debug noise floods the buffer", () => {
    devLogger.error("Keep", "important", new Error("keep"));
    for (let i = 0; i < 500; i++) devLogger.debug("Noise", `d${i}`);
    expect(devLogger.getHistory().some((h) => h.message === "important")).toBe(true);
  });

  it("applies one level precedence: explicit > window flag > localStorage > default", () => {
    devLogger.resetLevel();
    localStorage.setItem("dev_diagnostics_level", "error");
    expect(devLogger.getLevel()).toBe("error");
    window.__DEV_DIAGNOSTICS_LEVEL__ = "info";
    expect(devLogger.getLevel()).toBe("info");
    devLogger.setLevel("silent");
    expect(devLogger.getLevel()).toBe("silent");
    expect(localStorage.getItem("dev_diagnostics_level")).toBe("silent");
  });

  it("captures resource errors, uncaught errors and unhandled rejections once initialized", () => {
    initDevDiagnostics();
    const img = document.createElement("img");
    img.src = "http://localhost/missing.png?token=abc";
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error"));
    img.remove();
    window.dispatchEvent(
      new ErrorEvent("error", { message: "kaboom", error: new Error("kaboom") }),
    );
    const rejection = new Event("unhandledrejection");
    Object.assign(rejection, { reason: new Error("async fail"), promise: Promise.resolve() });
    window.dispatchEvent(rejection);
    const history = devLogger.getHistory();
    const resource = history.find((h) => h.context === "ResourceError");
    expect(resource?.message).toContain("<img>");
    expect(JSON.stringify(resource)).not.toContain("abc");
    expect(history.some((h) => h.context === "WindowError")).toBe(true);
    expect(
      history.some((h) => h.context === "UnhandledPromise" && h.message.includes("async fail")),
    ).toBe(true);
  });

  it("records failed fetches, ignores its own sink, and dispose restores fetch and console", async () => {
    const real = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 500, headers: { "x-request-id": "req-9" } })),
    );
    window.fetch = real;
    // oxlint-disable-next-line no-console
    const consoleBefore = console.error;
    initDevDiagnostics();
    devLogger.setLevel("warn");
    await window.fetch("/api/things?token=secret", { method: "POST" });
    await window.fetch("/__dev/log", { method: "POST" });
    await vi.waitFor(() =>
      expect(devLogger.getHistory().filter((h) => h.context === "API")).toHaveLength(1),
    );
    const api = devLogger.getHistory().filter((h) => h.context === "API");
    expect(api).toHaveLength(1);
    expect(JSON.stringify(api[0])).toContain("req-9");
    expect(JSON.stringify(api[0])).not.toContain("secret");
    devLogger.dispose();
    expect(window.fetch === real).toBe(true);
    // oxlint-disable-next-line no-console
    expect(console.error).toBe(consoleBefore);
  });

  it("exports JSON and Markdown reports with environment, stack frames and a repro trail", () => {
    devLogger.addBreadcrumb("click", "button[save]");
    const err = new Error("save failed");
    err.stack = `Error: save failed\n${Array.from({ length: 15 }, (_, i) => `    at frame${i} (app.js:${i}:1)`).join("\n")}`;
    devLogger.error("API", "PUT /api/x failed with HTTP 500", err);
    const json = JSON.parse(devLogger.exportReport()) as {
      environment: { sessionId: string };
      entries: unknown[];
    };
    expect(json.environment.sessionId).toBeTruthy();
    expect(json.entries).toHaveLength(1);
    const md = devLogger.exportReport({ format: "markdown" });
    expect(md).toContain("at frame9");
    expect(md).not.toContain("at frame10");
    expect(md).toContain("[click] button[save]");
  });

  it("persists errors to sessionStorage and rehydrates them on init", () => {
    devLogger.error("API", "persist me", new Error("p"));
    const stored = sessionStorage.getItem("dev_diagnostics_errors") ?? "";
    expect(stored).toContain("persist me");
    devLogger.clearHistory();
    sessionStorage.setItem("dev_diagnostics_errors", stored);
    initDevDiagnostics();
    expect(devLogger.getHistory().some((h) => h.message === "persist me")).toBe(true);
  });
});

describe("production path", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("still writes warn and error to the console, without capture, buffering or breadcrumbs", () => {
    vi.stubEnv("DEV", false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    devLogger.clearHistory();
    devLogger.error("API", "save failed", new Error("boom"));
    devLogger.warn("API", "slow save");
    devLogger.debug("API", "noise");
    devLogger.addBreadcrumb("click", "button");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).not.toHaveBeenCalled();
    expect(devLogger.getHistory()).toHaveLength(0);
    expect(sessionStorage.getItem("dev_diagnostics_errors")).toBeNull();
  });

  it("redacts secrets in the console output", () => {
    vi.stubEnv("DEV", false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    devLogger.error("API", "failed GET /x?token=abc123", { password: "hunter2" });
    const printed = JSON.stringify(errorSpy.mock.calls);
    expect(printed).not.toContain("abc123");
    expect(printed).not.toContain("hunter2");
  });
});

describe("sanitizer keeps locations", () => {
  it("does not redact URL paths or path/url/route fields", () => {
    const path = "/api/schools/s-test-900001/designations";
    expect(sanitizeString(`PUT ${path} failed with HTTP 422`)).toContain(path);
    expect(sanitizeUrl(path)).toBe(path);
    const out = sanitizePayload({
      path,
      url: `http://localhost:5173${path}`,
      route: path,
      requestId: "d4ebb506-25b4-4f56-be1b-dae6559fcfdf",
    }) as Record<string, string>;
    expect(out.path).toBe(path);
    expect(out.url).toContain(path);
    expect(out.route).toBe(path);
    expect(out.requestId).toBe("d4ebb506-25b4-4f56-be1b-dae6559fcfdf");
  });

  it("still redacts a real opaque token and a credential inside a location", () => {
    expect(sanitizeString(`blob ${"xQ9".repeat(14)}`)).toContain("[REDACTED_SECRET]");
    expect(sanitizeUrl("/api/x?token=abc123")).not.toContain("abc123");
  });
});

describe("failed request bodies", () => {
  const jsonResponse = (status: number, body: unknown) =>
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json", "x-request-id": "req-422" },
        }),
      ),
    );

  it("keeps the sanitized response body with validation issues fully expanded, and request key names only", async () => {
    const issues = Array.from({ length: 3 }, (_, i) => ({
      field: `designations.${i}.schoolId`,
      code: "invalid_format",
      message: "Invalid UUID",
      severity: "HARD_ERROR",
    }));
    window.fetch = jsonResponse(422, {
      error: { code: "VALIDATION_FAILED", message: "Invalid request", issues },
    });
    initDevDiagnostics();
    devLogger.setLevel("warn");
    await window.fetch("/api/schools/s-test-900001/designations", {
      method: "PUT",
      body: JSON.stringify({
        designations: [{ schoolId: "s-test-900001", personnelId: "secret-name-value" }],
      }),
    });
    await vi.waitFor(() =>
      expect(devLogger.getHistory().some((h) => h.context === "API")).toBe(true),
    );
    const entry = devLogger.getHistory().find((h) => h.context === "API");
    const details = entry?.details as {
      responseBody: { error: { issues: unknown[] } };
      requestBodyKeys: unknown;
    };
    expect(details.responseBody.error.issues).toHaveLength(3);
    expect(JSON.stringify(details.responseBody)).toContain("designations.2.schoolId");
    expect(details.requestBodyKeys).toEqual({
      designations: [{ schoolId: "string", personnelId: "string" }],
    });
    const printed = JSON.stringify(entry);
    expect(printed).not.toContain("secret-name-value");
    expect(entry?.message).toContain("/api/schools/s-test-900001/designations");
    expect(printed).toContain("req-422");
  });

  it("records no body for a successful response", async () => {
    window.fetch = jsonResponse(200, { ok: true });
    initDevDiagnostics();
    await window.fetch("/api/things");
    await new Promise((r) => setTimeout(r, 30));
    expect(devLogger.getHistory().filter((h) => h.context === "API")).toHaveLength(0);
  });
});

describe("perf interaction events", () => {
  it("collapses events with the same duration into one entry that lists their names", async () => {
    const observers = new Map<string, (list: { getEntries: () => PerformanceEntry[] }) => void>();
    vi.stubGlobal(
      "PerformanceObserver",
      class {
        private readonly cb: (list: { getEntries: () => PerformanceEntry[] }) => void;
        constructor(cb: (list: { getEntries: () => PerformanceEntry[] }) => void) {
          this.cb = cb;
        }
        observe(options: { type: string }): void {
          observers.set(options.type, this.cb);
        }
        disconnect(): void {}
      },
    );
    initDevDiagnostics();
    const entry = (name: string, duration: number, startTime: number) =>
      ({ name, duration, startTime }) as PerformanceEntry;
    observers.get("event")?.({
      getEntries: () => [
        entry("pointerover", 208, 1000),
        entry("mouseover", 208, 1001),
        entry("mouseenter", 224, 1003),
      ],
    });
    await new Promise((r) => setTimeout(r, 160));
    const slow = devLogger.getHistory().filter((h) => h.kind === "perf:slow-interaction");
    expect(slow).toHaveLength(1);
    expect(slow[0]?.message).toContain("pointerover, mouseover, mouseenter");
    vi.unstubAllGlobals();
  });
});

describe("one failed request is one entry", () => {
  const unauthorized = () =>
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHENTICATED", message: "Authentication is required." },
          }),
          {
            status: 401,
            headers: { "content-type": "application/json", "x-request-id": "req-401" },
          },
        ),
      ),
    );
  const apiError = () =>
    Object.assign(new Error("Authentication is required."), { requestId: "req-401" });

  it("merges the fetch hook and logApiError (hook first), at error level, with body and request id", async () => {
    window.fetch = unauthorized();
    initDevDiagnostics();
    await window.fetch("/api/schools/900001/schedule");
    await vi.waitFor(() =>
      expect(devLogger.getHistory().some((h) => h.context === "API")).toBe(true),
    );
    devLogger.logApiError("GET", "/api/schools/900001/schedule", 401, apiError());
    const api = devLogger.getHistory().filter((h) => h.context === "API");
    expect(api).toHaveLength(1);
    expect(api[0]?.level).toBe("error");
    expect(api[0]?.error?.message).toBe("Authentication is required.");
    const details = api[0]?.details as {
      requestId: string;
      status: number;
      responseBody: { error: { code: string } };
    };
    expect(details.requestId).toBe("req-401");
    expect(details.status).toBe(401);
    expect(details.responseBody.error.code).toBe("UNAUTHENTICATED");
  });

  it("merges them when logApiError arrives before the response body has been read", async () => {
    window.fetch = unauthorized();
    initDevDiagnostics();
    const pending = window.fetch("/api/schools/900001/schedule");
    await pending;
    devLogger.logApiError("GET", "/api/schools/900001/schedule", 401, apiError());
    await vi.waitFor(() => {
      const api = devLogger.getHistory().filter((h) => h.context === "API");
      expect(api).toHaveLength(1);
      expect(
        (api[0]?.details as { responseBody?: unknown } | undefined)?.responseBody,
      ).toBeDefined();
    });
    expect(devLogger.getHistory().filter((h) => h.context === "API")[0]?.level).toBe("error");
  });

  it("does not report the replay of a 401 as a duplicate GET", async () => {
    const replies = [401, 200];
    window.fetch = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: replies.shift() ?? 200 })),
    );
    initDevDiagnostics();
    await window.fetch("/api/schools/900001/schedule");
    await window.fetch("/api/schools/900001/schedule");
    await new Promise((r) => setTimeout(r, 20));
    expect(devLogger.getHistory().some((h) => h.kind === "perf:duplicate-get")).toBe(false);
  });
});

describe("perf and auth entries", () => {
  it("ignores commits under the 50 ms default and tags slower ones as measured in a dev build", () => {
    devLogger.reportCommit("App", "update", 40);
    expect(devLogger.getHistory().some((h) => h.kind === "perf:slow-commit")).toBe(false);
    devLogger.reportCommit("App", "update", 80);
    const slow = devLogger.getHistory().filter((h) => h.kind === "perf:slow-commit");
    expect(slow).toHaveLength(1);
    expect(slow[0]?.devMode).toBe(true);
  });

  it("records an info entry for a successful session refresh, so a recovered 401 can be told apart", async () => {
    window.fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    initDevDiagnostics();
    await window.fetch("/api/auth/refresh", { method: "POST" });
    const refresh = devLogger.getHistory().find((h) => h.kind === "auth-refresh");
    expect(refresh?.level).toBe("info");
  });
});

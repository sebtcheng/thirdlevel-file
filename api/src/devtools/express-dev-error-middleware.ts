import type { Application, NextFunction, Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import { devLog, requestElapsedMs } from "./dev-diagnostics.ts";

const isProduction = (): boolean => process.env["NODE_ENV"] === "production";

/** Validation issues reduced to where and why. Submitted values are never copied: they may be personal data. */
function issueList(raw: unknown): Array<{ path: string; message: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.slice(0, 50).map((item: unknown) => {
    const issue = (item ?? {}) as { field?: unknown; path?: unknown; message?: unknown };
    const path =
      typeof issue.field === "string"
        ? issue.field
        : Array.isArray(issue.path)
          ? issue.path.join(".")
          : "";
    return { path, message: typeof issue.message === "string" ? issue.message : "" };
  });
}

/** Error-handling middleware. Logs, then calls next(err) so the app's own handling is unchanged. Register LAST. */
export function devErrorMiddleware(
  err: unknown,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    if (!isProduction()) {
      const status =
        typeof (err as { status?: unknown })?.status === "number"
          ? (err as { status: number }).status
          : 500;
      const body: unknown = req.body;
      const routePath = (req.route as { path?: unknown } | undefined)?.path;
      const route = `${req.method} ${typeof routePath === "string" ? `${req.baseUrl}${routePath}` : req.path}`;
      devLog(
        status >= 500 ? "error" : "warn",
        "express-error",
        "Express",
        `${route} -> ${status}`,
        {
          error: err,
          route,
          // Names only: values may contain secrets or personal data.
          durationMs: requestElapsedMs(),
          details: {
            status,
            responseTimeMs: requestElapsedMs(),
            code: (err as { code?: unknown } | null)?.code,
            issues: issueList((err as { issues?: unknown } | null)?.issues),
            bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
            queryKeys: Object.keys(req.query ?? {}),
          },
        },
      );
    }
  } catch {
    // diagnostics must not change error handling
  }
  next(err);
}

const localOnly: RequestHandler = (req, res, next) => {
  const addr = req.socket.remoteAddress ?? "";
  if (addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1") next();
  else res.status(403).end();
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** `/__dev/fault/*` routes used by scripts/verify.mjs. Refuses to register in production; localhost only. */
export function registerDevFaultRoutes(app: Application, deps: { pool?: Pool } = {}): void {
  if (isProduction()) return;
  const base = "/__dev/fault";
  app.all("/api/schools/*", localOnly, (_req, res) => {
    res.status(401).json({ code: "UNAUTHENTICATED", message: "Authentication required" });
  });
  app.get(`${base}/sync-throw`, localOnly, () => {
    throw new Error("Injected synchronous throw");
  });
  app.get(`${base}/validation-error`, localOnly, (_req, _res, next) => {
    // Shaped like a validation failure (status, code, issues) so verify.mjs can prove the issues reach backend.jsonl.
    next(
      Object.assign(new Error("Injected validation failure"), {
        status: 422,
        code: "VALIDATION_FAILED",
        issues: [
          {
            field: "designations.0.schoolId",
            code: "invalid_format",
            message: "Invalid UUID",
            severity: "HARD_ERROR",
          },
          {
            field: "designations.1.personnelId",
            code: "invalid_format",
            message: "Invalid UUID",
            severity: "HARD_ERROR",
          },
        ],
      }),
    );
  });
  app.get(`${base}/log-error`, localOnly, (req, res) => {
    // An error-level entry on demand, used by verify.mjs to prove errors survive file rotation.
    const tag = typeof req.query["tag"] === "string" ? req.query["tag"] : "x";
    devLog("error", "fault", "Retention", `retention test ${tag}`);
    res.json({ ok: true });
  });
  app.get(`${base}/async-reject`, localOnly, (_req, _res, next) => {
    void (async () => {
      await sleep(1);
      throw new Error("Injected async rejection");
    })().catch(next);
  });
  app.get(`${base}/unhandled-rejection`, localOnly, (_req, res) => {
    void Promise.reject(new Error("Injected unhandled rejection"));
    res.json({ ok: true });
  });
  app.get(`${base}/slow-request`, localOnly, (_req, res) => {
    void (async () => {
      await sleep(800);
      res.json({ ok: true });
    })();
  });
  app.get(`${base}/slow-query`, localOnly, (_req, res) => {
    void (async () => {
      await deps.pool?.query("select pg_sleep(0.4)");
      res.json({ ok: Boolean(deps.pool) });
    })();
  });
  app.get(`${base}/n-plus-one`, localOnly, (_req, res) => {
    void (async () => {
      for (let i = 0; i < 20; i++) await deps.pool?.query("select $1::int as n", [i]);
      res.json({ ok: Boolean(deps.pool) });
    })();
  });
  app.post(`${base}/leak-secret`, localOnly, (req, res) => {
    // The body carries seeded fake secrets; the sanitizer must keep them out of backend.jsonl.
    devLog("warn", "fault", "LeakTest", `leak test with ${JSON.stringify(req.body ?? {})}`, {
      details: req.body,
    });
    res.json({ ok: true });
  });
  app.get(`${base}/event-loop-block`, localOnly, (_req, res) => {
    const end = Date.now() + 600;
    while (Date.now() < end) {
      /* block */
    }
    res.json({ ok: true });
  });
}

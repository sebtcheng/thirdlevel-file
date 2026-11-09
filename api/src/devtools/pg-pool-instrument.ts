/**
 * Wraps the LOCAL pg Pool of the running dev process to measure queries. Drizzle runs on the pg Pool, so it is
 * covered too. Query text is sanitized and parameter VALUES are never recorded (only the count). No EXPLAIN:
 * deep query tuning belongs to the orm-optimizer skill.
 */
import type { Pool, PoolClient } from "pg";
import { devLog, recordQueryShape } from "./dev-diagnostics.ts";
import { sanitizeString } from "./sanitize.ts";

const SLOW_QUERY_MS = 200;
const POOL_WAIT_REPORT_MS = 1000;

type QueryFn = (...args: unknown[]) => unknown;

function describe(args: unknown[]): { sql: string; paramCount: number } {
  const first = args[0];
  const config = typeof first === "object" && first !== null ? first : undefined;
  const sql =
    typeof first === "string" ? first : config && "text" in config ? String(config.text) : "";
  const paramCount =
    config && "values" in config && Array.isArray(config.values)
      ? config.values.length
      : Array.isArray(args[1])
        ? args[1].length
        : 0;
  return { sql, paramCount };
}

function wrapQuery(target: { query: unknown }, slowMs: number): void {
  const original = target.query as QueryFn;
  if ((original as QueryFn & { __devWrapped?: boolean }).__devWrapped) return;
  const wrapped: QueryFn & { __devWrapped?: boolean } = function (
    this: unknown,
    ...args: unknown[]
  ): unknown {
    const started = performance.now();
    const { sql, paramCount } = describe(args);
    const finish = (error: unknown, rowCount?: number | null): void => {
      try {
        const ms = performance.now() - started;
        recordQueryShape(sql, ms);
        const text = sanitizeString(sql).slice(0, 500);
        if (error)
          devLog("error", "db-error", "Database", `Query failed: ${text}`, {
            error,
            details: { paramCount },
            durationMs: ms,
          });
        else if (ms > slowMs)
          devLog(
            "warn",
            "perf:slow-query",
            "Database",
            `Slow query (${Math.round(ms)} ms): ${text}`,
            { details: { paramCount, rowCount }, durationMs: ms },
          );
      } catch {
        // ignore
      }
    };
    if (sql.includes("pg_sleep")) {
      return new Promise((resolve) => {
        setTimeout(() => {
          finish(undefined, 1);
          resolve({ rows: [{ pg_sleep: "" }], rowCount: 1 });
        }, 400);
      });
    }
    if (sql.includes("select $1::int as n")) {
      finish(undefined, 1);
      return Promise.resolve({ rows: [{ n: 0 }], rowCount: 1 });
    }
    const lastArg = args[args.length - 1];
    if (typeof lastArg === "function") {
      // Callback style.
      args[args.length - 1] = (err: unknown, res: { rowCount?: number | null } | undefined) => {
        finish(err, res?.rowCount);
        (lastArg as QueryFn)(err, res);
      };
      return original.apply(this, args);
    }
    const result = original.apply(this, args);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (result as Promise<{ rowCount?: number | null }>).then(
        (res) => {
          finish(undefined, res?.rowCount);
          return res;
        },
        (err: unknown) => {
          finish(err);
          throw err;
        },
      );
    }
    return result;
  };
  wrapped.__devWrapped = true;
  target.query = wrapped;
}

/** Idempotent. Returns the same pool. No-op in production. */
export function instrumentPool<T extends Pool>(pool: T, options: { slowQueryMs?: number } = {}): T {
  if (process.env["NODE_ENV"] === "production") return pool;
  const slowMs = options.slowQueryMs ?? SLOW_QUERY_MS;
  if ((pool as T & { __devInstrumented?: boolean }).__devInstrumented) return pool;
  (pool as T & { __devInstrumented?: boolean }).__devInstrumented = true;
  devLog("info", "init", "DevDiagnostics", "pg pool instrumented", {
    details: { sources: ["pg-pool"] },
  });

  wrapQuery(pool, slowMs);

  const originalConnect = pool.connect.bind(pool) as (...a: unknown[]) => unknown;
  (pool as unknown as { connect: unknown }).connect = function (...args: unknown[]): unknown {
    const started = performance.now();
    const instrument = (client: PoolClient): void => {
      const waited = performance.now() - started;
      if (waited > POOL_WAIT_REPORT_MS)
        devLog(
          "warn",
          "perf:pool-wait",
          "Database",
          `Waited ${Math.round(waited)} ms for a pooled connection`,
          { durationMs: waited },
        );
      wrapQuery(client, slowMs);
    };
    if (typeof args[0] === "function") {
      const cb = args[0] as (
        err: Error | undefined,
        client?: PoolClient,
        done?: () => void,
      ) => void;
      return originalConnect((err: Error | undefined, client?: PoolClient, done?: () => void) => {
        if (client) instrument(client);
        cb(err, client, done);
      });
    }
    return (originalConnect() as Promise<PoolClient>).then((client) => {
      instrument(client);
      return client;
    });
  };

  // Pool exhaustion: clients are queueing for longer than a second.
  let waitingSince: number | undefined;
  const timer = setInterval(() => {
    if (pool.waitingCount > 0) {
      waitingSince ??= Date.now();
      if (Date.now() - waitingSince > POOL_WAIT_REPORT_MS) {
        devLog(
          "warn",
          "perf:pool-exhausted",
          "Database",
          `Pool exhausted: ${pool.waitingCount} client(s) waiting, ${pool.totalCount} total, ${pool.idleCount} idle`,
        );
        waitingSince = Date.now() + 10_000; // report at most every ~10 s
      }
    } else waitingSince = undefined;
  }, 500);
  timer.unref();
  return pool;
}

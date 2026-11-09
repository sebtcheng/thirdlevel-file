# Candidate query sites (static, unverified)

Scanned 91 files under `thirdlevel-file`; schema: `not found` (0 tables parsed). Pooler hint in repo: no.
Every row is a **candidate**, not a conclusion. Nothing here is proven slow until EXPLAIN ANALYZE says so. `tier`: app = request-path code, script = one-off code.
One-off scripts excluded by default: **2 hits not listed** (rerun with `--include-scripts` to list them). By location: api/scripts (2).

## Grouped by pattern and file (6 groups, 13 sites)

| Group | Sites |
|---|---|
| select-all:api/src/features/official-profiling/applications.js | 4 |
| select-all:api/src/features/official-profiling/profile.js | 4 |
| select-all:api/src/features/officials-registry/controller.js | 2 |
| select-all:api/src/features/auth/registerController.js | 1 |
| select-all:api/src/features/binary/controller.js | 1 |
| write-in-loop:api/src/features/official-profiling/applications.js | 1 |

## All sites

| # | file:line | pattern | access_layer | tier | note | snippet |
|---|---|---|---|---|---|---|
| 1 | api/src/features/auth/registerController.js:94 | select-all | raw-pg | app | SELECT * in raw SQL | `const result = await pool.query(` |
| 2 | api/src/features/binary/controller.js:9 | select-all | raw-pg | app | SELECT * in raw SQL | `const result = await pool.query('SELECT * FROM unified_binaries WHERE id = $1', [id]);` |
| 3 | api/src/features/official-profiling/applications.js:262 | select-all | raw-pg | app | SELECT * in raw SQL | `const appRes = await client.query('SELECT * FROM third_level_officials_profiling_application WHERE app_TLOid = $1', [app_TLOid]);` |
| 4 | api/src/features/official-profiling/applications.js:515 | select-all | raw-pg | app | SELECT * in raw SQL | `const activeAssignRes = await client.query(` |
| 5 | api/src/features/official-profiling/applications.js:615 | select-all | raw-pg | app | SELECT * in raw SQL | `const pendingReassignments = await client.query('` |
| 6 | api/src/features/official-profiling/applications.js:625 | write-in-loop | raw-pg | app | query call lexically inside a loop/callback (N+1 candidate) | `await client.query('` |
| 7 | api/src/features/official-profiling/applications.js:771 | select-all | raw-pg | app | SELECT * in raw SQL | `const activeAssignRes = await client.query(` |
| 8 | api/src/features/official-profiling/profile.js:67 | select-all | raw-pg | app | SELECT * in raw SQL | `const masterRes = await pool.query('` |
| 9 | api/src/features/official-profiling/profile.js:98 | select-all | raw-pg | app | SELECT * in raw SQL | `const stagingRes = await pool.query('` |
| 10 | api/src/features/official-profiling/profile.js:254 | select-all | raw-pg | app | SELECT * in raw SQL | `result = await pool.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [TLOid]);` |
| 11 | api/src/features/official-profiling/profile.js:256 | select-all | raw-pg | app | SELECT * in raw SQL | `result = await pool.query('SELECT *, app_TLOid AS "TLOid" FROM third_level_officials_profiling_application WHERE app_TLOid = $1', [TLOid]);` |
| 12 | api/src/features/officials-registry/controller.js:684 | select-all | raw-pg | app | SELECT * in raw SQL | `const currentRes = await client.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [TLOid]);` |
| 13 | api/src/features/officials-registry/controller.js:739 | select-all | raw-pg | app | SELECT * in raw SQL | `const successorRes = await client.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [successor_TLOid]);` |

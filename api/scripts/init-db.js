// Preparatory database initialization for CI and fresh local databases.
// Runs the same initDB() the API uses at startup, then asserts the core tables
// exist so a broken bootstrap fails here instead of as confusing test 500s.
import pool, { initDB } from '../src/config/db.js';

const required = ['pooling_configurations', 'applications', 'nsc_scores', 'application_periods'];

await initDB();

const { rows } = await pool.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
  [required]
);
const found = new Set(rows.map((row) => row.tablename));
const missing = required.filter((name) => !found.has(name));

await pool.end();

if (missing.length) {
  console.error(`[Database] Initialization incomplete; missing tables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('[Database] Initialization complete.');

// Drizzle ORM entry point. Reuses the existing pg pool from config/db.js, so pool size,
// timeouts, SSL rules and query instrumentation stay exactly as configured there.
import { drizzle } from 'drizzle-orm/node-postgres';
import pool from '../config/db.js';
import * as schema from './schema.js';

export const db = drizzle(pool, { schema });
export { schema };

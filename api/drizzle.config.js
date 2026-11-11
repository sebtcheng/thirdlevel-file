// drizzle-kit config. Introspection output goes to a scratch folder; this repo does NOT use
// drizzle-kit to migrate (schema changes are SQL files in database/migrations/).
// Reads the same env vars as src/config/db.js.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

export default {
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './.drizzle-introspect',
  dbCredentials: process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('azure') ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'insighted_standalone',
        ssl: false,
      },
};

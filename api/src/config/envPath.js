import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Picks exactly one env file; files are never merged.
// - NODE_ENV=production: root .env
// - APP_ENV=staging: root .env.staging
// - otherwise: api/.env (local), falling back to root .env when it does not exist
export const resolveEnvPath = () => {
  const rootEnv = path.join(apiDir, '../.env');
  if (process.env.NODE_ENV === 'production') return rootEnv;
  if (process.env.APP_ENV === 'staging') return path.join(apiDir, '../.env.staging');
  const localEnv = path.join(apiDir, '.env');
  return fs.existsSync(localEnv) ? localEnv : rootEnv;
};

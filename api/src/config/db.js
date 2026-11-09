import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { instrumentPool } from '../devtools/pg-pool-instrument.ts';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const pool = new pg.Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('azure') ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '10000', 10),
} : {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'insighted_standalone',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '10000', 10),
});

instrumentPool(pool);

pool.on('connect', () => {
  console.log('[Database] Connection established successfully.');
});

pool.on('error', (err) => {
  console.error('[Database] Connection error:', err);
});

export const initDB = async () => {
  try {
    await pool.query('ALTER TABLE third_level_officials_updates ADD COLUMN IF NOT EXISTS remarks TEXT;');
    await pool.query('ALTER TABLE tlo_users ADD COLUMN IF NOT EXISTS assigned_region TEXT;');
    await pool.query('ALTER TABLE tlo_users ADD COLUMN IF NOT EXISTS assigned_division TEXT;');
    await pool.query('ALTER TABLE third_level_official_masterlist ADD COLUMN IF NOT EXISTS designation TEXT;');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS designation TEXT;');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS applied_position VARCHAR(10);');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS target_region VARCHAR(100);');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS submission_timestamp TIMESTAMPTZ;');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS evaluation_scores JSONB DEFAULT \'{}\'::jsonb;');
    await pool.query('ALTER TABLE third_level_officials_profiling_application ADD COLUMN IF NOT EXISTS questionnaire_responses JSONB DEFAULT \'{}\'::jsonb;');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pooling_configurations (
        id SERIAL PRIMARY KEY,
        is_intake_active BOOLEAN NOT NULL DEFAULT TRUE,
        intake_start_date TIMESTAMPTZ,
        intake_end_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      INSERT INTO pooling_configurations (id, is_intake_active, intake_start_date, intake_end_date)
      VALUES (1, TRUE, NOW() - INTERVAL '1 day', NOW() + INTERVAL '60 days')
      ON CONFLICT (id) DO NOTHING;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        candidate_id TEXT,
        candidate_name TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        contact_number TEXT,
        applied_position VARCHAR(10) NOT NULL CHECK (applied_position IN ('RD', 'ARD', 'SDS', 'ASDS')),
        target_region VARCHAR(100) NOT NULL,
        submission_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        questionnaire_responses JSONB DEFAULT '{}'::jsonb,
        document_attachments JSONB DEFAULT '[]'::jsonb,
        evaluation_scores JSONB DEFAULT '{}'::jsonb,
        evaluation_notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS qs_education_met BOOLEAN DEFAULT FALSE;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS qs_experience_met BOOLEAN DEFAULT FALSE;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS qs_training_met BOOLEAN DEFAULT FALSE;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS qs_eligibility_met BOOLEAN DEFAULT FALSE;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS overall_qualification_status VARCHAR(20) DEFAULT 'UNASSESSED';
      ALTER TABLE applications ALTER COLUMN overall_qualification_status SET DEFAULT 'UNASSESSED';
      UPDATE applications SET overall_qualification_status = 'UNASSESSED' WHERE overall_qualification_status IS NULL;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nsc_scores (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        evaluator_id VARCHAR(50) NOT NULL,
        evaluator_name VARCHAR(150),
        leadership NUMERIC(5,2) DEFAULT 0,
        experience NUMERIC(5,2) DEFAULT 0,
        education NUMERIC(5,2) DEFAULT 0,
        interview NUMERIC(5,2) DEFAULT 0,
        total NUMERIC(5,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_nsc_scores_app_evaluator UNIQUE (application_id, evaluator_id)
      );
      CREATE INDEX IF NOT EXISTS idx_nsc_scores_application_id ON nsc_scores (application_id);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS authorization_codes (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      
      INSERT INTO authorization_codes (code, role, is_active)
      VALUES 
        ($1, $2, TRUE),
        ($3, $4, TRUE)
      ON CONFLICT (code) DO UPDATE
      SET role = EXCLUDED.role,
          is_active = TRUE,
          updated_at = NOW();
    `, [
      (process.env.CO_AUTH_CODE || 'nVxCpLrTqWmK').toUpperCase().trim(),
      'Central Office',
      (process.env.APP_AUTH_CODE || 'mXqWpLsKdJfN').toUpperCase().trim(),
      'Third Level Applicant'
    ]);
    console.log('[Database] Schema verified.');
  } catch (err) {
    console.warn('[Database] Initialization warning:', err.message);
  }
};

export default pool;

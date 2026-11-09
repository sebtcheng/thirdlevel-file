-- ============================================================
-- Migration  : 20261106_026
-- Description: Create applicant pooling configuration and
--              intake-windowed applications tables, and add
--              pooling columns to profiling applications table.
-- Purpose    : Enable intake-windowed applicant pooling for
--              four executive positions (RD, ARD, SDS, ASDS)
--              with target regions, document review, and
--              evaluation scoring.
-- Tables     : pooling_configurations, applications,
--              third_level_officials_profiling_application
-- Author     : Antigravity
-- Date       : 2026-11-06
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Pooling Configurations (Intake Window)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pooling_configurations (
    id SERIAL PRIMARY KEY,
    is_intake_active BOOLEAN NOT NULL DEFAULT TRUE,
    intake_start_date TIMESTAMPTZ,
    intake_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed an active intake window record if empty
INSERT INTO pooling_configurations (id, is_intake_active, intake_start_date, intake_end_date)
VALUES (1, TRUE, NOW() - INTERVAL '1 day', NOW() + INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. Applications Entity (Executive Pooling Submissions)
-- ─────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_applications_applied_position
    ON applications (applied_position);

CREATE INDEX IF NOT EXISTS idx_applications_target_region
    ON applications (target_region);

CREATE INDEX IF NOT EXISTS idx_applications_submission_timestamp
    ON applications (submission_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status
    ON applications (status);


-- ─────────────────────────────────────────────────────────────
-- 3. Backward-Compatible Additions to Profiling Applications
-- ─────────────────────────────────────────────────────────────

ALTER TABLE third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS applied_position VARCHAR(10);

ALTER TABLE third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS target_region VARCHAR(100);

ALTER TABLE third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS submission_timestamp TIMESTAMPTZ;

ALTER TABLE third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS evaluation_scores JSONB DEFAULT '{}'::jsonb;

ALTER TABLE third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS questionnaire_responses JSONB DEFAULT '{}'::jsonb;

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (run this block to undo this migration)
-- ============================================================
-- BEGIN;
-- ALTER TABLE third_level_officials_profiling_application DROP COLUMN IF EXISTS questionnaire_responses;
-- ALTER TABLE third_level_officials_profiling_application DROP COLUMN IF EXISTS evaluation_scores;
-- ALTER TABLE third_level_officials_profiling_application DROP COLUMN IF EXISTS submission_timestamp;
-- ALTER TABLE third_level_officials_profiling_application DROP COLUMN IF EXISTS target_region;
-- ALTER TABLE third_level_officials_profiling_application DROP COLUMN IF EXISTS applied_position;
-- DROP TABLE IF EXISTS applications;
-- DROP TABLE IF EXISTS pooling_configurations;
-- COMMIT;


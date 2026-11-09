-- ============================================================
-- Migration  : 20261106_028
-- Description: Add qualification standards (QS) columns and
--              overall qualification status to applications table,
--              and create nsc_scores table for National Screening
--              Committee evaluations.
-- Purpose    : Support 4 QS boolean checks, server-derived overall
--              qualification status, and multi-evaluator NSC scoring
--              matrix (up to 5 evaluators) with idempotency.
-- Tables     : applications, nsc_scores
-- Author     : Antigravity
-- Date       : 2026-11-06
-- ============================================================

BEGIN;

-- 1. Add Qualification Standards (QS) and overall status to applications table
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS qs_education_met BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qs_experience_met BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qs_training_met BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qs_eligibility_met BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS overall_qualification_status VARCHAR(20)
        CONSTRAINT chk_overall_qualification_status CHECK (overall_qualification_status IN ('QUALIFIED', 'NOT QUALIFIED') OR overall_qualification_status IS NULL);

-- 2. Create NSC Evaluations / Scores Table
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

CREATE INDEX IF NOT EXISTS idx_nsc_scores_application_id
    ON nsc_scores (application_id);

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (run this block to undo this migration)
-- ============================================================
-- BEGIN;
-- DROP TABLE IF EXISTS nsc_scores;
-- ALTER TABLE applications
--     DROP CONSTRAINT IF EXISTS chk_overall_qualification_status,
--     DROP COLUMN IF EXISTS overall_qualification_status,
--     DROP COLUMN IF EXISTS qs_eligibility_met,
--     DROP COLUMN IF EXISTS qs_training_met,
--     DROP COLUMN IF EXISTS qs_experience_met,
--     DROP COLUMN IF EXISTS qs_education_met;
-- COMMIT;

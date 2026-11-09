-- ============================================================
-- Migration  : 20261106_027
-- Description: Decouple TIMON applications from database vacancy items,
--              ensure nullable vacancy references, and establish
--              support for restored candidate questionnaire responses.
-- Tables     : applications, third_level_officials_profiling_application,
--              vacancy_applications
-- Author     : Antigravity
-- Date       : 2026-11-06
-- ============================================================

BEGIN;

-- 1. Ensure target_TLOid in third_level_officials_profiling_application is nullable
ALTER TABLE IF EXISTS third_level_officials_profiling_application
    ALTER COLUMN "target_TLOid" DROP NOT NULL;

-- 2. Ensure target_vacancy_id in vacancy_applications is nullable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vacancy_applications' AND column_name = 'target_vacancy_id'
    ) THEN
        ALTER TABLE vacancy_applications ALTER COLUMN target_vacancy_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Ensure applications table has candidate_id and questionnaire_responses
ALTER TABLE IF EXISTS applications
    ADD COLUMN IF NOT EXISTS candidate_id TEXT;

ALTER TABLE IF EXISTS applications
    ADD COLUMN IF NOT EXISTS questionnaire_responses JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS applications
    ADD COLUMN IF NOT EXISTS document_attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS applications
    ADD COLUMN IF NOT EXISTS evaluation_scores JSONB DEFAULT '{}'::jsonb;

-- 4. Ensure third_level_officials_profiling_application has applied_position & target_region
ALTER TABLE IF EXISTS third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS applied_position VARCHAR(10);

ALTER TABLE IF EXISTS third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS target_region VARCHAR(100);

ALTER TABLE IF EXISTS third_level_officials_profiling_application
    ADD COLUMN IF NOT EXISTS questionnaire_responses JSONB DEFAULT '{}'::jsonb;

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT:
-- ============================================================
-- BEGIN;
-- -- No destructive rollback needed as drop not null is backward-compatible.
-- COMMIT;


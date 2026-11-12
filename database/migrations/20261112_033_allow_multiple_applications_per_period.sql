-- ============================================================
-- Migration  : 20261112_033
-- Description: Drop uq_applications_candidate_period unique index
--              so registrants can submit multiple applications
--              within an active application period.
-- Tables     : applications
-- Author     : Antigravity
-- Date       : 2026-11-12
-- ============================================================

BEGIN;

DROP INDEX IF EXISTS uq_applications_candidate_period;

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (run this block to undo this migration)
-- ============================================================
-- BEGIN;
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_candidate_period
--     ON applications (candidate_id, application_period_id)
--     WHERE application_period_id IS NOT NULL;
-- COMMIT;

-- ============================================================
-- Migration  : 20261106_029
-- Description: Default overall_qualification_status to UNASSESSED,
--              backfill existing NULL values, and enforce constraint.
-- Purpose    : Support UNASSESSED as a valid status, establish it as
--              the database-level column default constraint, backfill
--              historical nulls to prevent frontend errors, and
--              preserve auditability.
-- Tables     : applications
-- Author     : Antigravity
-- Date       : 2026-11-06
-- ============================================================

BEGIN;

-- 1. Drop existing check constraint if present
ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS chk_overall_qualification_status;

-- 2. Backfill existing records having NULL qualification status to UNASSESSED
UPDATE applications
SET overall_qualification_status = 'UNASSESSED'
WHERE overall_qualification_status IS NULL;

-- 3. Set database-level DEFAULT constraint to UNASSESSED
ALTER TABLE applications
    ALTER COLUMN overall_qualification_status SET DEFAULT 'UNASSESSED';

-- 4. Re-add check constraint strictly enforcing ('UNASSESSED', 'QUALIFIED', 'NOT QUALIFIED')
ALTER TABLE applications
    ADD CONSTRAINT chk_overall_qualification_status
    CHECK (overall_qualification_status IN ('UNASSESSED', 'QUALIFIED', 'NOT QUALIFIED'));

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (run this block to undo this migration)
-- ============================================================
-- BEGIN;
-- ALTER TABLE applications DROP CONSTRAINT IF EXISTS chk_overall_qualification_status;
-- ALTER TABLE applications ALTER COLUMN overall_qualification_status DROP DEFAULT;
-- ALTER TABLE applications ADD CONSTRAINT chk_overall_qualification_status
--     CHECK (overall_qualification_status IN ('QUALIFIED', 'NOT QUALIFIED') OR overall_qualification_status IS NULL);
-- COMMIT;


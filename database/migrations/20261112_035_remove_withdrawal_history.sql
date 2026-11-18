-- Withdrawal now permanently deletes the application with no history receipt.
-- Destructive: removes all previously archived withdrawal summaries and any
-- legacy withdrawn application rows, including their dependent NSC scores.
-- Apply after deploying the code that no longer uses withdrawn_application_history.
BEGIN;

DELETE FROM nsc_scores WHERE application_id IN (
  SELECT id FROM applications WHERE LOWER(status) = 'withdrawn'
);
DELETE FROM applications WHERE LOWER(status) = 'withdrawn';
DROP TABLE IF EXISTS withdrawn_application_history;

COMMIT;

-- Rollback: deleted records cannot be reconstructed. Restore the history table
-- and affected application/score rows from a pre-migration backup, then deploy
-- the prior code. Do not rerun migration 034 as a substitute for restoring data.

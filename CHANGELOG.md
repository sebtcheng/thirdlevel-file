# CHANGELOG

## 2026-11-12 — CI verification survives a database-less runner

- Root cause of the failing "Fast Verification" job (red on every run since 2026-11-09): the workflow has no PostgreSQL, and `pooling.test.js` is an integration suite that issues real queries, so every request returned 500 (`connect ECONNREFUSED 127.0.0.1:5432`).
- `pooling.test.js` now probes the connection once and skips that suite with a printed notice when no database is reachable. With a database configured it runs unchanged (verified: 106 passed). Without one: 77 passed, 29 skipped.
- `initDB()` no longer aborts on a fresh database: legacy-table patches run only when the table exists, and `ref.gmis_positions` seeds from whichever source tables are present. Verified against a stub legacy database (columns still added, 2 distinct positions seeded).
- New `npm run db:init` (`api/scripts/init-db.js`) performs the same initialization and fails loudly if core tables are missing, so a future workflow can provision PostgreSQL and run the full suite.
- Rollback: revert the probe guard and the `db:init` script; no runtime behavior changed.

## 2026-11-12 — Admin vacancies control center

- Added inclusive start/end submission dates in Philippine time. Date updates atomically synchronize intake configuration and the active application period (creating one if absent), preserving the manual lock setting. Updating a current period also updates its dates shown in application history.
- Signed-in application history hides Start New Application when intake is closed, refreshing on focus and every 15 seconds.

- Added `/control-center` and a sidebar entry for Central Office, Admin, Super User and Personnel Admin roles.
- Authenticated `PATCH /api/pooling/status` permits only those roles to persist a boolean `is_intake_active` in the existing configuration. Locking blocks submissions through the existing intake guard; unlocking continues to respect application dates.
- The public Vacancies card refreshes availability on focus and every 30 seconds. No schema changes are required.
- Rollback: remove the control-center route, UI and PATCH endpoint; the current stored intake setting remains in effect.

## 2026-11-12 — TIMON documents stored on the server

- Root cause of admin document preview 500 (`requestId 908e6fcc…`): the applicant form recorded browser-only `bin-…` ids in `document_attachments`; `/api/binary/:id` passed them to a UUID column.
- `POST /api/pooling/documents` (authenticated, one file, PDF/JPG/PNG/WebP, 10 MB) stores uploads through the existing `upsertBinary` pipeline (compression + hash deduplication) and returns the UUID `binary_id` the form now saves.
- `/api/binary/:id` rejects non-UUID ids with 400 instead of querying PostgreSQL and returning 500.
- Admin preview/download shows a clear notice for legacy browser-only attachments. Applicants can restore them from the original browser with the new upload button on each legacy document (`POST /api/pooling/history/:id/documents/:docType`), which stores the file and repoints that owned application's attachment. Only `bin-…` entries can be relinked, so already-stored documents cannot be replaced through this route. The read-only banner offers **Restore all**, and opening the submission's Document Uploads tab uploads browser-only files automatically once per application, then confirms how many were sent.
- Rollback: revert the form to local storage and remove the routes; stored binaries remain in `unified_binaries` and no schema change was made.

## 2026-11-12 — Withdrawal permanently deletes without history (supersedes receipt retention)

- Withdrawal deletes the owned submitted application and its linked NSC scores atomically. No receipt is written; applicant history and admin lists contain no withdrawn application.
- The history card is removed on success. Confirmation explicitly states that no history remains and deletion cannot be undone.
- Migration `database/migrations/20261112_035_remove_withdrawal_history.sql` drops the withdrawal receipt table and deletes legacy withdrawn application rows/scores. Deploy the updated repository and UI before applying it. Other applications and shared binary storage are unaffected.
- Rollback requires a pre-migration backup of the receipt table and any affected applications/scores, followed by the previous code; deleted data cannot be reconstructed.

## 2026-11-12 — Withdrawal retains history only

- Withdrawal now archives a minimal receipt and deletes the application and dependent NSC scores in one locked transaction. Answers, attachment references and evaluations are deleted with the application; shared binary storage is not deleted by this operation.
- History combines applications with archived receipts. Withdrawn receipts show a withdrawal date and have no detail link; deleted application detail URLs return 404.
- Required migration: `database/migrations/20261112_034_archive_withdrawn_applications.sql`. It also converts existing withdrawn rows to receipts. Back up before deployment: deleted details cannot be restored from receipts. Rollback requires restoring the backup before dropping the receipt table.

## 2026-11-12 — Application withdrawal

- Application History offers a named confirmation to withdraw submitted applications.
- Authenticated `POST /api/pooling/history/:id/withdraw` checks ownership and atomically changes only submitted records to `withdrawn`, retaining their contents and updating `updated_at`.
- Withdrawn applications remain readable in history; existing duplicate-submission rules already exclude withdrawn records.
- The admin TIMON Applications list and pagination totals exclude withdrawn applications.

## 2026-11-09 — NexusGate & Git Configuration: Disable Vacancies Card in Staging and Ignore Env/Migrations

### Requirement & User Directive
> "i am in the staging disable this card Vacancies OPEN POSITIONS & OPPORTUNITIES / add in the git ignore the migration and env"

### Root Cause
1. **Vacancies Card Navigating to Applications ([`NexusGate.jsx`](file:///e:/christop/staging/ui/src/pages/NexusGate.jsx))**: On the landing page, `handleLockedVacanciesClick` navigated users to `/timon-applications` (or `/login`) instead of locking the Vacancies card in staging.
2. **Environment & Migration Files Not Ignored ([`.gitignore`](file:///e:/christop/staging/.gitignore))**: `.env_staging`, `.env_*`, `database/migrations/`, and `database/backups/` were not listed in `.gitignore`.

### Architectural & UI Fixes
1. **Disable/Lock Vacancies Card ([`NexusGate.jsx`](file:///e:/christop/staging/ui/src/pages/NexusGate.jsx))**:
   - Updated `handleLockedVacanciesClick` to display the `"Vacancies Portal Locked"` SweetAlert modal (`Swal.fire`) instead of navigating.
   - Displayed the `LOCKED` badge pill (`FiLock`) and restored the card labels (`RECRUITMENT`, `Vacancies`, `OPEN POSITIONS & OPPORTUNITIES`).
2. **Git Ignore Rules ([`.gitignore`](file:///e:/christop/staging/.gitignore))**:
   - Added `.env.*`, `.env_*`, `!.env.example`, `.env_staging`, `database/migrations/`, and `database/backups/` to `.gitignore`.

---

## 2026-08-12 — Notable Achievements JSONB Column Migration

### Architectural Change & Database Migration
- **Converted `notable_achievements` Column to `JSONB`**:
  - Applied migration `20260812_014_convert_notable_achievements_to_jsonb.sql` converting `notable_achievements` column in `third_level_official_masterlist` and `third_level_officials_profiling_application` to native PostgreSQL `JSONB` array of objects `[{ title: '...', year: '...' }]`.
  - Dropped redundant `notable_achievements_year` column to eliminate duplicate data and ensure guaranteed atomic binding between award title and year received.
- **Backend Controller (`thirdLevelController.js`)**:
  - Registered `notable_achievements` in `JSONB_FIELDS` set for automatic `JSON.stringify` handling on updates and application approvals.
  - Added object-based year validation inside `validateYear` loop.
- **Frontend Page (`OfficialProfiling.jsx`)**:
  - Updated profile state, `lookupByEmail` parser, Achievements tab multi-layer editor, Summary preview tab renderer, and CSV exporter to seamlessly read and write `notable_achievements` as a `JSONB` array of `{ title, year }` objects.

---

## 2026-08-07 — NexusGate Landing Page Redesign & Records Management Admin Access

### Design & Feature Updates
- **Records Management Admin Access Bar ([`NexusGate.jsx`](file:///e:/christop/staging/ui/src/pages/NexusGate.jsx), [`NexusGate.css`](file:///e:/christop/staging/ui/src/pages/NexusGate.css))**:
  - Implemented the dark navy pill capsule bar with golden border (`#FCD116`), yellow shield circle icon, bold white italic "Records Management" text, "ADMIN ACCESS" gold badge, and hover right arrow (`→`).
  - Positioned directly below the top logos in the hero section to provide clear, elegant, and immediate access to Admin Records Management login.
- **Subtle Soft Watermark Refinement**:
  - Reduced government building watermark opacity to a soft `0.20` (`color: #FBBF24`), using refined `2px`/`1.5px` stroke lines and `fill-opacity="0.1"`.
- **Position Swap Animation Restored**:
  - Re-integrated `isSwapped` state and Framer Motion `AnimatePresence` layout transitions.

---

## 2026-08-07 — Official Approval & Rejection Email Notifications

### Feature
Added automated professional email notifications when an official's registration or application is approved or rejected in the `OfficialsRegistry` page (`/officials-registry?status=For%20Approval`, "Pending Approvals" tab).

### Components Added/Updated
- **`api/src/services/emailService.js`**: Created modular HTML email service using `nodemailer` (GMail SMTP transporter). Provides `sendOfficialApprovalEmail` and `sendOfficialRejectionEmail` with executive Department of Education branding.
- **`api/src/controllers/thirdLevelController.js`**:
  - Updated `processRegistration` and `processApplication` endpoints to fetch applicant/official details.
  - Automatically sends an approval or rejection email to the official's email address upon successful transaction commit.
- **`ui/src/pages/OfficialsRegistry.jsx`**:
  - `handleRegistrationAction` & `handleProcessApplication`: Prompts admin for rejection reason when clicking the Reject (X) button, and displays feedback when an email notification is dispatched.

---

## 2026-08-07 — Soft-Delete Pattern for Child Tables

### Context
The `MASTER TINKERER SENTINEL` database trigger prohibits physical `DELETE` operations on all child relational tables. Previously, orphaned rows (caused by id-less payloads) triggered `DELETE` attempts that the Sentinel blocked, producing console warnings on every save.

### Change: `delete_flg` Soft-Delete Column

**Migration:** `20260807_011_add_delete_flg_to_child_tables.sql`

Added `delete_flg VARCHAR(3) NOT NULL DEFAULT 'No' CHECK (delete_flg IN ('Yes', 'No'))` to:
- `tlo_accomplishment_records`
- `tlo_eligibility_records`
- `tlo_position_history`
- `tlo_training_records`
- `tlo_other_courses`

### Behavior Rules
- **Active records:** `delete_flg = 'No'` (default for all new inserts)
- **Deleted records:** `delete_flg = 'Yes'` (set on sync when row is omitted from incoming payload)
- **Fetch queries:** always filter `AND delete_flg = 'No'`
- **Sync queries:** orphaned IDs receive `UPDATE ... SET delete_flg = 'Yes'` instead of `DELETE`
- **Clone queries:** destination rows are soft-deleted before inserting copies from source
- **Physical DELETE:** never used in any repository (Sentinel-safe)

### Repositories Updated
- `tloAccomplishmentRepository.js` — also added resurrection logic (re-activates soft-deleted row if same description re-added)
- `tloEligibilityRepository.js`
- `tloPositionRepository.js`
- `tloTrainingRepository.js`
- `tloOtherCoursesRepository.js`

### Frontend (OfficialProfiling.jsx)
- `individual_accomplishments` — now loaded as `{ id, description, award_year }` objects (preserving DB row id)
- Render logic updated to handle both legacy plain strings and new `{ id, description }` objects
- id is preserved through edits so save round-trips use `UPDATE`, not `INSERT` + soft-delete

---

## Previous Changes (2026-08-07 earlier sessions)
- Fixed `getByEmail` to call `fetchAllChildRecords` for both masterlist and staging sources
- Removed "Record Not Found" blocking modal; auto-initializes profile
- Added `formatDateStr` helper for safe date parsing
- Fixed nested `<button>` hydration error in `NexusGate.jsx`
- Fixed React unique `key` props across all mapped lists in `OfficialProfiling.jsx`
- Fixed Documents tab checkmark (requires both PDS + Service Records, excludes `photo_binary_id`)
- Fixed Education tab checkmark (recognizes any degree data, not just all 3 fields)

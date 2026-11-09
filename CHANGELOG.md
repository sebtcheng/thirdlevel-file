# CHANGELOG

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

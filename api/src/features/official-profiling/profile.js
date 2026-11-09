import fs from 'fs';
import path from 'path';
import pool from '../../config/db.js';
import { upsertBinary } from '../../utils/binaryPipeline.js';
import { uploadToAzure } from '../../utils/azureBlobService.js';
import {
  fetchAllChildRecords,
  syncAllChildTables,
  resolveSourceTable
} from './tloProfileService.js';
import { ensureOicColumn, sanitizeOicPosition, cleanDesignationOrPosition, displayPositionTitle } from '../../utils/officialRules.js';

export const initializeProfile = async (req, res) => {
  const { email, first_name, last_name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query(
      'SELECT application_id, app_TLOid FROM third_level_officials_profiling_application WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    if (checkRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.json({ success: true, message: 'Record already initialized', TLOid: checkRes.rows[0].app_TLOid });
    }

    const countRes = await client.query('SELECT COUNT(*) FROM third_level_officials_profiling_application');
    const count = parseInt(countRes.rows[0].count) + 1;
    const appTloId = `APP-2026-${String(count).padStart(4, '0')}`;
    const normalizedEmailInit = email.toLowerCase().trim();

    let finalFirstName = first_name;
    let finalLastName = last_name;

    if (!finalFirstName || !finalLastName) {
      const masterCheck = await client.query('SELECT first_name, last_name FROM third_level_official_masterlist WHERE LOWER(email) = $1', [normalizedEmailInit]);
      if (masterCheck.rows.length > 0) {
        finalFirstName = finalFirstName || masterCheck.rows[0].first_name;
        finalLastName = finalLastName || masterCheck.rows[0].last_name;
      }
    }

    await client.query(`
      INSERT INTO third_level_officials_profiling_application (
          application_id, app_TLOid, first_name, last_name, email, application_status, created_at, updated_at
      ) VALUES (DEFAULT, $1, $2, $3, $4, NULL, NOW(), NOW())
    `, [appTloId, finalFirstName || '', finalLastName || '', normalizedEmailInit]);

    await client.query('COMMIT');
    res.json({ success: true, TLOid: appTloId });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: 'Initialization failed: ' + err.message });
  } finally {
    if (client) client.release();
  }
};

export const getByEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email query param required' });
  try {
    const masterRes = await pool.query(`
      SELECT * FROM third_level_official_masterlist
      WHERE LOWER(email) = LOWER($1) AND status != 'Inactive'
      LIMIT 1
    `, [email]);

    if (masterRes.rows.length > 0) {
      const row = masterRes.rows[0];
      const normalized = sanitizeOicPosition(row.position_title, row.is_oic);
      row.position_title = normalized.position_title;
      row.is_oic = normalized.is_oic;
      if (Array.isArray(row.eligibilities)) {
        row.eligibilities = row.eligibilities.map(e => {
          if (typeof e === 'string') return { eligibility: e.toUpperCase(), date: null, rating: null, place_of_assignment: null };
          return e;
        });
      }

      let childRecords = {};
      try {
        const tloId = row.TLOid;
        if (tloId) {
          childRecords = await fetchAllChildRecords(pool, 'masterlist', tloId);
        }
      } catch (childErr) {
        console.warn('[getByEmail] Child records fetch skipped for masterlist:', childErr.message);
      }

      return res.json({ success: true, data: { ...row, ...childRecords }, source: 'masterlist' });
    }

    const stagingRes = await pool.query(`
      SELECT *, app_TLOid AS "TLOid" FROM third_level_officials_profiling_application
      WHERE LOWER(email) = LOWER($1) AND application_status IS DISTINCT FROM 'approved'
      ORDER BY created_at DESC LIMIT 1
    `, [email]);

    if (stagingRes.rows.length > 0) {
      const row = stagingRes.rows[0];
      const normalized = sanitizeOicPosition(row.position_title, row.is_oic);
      row.position_title = normalized.position_title;
      row.is_oic = normalized.is_oic;
      if (Array.isArray(row.eligibilities)) {
        row.eligibilities = row.eligibilities.map(e => {
          if (typeof e === 'string') return { eligibility: e.toUpperCase(), date: null, rating: null, place_of_assignment: null };
          return e;
        });
      }

      let childRecords = {};
      try {
        const tloId = row.TLOid || row.app_TLOid;
        if (tloId) {
          childRecords = await fetchAllChildRecords(pool, 'staging', tloId);
        }
      } catch (childErr) {
        console.warn('[getByEmail] Child records fetch skipped for staging:', childErr.message);
      }

      return res.json({ success: true, data: { ...row, ...childRecords }, source: 'staging' });
    }

    return res.json({ success: false, data: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadDocument = async (req, res) => {
  const { TLOid, docType } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  console.log(`[Upload] Start ${docType} for ${TLOid}`);
  const isMasterlist = !TLOid.startsWith('APP-') && !(TLOid.startsWith('TLO-') && TLOid.split('-').length > 2);
  const client = await pool.connect();
  console.log(`[Upload] DB connected`);
  try {
    await client.query('BEGIN');
    let processedBuffer = req.file.buffer;
    let mimeType = req.file.mimetype;
    console.log(`[Upload] File received: size=${processedBuffer.length}, type=${mimeType}`);

    console.log(`[Upload] Calling upsertBinary...`);
    const { binary_id } = await upsertBinary(client, processedBuffer, mimeType, processedBuffer.length);
    console.log(`[Upload] upsertBinary finished with ID: ${binary_id}`);

    const docMap = {
      'photo': 'photo_binary_id',
      'pds': 'pds_binary_id',
      'profile_word': 'profile_word_binary_id',
      'profile_ppt': 'profile_ppt_binary_id',
      'service_records': 'service_records_binary_id',
      'sandiganbayan_clearance': 'sandiganbayan_clearance_binary_id',
      'nbi_clearance': 'nbi_clearance_binary_id',
      'csc_clearance': 'csc_clearance_binary_id',
      'ombudsman_clearance': 'ombudsman_clearance_binary_id',
      'executive_summary': 'executive_summary_binary_id',
      'reassignment_order': 'reassignment_order_binary_id'
    };

    const columnName = docMap[docType];
    if (!columnName) throw new Error('Invalid document type');

    if (isMasterlist) {
      await client.query(
        `UPDATE third_level_official_masterlist SET ${columnName} = $1, updated_at = NOW() WHERE "TLOid" = $2`,
        [binary_id, TLOid]
      );
    } else {
      await client.query(
        `UPDATE third_level_officials_profiling_application SET ${columnName} = $1, updated_at = NOW() WHERE app_TLOid = $2`,
        [binary_id, TLOid]
      );
    }

    await client.query('COMMIT');

    // 1. Save file to local folder path on disk
    let localFolderPath = null;
    try {
      const pad = (n) => n.toString().padStart(2, '0');
      const now = new Date();
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const ext = path.extname(req.file.originalname) || (mimeType === 'application/pdf' ? '.pdf' : '');
      const filename = `${docType}_${TLOid}_${timestamp}${ext}`;

      const folderRelative = path.join('uploads', TLOid, docType);
      const folderAbsolute = path.join(process.cwd(), folderRelative);
      if (!fs.existsSync(folderAbsolute)) {
        fs.mkdirSync(folderAbsolute, { recursive: true });
      }
      const fileAbsolute = path.join(folderAbsolute, filename);
      fs.writeFileSync(fileAbsolute, req.file.buffer);
      localFolderPath = `/uploads/${TLOid}/${docType}/${filename}`;
      console.log(`[Upload] File saved to folder path: ${localFolderPath}`);
    } catch (fsErr) {
      console.warn(`[Upload] Local folder path write skipped/failed: ${fsErr.message}`);
    }

    // 2. Azure Blob Storage Upload
    let azureData = null;
    let finalBlobUrlOrPath = localFolderPath;
    try {
      console.log(`[Upload] Calling uploadToAzure...`);
      azureData = await uploadToAzure(
        req.file.buffer,
        req.file.originalname,
        mimeType,
        TLOid,
        docType
      );
      if (azureData && (azureData.blobUrl || azureData.url)) {
        finalBlobUrlOrPath = azureData.blobUrl || azureData.url;
      }
      console.log(`[Upload] Azure upload successful: ${azureData.filename}`);
    } catch (azureErr) {
      console.error(`[Upload] Azure upload skipped/failed: ${azureErr.message}`);
    }

    // 3. Update database record in unified_binaries with folder path or Azure Blob URL
    if (finalBlobUrlOrPath) {
      await pool.query('UPDATE unified_binaries SET azure_blob_url = $1 WHERE id = $2', [finalBlobUrlOrPath, binary_id]);
    }

    res.json({
      success: true,
      binary_id,
      filePath: localFolderPath,
      blobUrl: azureData?.blobUrl || null,
      message: `${docType} uploaded successfully`,
      ...(azureData || {})
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const getProfile = async (req, res) => {
  const { TLOid } = req.params;
  const isMasterlist = !TLOid.startsWith('APP-') && !(TLOid.startsWith('TLO-') && TLOid.split('-').length > 2);
  try {
    await ensureOicColumn();
    let result;
    if (isMasterlist) {
      result = await pool.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [TLOid]);
    } else {
      result = await pool.query('SELECT *, app_TLOid AS "TLOid" FROM third_level_officials_profiling_application WHERE app_TLOid = $1', [TLOid]);
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const row = result.rows[0];
    const normalized = sanitizeOicPosition(row.position_title, row.is_oic);
    row.position_title = normalized.position_title;
    row.is_oic = normalized.is_oic;

    // Phase 3: Fetch normalized child table records (additive — existing fields untouched)
    // Frontend fallback chain: relational → JSONB → legacy text
    let childRecords = {};
    try {
      const sourceTable = resolveSourceTable(TLOid);
      childRecords = await fetchAllChildRecords(pool, sourceTable, TLOid);
    } catch (childErr) {
      // Graceful degradation: if relational tables not yet available, return empty arrays
      console.warn('[getProfile] Child records fetch skipped:', childErr.message);
      childRecords = {
        education_records: [],
        eligibility_records: [],
        position_history: [],
        training_records: [],
        accomplishment_records: [],
        other_course_records: []
      };
    }

    res.json({ success: true, data: { ...row, ...childRecords } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  const { TLOid } = req.params;
  const isMasterlist = !TLOid.startsWith('APP-') && !(TLOid.startsWith('TLO-') && TLOid.split('-').length > 2);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureOicColumn(client);

    if (req.body.position_title) {
      const normalizedPosition = sanitizeOicPosition(req.body.position_title, req.body.is_oic);
      req.body.position_title = normalizedPosition.position_title;
      req.body.is_oic = normalizedPosition.is_oic;
    }

    const validateYear = (yr, max) => {
      if (!yr) return;
      const num = parseInt(yr, 10);
      if (isNaN(num) || num > max) throw new Error(`Year ${yr} cannot be greater than ${max}`);
    };
    const currentYear = new Date().getFullYear();

    validateYear(req.body.performance_rating_1_period, currentYear);
    validateYear(req.body.performance_rating_2_period, currentYear);
    validateYear(req.body.performance_rating_3_period, currentYear);
    validateYear(req.body.cespes_rating_1_period, currentYear);
    validateYear(req.body.cespes_rating_2_period, currentYear);
    if (Array.isArray(req.body.notable_achievements)) {
      req.body.notable_achievements.forEach(ach => {
        if (ach && ach.year) validateYear(ach.year, currentYear);
      });
    }
    validateYear(req.body.bachelor_year, currentYear);
    validateYear(req.body.master_year, currentYear);
    validateYear(req.body.doctorate_year, currentYear);

    if (req.body.bachelor_year && req.body.master_year && parseInt(req.body.master_year) <= parseInt(req.body.bachelor_year)) {
      throw new Error("Master's year must be greater than Bachelor's year");
    }
    if (req.body.master_year && req.body.doctorate_year && parseInt(req.body.doctorate_year) <= parseInt(req.body.master_year)) {
      throw new Error("Doctorate year must be greater than Master's year");
    }

    const currentMonth = new Date().toISOString().substring(0, 7);

    if (req.body.performance_rating_1_period && req.body.performance_rating_1_period > currentMonth) throw new Error("Latest Performance Rating period cannot be in the future");
    if (req.body.performance_rating_2_period && req.body.performance_rating_2_period > currentMonth) throw new Error("Previous Performance Rating period cannot be in the future");
    if (req.body.performance_rating_3_period && req.body.performance_rating_3_period > currentMonth) throw new Error("Oldest Performance Rating period cannot be in the future");
    if (req.body.cespes_rating_1_period && req.body.cespes_rating_1_period > currentMonth) throw new Error("CESPES 1st Semester period cannot be in the future");
    if (req.body.cespes_rating_2_period && req.body.cespes_rating_2_period > currentMonth) throw new Error("CESPES 2nd Semester period cannot be in the future");

    if (req.body.performance_rating_3_period && req.body.performance_rating_2_period && req.body.performance_rating_2_period < req.body.performance_rating_3_period) {
      throw new Error("Previous rating period must be >= Oldest rating period");
    }
    if (req.body.performance_rating_2_period && req.body.performance_rating_1_period && req.body.performance_rating_1_period < req.body.performance_rating_2_period) {
      throw new Error("Latest rating period must be >= Previous rating period");
    }
    if (req.body.cespes_rating_1_period && req.body.cespes_rating_2_period && req.body.cespes_rating_2_period < req.body.cespes_rating_1_period) {
      throw new Error("CESPES 2nd sem period must be >= 1st sem period");
    }

    const bacY = (req.body.bachelor_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));
    const masY = (req.body.master_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));
    const docY = (req.body.doctorate_year || '').split('\n').map(y => parseInt(y)).filter(y => !isNaN(y));

    const maxBac = bacY.length > 0 ? Math.max(...bacY) : 0;
    const maxMas = masY.length > 0 ? Math.max(...masY) : 0;

    if (maxBac > 0 && masY.some(m => m <= maxBac)) {
      throw new Error("Master's Degree year must be strictly greater than Bachelor's Degree year.");
    }
    if (maxMas > 0 && docY.some(d => d <= maxMas)) {
      throw new Error("Doctorate year must be strictly greater than Master's Degree year.");
    }

    if (req.body.previous_positions && Array.isArray(req.body.previous_positions)) {
      req.body.previous_positions.forEach(p => {
        if (p.start_date && p.end_date && new Date(p.end_date) <= new Date(p.start_date)) {
          throw new Error("End date must be after start date for previous positions");
        }
      });
    }
    if (req.body.relevant_trainings && Array.isArray(req.body.relevant_trainings)) {
      req.body.relevant_trainings = req.body.relevant_trainings.map(t => {
        if (t.training_name) t.training_name = t.training_name.toUpperCase();
        if (t.date_from && t.date_to && new Date(t.date_to) <= new Date(t.date_from)) {
          throw new Error("End date must be after start date for trainings");
        }
        return t;
      });
    }

    // Validate date ranges
    const validateDateRange = (from, to, context) => {
      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        if (toDate < fromDate) {
          throw new Error(`Invalid date range in ${context}: TO date cannot be before FROM date.`);
        }
      }
    };

    if (Array.isArray(req.body.previous_positions)) {
      req.body.previous_positions.forEach((p, idx) => {
        validateDateRange(p.start_date, p.end_date, `Previous Position ${idx + 1}`);
        if (Array.isArray(p.oic_positions)) {
          p.oic_positions.forEach((oic, oicIdx) => {
            validateDateRange(oic.oic_start_date, oic.oic_end_date, `Previous Position ${idx + 1} (OIC ${oicIdx + 1})`);
          });
        }
      });
    }

    if (Array.isArray(req.body.relevant_trainings)) {
      req.body.relevant_trainings.forEach((t, idx) => {
        validateDateRange(t.date_from, t.date_to, `Training ${idx + 1}`);
      });
    }

    if (Array.isArray(req.body.other_courses)) {
      req.body.other_courses.forEach((c, idx) => {
        validateDateRange(c.date_from, c.date_to, `Other Course ${idx + 1}`);
      });
    }

    const allFields = [
      'strand', 'region', 'division', 'office', 'email', 'alt_email_1', 'alt_email_2', 'contact_details', 'alt_contact_details_1', 'alt_contact_details_2',
      'last_name', 'first_name', 'middle_name', 'suffix', 'gender', 'date_of_birth', 'civil_status',
      'position_title', 'designation', 'appointment_date', 'emt_passer', 'emt_date', 'ces_stage', 'ces_conferment_date', 'age',
      'total_years_third_level', 'managerial_experience_total', 'permanent_address', 'temporary_address',
      'notable_achievements', 'total_training_hours',
      'performance_rating_1', 'performance_rating_1_period', 'performance_rating_2', 'performance_rating_2_period', 'performance_rating_3', 'performance_rating_3_period',
      'cespes_1_rating', 'cespes_2_rating', 'cespes_rating_1_period', 'cespes_rating_2_period',
      'performance_rating_ipcrf', 'performance_rating_cespes',
      'is_oic', 'unique_number', 'employment_status',
      'photo_binary_id', 'pds_binary_id', 'profile_word_binary_id', 'profile_ppt_binary_id', 'service_records_binary_id',
      'sandiganbayan_clearance_binary_id', 'nbi_clearance_binary_id', 'csc_clearance_binary_id', 'ombudsman_clearance_binary_id', 'executive_summary_binary_id',
      'pending_admin_case', 'guilty_admin_details', 'criminally_charged_details', 'convicted_crime_details', 'dpa_consented_at', 'profiling_status', 'target_TLOid', 'application_status', 'position_applied_for'
    ];

    const JSONB_FIELDS = new Set(['notable_achievements']);
    const updates = [];
    const values = [];

    const table = isMasterlist ? 'third_level_official_masterlist' : 'third_level_officials_profiling_application';
    const idCol = isMasterlist ? '"TLOid"' : 'app_TLOid';

    const colsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    const validCols = new Set(colsRes.rows.map(r => r.column_name.toLowerCase()));

    const DO_NOT_UPPERCASE = new Set([
      'email', 'alt_email_1', 'alt_email_2', 'contact_details', 'alt_contact_details_1', 'alt_contact_details_2',
      'password', 'password_hash', 'photo_binary_id', 'pds_binary_id', 'profile_word_binary_id', 'profile_ppt_binary_id', 'service_records_binary_id',
      'sandiganbayan_clearance_binary_id', 'nbi_clearance_binary_id', 'csc_clearance_binary_id', 'ombudsman_clearance_binary_id', 'executive_summary_binary_id',
      'target_tloid', 'application_status', 'profiling_status', 'designation', 'suffix'
    ]);

    const toUpper = (val) => {
      if (typeof val === 'string') return val.toUpperCase();
      return val;
    };

    allFields.forEach(f => {
      if (req.body[f] !== undefined && validCols.has(f.toLowerCase())) {
        let val = req.body[f] === '' ? null : req.body[f];

        if (f === 'suffix') {
          if (val === null || val === undefined || val === '') {
            val = null;
          } else if (typeof val === 'string') {
            const s = val.trim().toLowerCase();
            if (['not applicable', 'not apllicable', 'na', 'n/a', 'none'].includes(s) || s === '') {
              val = null;
            } else {
              val = val.trim();
            }
          }
        }

        if (f === 'designation' && typeof val === 'string') {
          val = cleanDesignationOrPosition(val);
        }

        if (f === 'eligibilities' && Array.isArray(val)) {
          val = val.map(e => {
            if (typeof e === 'string') return { eligibility: e.toUpperCase(), date: null, rating: null, place_of_assignment: null };
            return {
              ...e,
              eligibility: e.eligibility ? e.eligibility.toUpperCase() : e.title ? e.title.toUpperCase() : null,
              place_of_assignment: e.place_of_assignment ? e.place_of_assignment.toUpperCase() : null
            };
          });
        }
        if (f === 'relevant_trainings' && Array.isArray(val)) {
          val = val.map(t => ({
            ...t,
            training_name: t.training_name ? t.training_name.toUpperCase() : null
          }));
        }
        if (f === 'previous_positions' && Array.isArray(val)) {
          val = val.map(p => ({
            ...p,
            position_name: p.position_name ? p.position_name.toUpperCase() : null
          }));
        }

        if (f === 'education_degrees' && Array.isArray(val)) {
          val = val.map(ed => ({
            ...ed,
            highest_education: ed.highest_education ? ed.highest_education.toUpperCase() : null,
            specific_degree: ed.specific_degree ? ed.specific_degree.toUpperCase() : null,
            education_program: ed.education_program ? ed.education_program.toUpperCase() : null,
            education_year_graduated: ed.education_year_graduated ? ed.education_year_graduated.toUpperCase() : null
          }));
        }

        if (JSONB_FIELDS.has(f) && val !== null && typeof val !== 'string') {
          val = JSON.stringify(val);
        } else if (val !== null && typeof val === 'string' && !DO_NOT_UPPERCASE.has(f.toLowerCase())) {
          val = toUpper(val);
        }
        values.push(val);
        updates.push(`"${f}" = $${values.length}`);
      }
    });

    if (req.body.target_TLOid && !isMasterlist && validCols.has('application_status')) {
      updates.push(`application_status = 'applied'`);
      updates.push(`submitted_at = NOW()`);
    }

    if (updates.length > 0) {
      values.push(new Date(), TLOid);

      if (isMasterlist && req.user?.email) {
        await client.query(`SET LOCAL "app.current_user" = '${req.user.email.replace(/'/g, "''")}'`);
      }

      console.log('[updateProfile] Running UPDATE query:', {
        table,
        updates,
        education_degrees: req.body.education_degrees,
        valuesCount: values.length
      });

      await client.query(
        `UPDATE ${table} SET ${updates.join(', ')}, updated_at = $${values.length - 1} WHERE ${idCol} = $${values.length}`,
        values
      );
    }

    // Phase 3: Dual-write to normalized child tables (inside existing transaction)
    // Existing JSONB columns are still written above. This adds relational sync.
    const sourceTable = resolveSourceTable(TLOid);
    const updatedBy = req.user?.email || null;
    await syncAllChildTables(client, sourceTable, TLOid, req.body, updatedBy);

    // ── Phase 4: Assignment & Position History Tracking ──────────────────────
    // When saving profile in Official Profiling, track changes to:
    // Region, Division, Position Title, Designation
    // If changed:
    // 1. Archive previous position into tlo_position_history (status = 'Inactive')
    // 2. Mark previous assignment in tlo_assignments as Inactive (end_date = today)
    // 3. Insert new active assignment in tlo_assignments with updated values (status = 'Active')
    if (isMasterlist) {
      const sp_assign = 'sp_assignment_tracking';
      try {
        await client.query(`SAVEPOINT ${sp_assign}`);

        const norm = (v) => (v === null || v === undefined || v === '') ? '' : String(v).trim().toUpperCase();
        const incomingPosTitle = norm(req.body.position_title);
        const incomingDesig    = norm(req.body.designation);
        const incomingRegion   = norm(req.body.region);
        const incomingDivision = norm(req.body.division);
        const incomingOffice   = req.body.office ? req.body.office.trim() : null;
        const incomingStrand   = req.body.strand ? req.body.strand.trim() : null;
        const incomingIsOic    = Boolean(req.body.is_oic || (req.body.designation && req.body.designation.toUpperCase().includes('OIC')));

        if (incomingPosTitle || incomingDesig || incomingRegion || incomingDivision) {
          // Identify the single authoritative current active assignment for this item_number
          const curAssignRes = await client.query(
            `SELECT a.id, a.personnel_id, a.item_number, a.position_title,
                    a.designation, a.region, a.division, a.office, a.strand,
                    a.status, a.start_date, a.end_date, a.assignment_type, a.oic
             FROM tlo_assignments a
             WHERE a.item_number = $1
               AND a.status = 'Active'
             ORDER BY CASE WHEN a.assignment_type = 'Concurrent' THEN 2 ELSE 1 END, a.id DESC
             LIMIT 1`,
            [TLOid]
          );

          if (curAssignRes.rows.length === 0) {
            // No active assignment exists in ledger — resolve personnel_id and insert initial active row
            const pRes = await client.query(
              `SELECT id FROM tlo_personnel WHERE legacy_tlo_id = $1 ORDER BY id ASC LIMIT 1`,
              [TLOid]
            );
            const initialPersonId = pRes.rows[0]?.id || null;

            if (initialPersonId) {
              await client.query(
                `INSERT INTO tlo_assignments (
                   personnel_id, item_number, region, division, office, strand,
                   position_title, designation, assignment_type, status, oic,
                   start_date, end_date, remarks, created_by, updated_by,
                   created_at, updated_at
                 ) VALUES (
                   $1, $2, $3, $4, $5, $6,
                   $7, $8, $9, 'Active', $10,
                   NOW(), NULL, 'Initial assignment on profile save', $11, $11,
                   NOW(), NOW()
                 )`,
                [
                  initialPersonId,
                  TLOid,
                  req.body.region || null,
                  req.body.division || null,
                  incomingOffice,
                  incomingStrand,
                  req.body.position_title || null,
                  req.body.designation || null,
                  incomingIsOic ? 'OIC' : 'Permanent',
                  incomingIsOic,
                  updatedBy
                ]
              );
            }
          } else {
            const cur = curAssignRes.rows[0];

            // Change detection: did any of the 4 primary assignment fields change?
            const hasAssignmentChanged = (
              (incomingPosTitle && incomingPosTitle !== norm(cur.position_title)) ||
              (incomingDesig && incomingDesig !== norm(cur.designation)) ||
              (incomingRegion && incomingRegion !== norm(cur.region)) ||
              (incomingDivision && incomingDivision !== norm(cur.division))
            );

            if (hasAssignmentChanged) {
              const nowStr = new Date().toISOString().split('T')[0];
              const oldStartDate = cur.start_date ? new Date(cur.start_date).toISOString().split('T')[0] : null;
              const oldEndDate = nowStr;
              const newStartDate = nowStr;

              // Step 1: Archive previous position into tlo_position_history
              const prevPositionTitle = cur.position_title || req.body.position_title || '';
              const prevDesignation = cur.designation || null;
              const prevRegion = cur.region || null;
              const prevDivision = cur.division || null;
              const prevOffice = cur.office || null;
              const prevStrand = cur.strand || null;
              const prevOic = Boolean(cur.oic || (cur.designation && cur.designation.toUpperCase().includes('OIC')));

              await client.query(
                `INSERT INTO tlo_position_history (
                   source_table, tlo_id, position_name, designation,
                   region, division, office, strand,
                   inclusive_date_start, inclusive_date_end,
                   status, oic, delete_flg, created_at, updated_at, created_by, updated_by
                 ) VALUES (
                   'masterlist', $1, $2, $3,
                   $4, $5, $6, $7,
                   $8, $9,
                   'Inactive', $10, 'No', NOW(), NOW(), $11, $11
                 )`,
                [
                  TLOid,
                  prevPositionTitle,
                  prevDesignation,
                  prevRegion,
                  prevDivision,
                  prevOffice,
                  prevStrand,
                  oldStartDate,
                  oldEndDate,
                  prevOic,
                  updatedBy
                ]
              );

              // Step 2: Transition previous assignment in tlo_assignments to Inactive
              await client.query(
                `UPDATE tlo_assignments
                 SET status = 'Inactive', end_date = $1, updated_at = NOW(), updated_by = $2
                 WHERE id = $3`,
                [oldEndDate, updatedBy, cur.id]
              );

              // Step 3: Insert new current assignment in tlo_assignments with updated values
              const newAssignedType = incomingIsOic ? 'OIC' : (cur.assignment_type === 'Concurrent' ? 'Concurrent' : 'Permanent');

              await client.query(
                `INSERT INTO tlo_assignments (
                   personnel_id, item_number, region, division, office, strand,
                   position_title, designation, assignment_type, status, oic,
                   start_date, end_date, remarks, created_by, updated_by,
                   created_at, updated_at
                 ) VALUES (
                   $1, $2, $3, $4, $5, $6,
                   $7, $8, $9, 'Active', $10,
                   $11, NULL, 'Updated via Official Profiling', $12, $12,
                   NOW(), NOW()
                 )`,
                [
                  cur.personnel_id, // SAME personnel_id as mother assignment!
                  cur.item_number || TLOid,
                  req.body.region || cur.region,
                  req.body.division || cur.division,
                  incomingOffice || cur.office,
                  incomingStrand || cur.strand,
                  req.body.position_title || cur.position_title,
                  req.body.designation || cur.designation,
                  newAssignedType,
                  incomingIsOic,
                  newStartDate,
                  updatedBy
                ]
              );
            } else {
              // Secondary non-station fields update in-place if needed
              if (incomingOffice !== cur.office || incomingStrand !== cur.strand) {
                await client.query(
                  `UPDATE tlo_assignments
                   SET office = COALESCE($1, office), strand = COALESCE($2, strand),
                       updated_at = NOW(), updated_by = $3
                   WHERE id = $4`,
                  [incomingOffice, incomingStrand, updatedBy, cur.id]
                );
              }
            }
          }
        }
        await client.query(`RELEASE SAVEPOINT ${sp_assign}`);
      } catch (assignErr) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp_assign}`).catch(() => {});
        console.warn(`[updateProfile] Assignment tracking skipped: ${assignErr.message}`);
      }
    }

    await client.query('COMMIT');

    let childRecords = {};
    try {
      const sourceTable = resolveSourceTable(TLOid);
      childRecords = await fetchAllChildRecords(pool, sourceTable, TLOid);
    } catch (childErr) {
      console.warn('[updateProfile] Child records fetch skipped on response:', childErr.message);
    }

    res.json({ success: true, data: { ...childRecords } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const submitApplication = async (req, res) => {
  const { target_TLOid, applied_position, target_region, questionnaire_responses } = req.body;
  const userEmail = req.user.email;

  if (!userEmail) return res.status(401).json({ error: 'Authentication error' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE third_level_officials_profiling_application
      SET application_status = 'applied',
          "target_TLOid" = $1,
          applied_position = COALESCE($3, applied_position),
          target_region = COALESCE($4, target_region),
          questionnaire_responses = COALESCE($5, questionnaire_responses),
          submitted_at = NOW(),
          submission_timestamp = NOW(),
          updated_at = NOW()
      WHERE LOWER(email) = LOWER($2) AND application_status IS DISTINCT FROM 'approved'
    `, [
      target_TLOid || null,
      userEmail,
      applied_position || null,
      target_region || null,
      questionnaire_responses ? JSON.stringify(questionnaire_responses) : null
    ]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active profiling record found. Please initialize your profile first.' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
};

export const getCareerPath = async (req, res) => {
  const { TLOid } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        u.position_title,
        u.office,
        u.updated_at,
        (
          SELECT CONCAT(prev.first_name, ' ', prev.last_name)
          FROM third_level_officials_updates prev
          WHERE prev.position_title = u.position_title
            AND prev."TLOid" != $1
          ORDER BY prev.updated_at DESC
          LIMIT 1
        ) AS previous_incumbent
      FROM (
        SELECT DISTINCT ON (position_title) position_title, office, updated_at
        FROM third_level_officials_updates
        WHERE "TLOid" = $1 AND position_title IS NOT NULL
        ORDER BY position_title, updated_at DESC
      ) u
      ORDER BY u.updated_at DESC
    `, [TLOid]);
    res.json({ success: true, data: result.rows.map(row => ({ ...row, position_title: displayPositionTitle(row.position_title) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getNotableAchievements = async (req, res) => {
  try {
    const result = await pool.query('SELECT achievement FROM notable_achievements WHERE delete_flg = 0 ORDER BY index_number ASC');
    res.json({ success: true, data: result.rows.map(r => r.achievement) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

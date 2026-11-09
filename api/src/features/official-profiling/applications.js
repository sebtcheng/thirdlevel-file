import fs from 'fs';
import path from 'path';
import pool from '../../config/db.js';
import { findPositionLookups, runApplicationsQuery } from './repositories/applicationsRepository.js';
import { upsertBinary } from '../../utils/binaryPipeline.js';
import { uploadToAzure } from '../../utils/azureBlobService.js';
import {
  cloneChildTablesOnApproval
} from './tloProfileService.js';
import { sendOfficialApprovalEmail, sendOfficialRejectionEmail } from '../../services/emailService.js';
import { ensureOicColumn, THIRD_LEVEL_POSITIONS, displayPositionTitle, cleanDesignationOrPosition, STANDARD_DESIGNATIONS } from '../../utils/officialRules.js';

export const getPositions = async (req, res) => {
  try {
    const { posResult, desigResult, strandResult, regionResult, officeResult, divisionResult, regionDivisionResult } = await findPositionLookups();

    const deduplicate = (list) => {
      const map = new Map();
      list.forEach(item => {
        if (!item) return;
        const trimmed = String(item).trim();
        const up = trimmed.toUpperCase();
        const existing = map.get(up);
        if (!existing) {
          map.set(up, trimmed);
        } else if (existing === up && trimmed !== up) {
          map.set(up, trimmed); 
        }
      });
      return Array.from(map.values()).sort();
    };

    const deduplicateClean = (list) => {
      const map = new Map();
      list.forEach(item => {
        if (!item) return;
        const cleaned = cleanDesignationOrPosition(displayPositionTitle(item));
        if (cleaned) {
          const up = cleaned.toUpperCase();
          if (!map.has(up)) {
            map.set(up, cleaned);
          }
        }
      });
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    };

    const finalRegions = deduplicate(regionResult.rows.map(r => r.region));

    // Exclude region names and non-division office labels from divisions (except Central Office)
    const regionUpperSet = new Set(finalRegions.filter(r => r.toUpperCase() !== 'CENTRAL OFFICE').map(r => r.toUpperCase()));
    ['REGIONAL OFFICE', 'REGIONAL OFFICES', 'N/A', 'NONE', 'NOT APPLICABLE'].forEach(term => regionUpperSet.add(term));

    const isRegionOrOffice = (str) => {
      if (!str) return true;
      const up = String(str).trim().toUpperCase();
      if (up === 'CENTRAL OFFICE') return false;
      return regionUpperSet.has(up) || /^REGION\s+[0-9IVXLCDM\-\sA-Z]+$/i.test(up);
    };

    const finalDivisions = deduplicate([
      'Central Office',
      ...divisionResult.rows
        .map(r => r.division)
        .filter(d => !isRegionOrOffice(d))
    ]);

    const regionDivisionsMap = {};
    regionDivisionResult.rows.forEach(r => {
      const regionStr = String(r.region || '').trim();
      const divStr = String(r.division || '').trim();
      if (!divStr || isRegionOrOffice(divStr)) return;

      const upReg = regionStr.toUpperCase();
      const upDiv = divStr.toUpperCase();
      
      const bestReg = finalRegions.find(reg => reg.toUpperCase() === upReg) || regionStr;
      const bestDiv = finalDivisions.find(div => div.toUpperCase() === upDiv) || divStr;

      if (!regionDivisionsMap[bestReg]) {
        regionDivisionsMap[bestReg] = new Set();
      }
      regionDivisionsMap[bestReg].add(bestDiv);
    });

    if (!regionDivisionsMap['Central Office'] || regionDivisionsMap['Central Office'].size === 0) {
      regionDivisionsMap['Central Office'] = new Set(['Central Office']);
    } else {
      regionDivisionsMap['Central Office'].add('Central Office');
    }

    Object.keys(regionDivisionsMap).forEach(k => {
      regionDivisionsMap[k] = Array.from(regionDivisionsMap[k]).sort();
    });

    const rawPositions = [...THIRD_LEVEL_POSITIONS, ...posResult.rows.map(r => r.position_title)];
    const rawDesignations = [...STANDARD_DESIGNATIONS, ...desigResult.rows.map(r => r.designation)];

    res.json({
      success: true,
      positions: deduplicateClean(rawPositions),
      designations: deduplicateClean(rawDesignations),
      strands: deduplicate(strandResult.rows.map(r => r.strand)),
      regions: finalRegions,
      offices: deduplicate(officeResult.rows.map(r => r.office)),
      divisions: finalDivisions,
      regionDivisions: regionDivisionsMap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVacancies = async (req, res) => {
  try {
    const { region, division, office, strand, search } = req.query;

    // A position is considered vacant when either:
    // (1) item_number exists in tlo_items with no matching assignment record at all, OR
    // (2) item_number exists in both tables and corresponding assignment has status = 'Vacant'.
    let query = `
      SELECT 
        i.item_number AS "TLOid",
        i.item_number,
        i.position_title,
        i.salary_grade,
        COALESCE(a.office, m.office, '') AS office,
        COALESCE(a.strand, m.strand, '') AS strand,
        COALESCE(a.region, m.region, '') AS region,
        COALESCE(a.division, m.division, '') AS division,
        'Vacant' AS status
      FROM tlo_items i
      LEFT JOIN (
        SELECT DISTINCT ON (item_number) *
        FROM tlo_assignments
        ORDER BY item_number, id DESC
      ) a ON a.item_number = i.item_number
      LEFT JOIN third_level_official_masterlist m ON m."TLOid" = i.item_number
      WHERE a.item_number IS NULL
         OR a.status = 'Vacant'
    `;

    const params = [];
    if (office && office !== 'All') {
      params.push(office);
      query += ` AND (COALESCE(a.office, m.office, '') = $${params.length})`;
    }
    if (region && region !== 'All') {
      params.push(region);
      query += ` AND (COALESCE(a.region, m.region, '') = $${params.length})`;
    }
    if (division && division !== 'All') {
      params.push(division);
      query += ` AND (COALESCE(a.division, m.division, '') = $${params.length})`;
    }

    query += ` ORDER BY i.item_number ASC`;

    const result = await runApplicationsQuery(query, params);
    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        position_title: displayPositionTitle(row.position_title)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getApplications = async (req, res) => {
  const allowedRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office', 'RO HRMO', 'SDO HRMO'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await ensureOicColumn();
    const { search, strand, position } = req.query;
    let query = `
      WITH ActivePositions AS (
        SELECT LOWER(email) as low_email, position_title, office
        FROM third_level_official_masterlist
        WHERE status = 'Active' AND email IS NOT NULL AND email != ''
      )
      SELECT 
        a.*, 
        COALESCE(NULLIF(a.first_name, ''), m.first_name) as first_name,
        COALESCE(NULLIF(a.last_name, ''), m.last_name) as last_name,
        a.app_TLOid AS "TLOid", 
        COALESCE(v.position_title, a.applied_position, a.position_applied_for) AS target_position, 
        COALESCE(v.office, a.target_region) AS target_office, 
        COALESCE(v.strand, a.target_region) AS target_strand,
        (
          SELECT string_agg(position_title || ' (' || COALESCE(office, '') || ')', ' | ') 
          FROM ActivePositions ap
          WHERE ap.low_email = LOWER(a.email)
        ) as concurrent_positions
      FROM third_level_officials_profiling_application a
      LEFT JOIN third_level_official_masterlist m ON LOWER(a.email) = LOWER(m.email)
      LEFT JOIN third_level_official_masterlist v ON a."target_TLOid" = v."TLOid"
      WHERE a.application_status = 'applied'
    `;
    const params = [];

    const userRole = req.user.role;
    const isRO = userRole === 'Regional Office' || userRole === 'RO_HRMO' || userRole === 'RO HRMO';
    const isSDO = userRole === 'School Division Office' || userRole === 'SDO_HRMO' || userRole === 'SDO HRMO';

    const targetRegion = req.user.assigned_region || req.user.region;
    const targetDivision = req.user.assigned_division || req.user.division;

    if (isRO && targetRegion) {
      params.push(targetRegion);
      query += ` AND (m.strand = $${params.length} OR a.target_region = $${params.length})`;
    }
    if (isSDO && targetRegion && targetDivision) {
      params.push(targetRegion);
      query += ` AND (m.strand = $${params.length} OR a.target_region = $${params.length})`;
      params.push(targetDivision);
      query += ` AND m.division = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR a.email ILIKE $${params.length} OR COALESCE(v.position_title, a.applied_position, a.position_applied_for) ILIKE $${params.length} OR COALESCE(v.office, a.target_region) ILIKE $${params.length} OR COALESCE(v.strand, a.target_region) ILIKE $${params.length})`;
    }
    if (strand && strand !== 'All') {
      params.push(strand);
      query += ` AND COALESCE(v.strand, a.target_region) = $${params.length}`;
    }
    if (position && position !== 'All') {
      params.push(position);
      query += ` AND COALESCE(v.position_title, a.applied_position, a.position_applied_for) = $${params.length}`;
    }

    query += ` ORDER BY a.submitted_at DESC`;

    const result = await runApplicationsQuery(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const processApplication = async (req, res) => {
  const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { app_TLOid, action, denial_reason } = req.body;
  if (!app_TLOid || !action) return res.status(400).json({ error: 'app_TLOid and action are required' });

  const client = await pool.connect();
  let applicantData = null;
  try {
    await client.query('BEGIN');
    await ensureOicColumn(client);

    const appRes = await client.query('SELECT * FROM third_level_officials_profiling_application WHERE app_TLOid = $1', [app_TLOid]);
    applicantData = appRes.rows[0];

    if (action === 'reject') {
      await client.query(`
        UPDATE third_level_officials_profiling_application 
        SET application_status = 'disapproved', denial_reason = $1, updated_at = NOW() 
        WHERE app_TLOid = $2
      `, [denial_reason || 'No reason provided', app_TLOid]);
    } else if (action === 'approve') {
      const applicant = applicantData;
      if (!applicant) throw new Error('Applicant not found');
      if (!applicant.target_TLOid) throw new Error('No target vacancy associated with this application');

      const masterlistColsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'third_level_official_masterlist'
      `);
      const masterlistCols = new Set(masterlistColsRes.rows.map(r => r.column_name.toLowerCase()));

      const JSONB_FIELDS = new Set(['previous_positions', 'relevant_trainings', 'notable_achievements']);
      const exclude = ['id', 'TLOid', 'created_at', 'updated_at', 'status', 'strand', 'office', 'position_title'];
      const columns = Object.keys(applicant).filter(k => {
        const lowerK = k.toLowerCase();
        return masterlistCols.has(lowerK) && !exclude.map(e => e.toLowerCase()).includes(lowerK);
      });

      const sets = columns.map((col, idx) => `"${col}" = $${idx + 1}`);
      const values = columns.map(col => {
        let val = applicant[col];
        if (JSONB_FIELDS.has(col.toLowerCase()) && val !== null && typeof val !== 'string') {
          return JSON.stringify(val);
        }
        return val;
      });

      values.push('Active', applicant.target_TLOid);

      await client.query(`
        UPDATE third_level_official_masterlist 
        SET ${sets.join(', ')}, status = $${values.length - 1}, updated_at = NOW()
        WHERE "TLOid" = $${values.length}
      `, values);

      await client.query(`
        UPDATE third_level_officials_profiling_application 
        SET application_status = 'approved', updated_at = NOW() 
        WHERE app_TLOid = $1
      `, [app_TLOid]);

      await client.query(`
        UPDATE tlo_users SET role = 'Third Level Official' WHERE LOWER(email) = $1 AND role = 'Third Level Applicant'
      `, [applicant.email.toLowerCase().trim()]);

      // Phase 3: Clone normalized child table rows from staging → masterlist
      const approvalUpdatedBy = req.user?.email || null;
      await cloneChildTablesOnApproval(client, app_TLOid, applicant.target_TLOid, approvalUpdatedBy);
    }

    await client.query('COMMIT');

    // Email notification dispatch
    if (applicantData && applicantData.email) {
      if (action === 'approve') {
        sendOfficialApprovalEmail({
          email: applicantData.email,
          firstName: applicantData.first_name,
          lastName: applicantData.last_name,
          positionTitle: applicantData.position_title,
          office: applicantData.office,
          tloId: applicantData.target_TLOid || app_TLOid
        }).catch(err => console.error('[processApplication] Approval email error:', err));
      } else if (action === 'reject') {
        sendOfficialRejectionEmail({
          email: applicantData.email,
          firstName: applicantData.first_name,
          lastName: applicantData.last_name,
          positionTitle: applicantData.position_title,
          office: applicantData.office,
          reason: denial_reason
        }).catch(err => console.error('[processApplication] Rejection email error:', err));
      }
    }

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const processRegistration = async (req, res) => {
  const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { TLOid, action, denial_reason } = req.body;
  if (!TLOid || !action) return res.status(400).json({ error: 'TLOid and action are required' });

  const client = await pool.connect();
  let targetOfficial = null;
  try {
    await client.query('BEGIN');

    const mlRes = await client.query('SELECT email, first_name, last_name, position_title, office FROM third_level_official_masterlist WHERE "TLOid" = $1', [TLOid]);
    if (mlRes.rows.length > 0) {
      targetOfficial = mlRes.rows[0];
    }

    if (action === 'reject') {
      await client.query(`
        UPDATE third_level_official_masterlist 
        SET status = 'Rejected', updated_at = NOW() 
        WHERE "TLOid" = $1 AND status = 'For Approval'
      `, [TLOid]);

      if (targetOfficial && targetOfficial.email) {
        await client.query(`
          UPDATE tlo_users SET registration_status = 'Rejected' WHERE LOWER(email) = $1
        `, [targetOfficial.email.toLowerCase()]);
      }
    } else if (action === 'approve') {
      await client.query(`
        UPDATE third_level_official_masterlist 
        SET status = 'Active', updated_at = NOW() 
        WHERE "TLOid" = $1 AND status = 'For Approval'
      `, [TLOid]);

      if (targetOfficial && targetOfficial.email) {
        await client.query(`
          UPDATE tlo_users SET registration_status = 'Approved' WHERE LOWER(email) = $1
        `, [targetOfficial.email.toLowerCase()]);
      }
    } else if (action === 'retrieve') {
      await client.query(`
        UPDATE third_level_official_masterlist 
        SET status = 'For Approval', updated_at = NOW() 
        WHERE "TLOid" = $1 AND status = 'Rejected'
      `, [TLOid]);

      if (targetOfficial && targetOfficial.email) {
        await client.query(`
          UPDATE tlo_users SET registration_status = 'For Approval' WHERE LOWER(email) = $1
        `, [targetOfficial.email.toLowerCase()]);
      }
    }

    await client.query('COMMIT');

    // Email notification dispatch
    if (targetOfficial && targetOfficial.email) {
      if (action === 'approve') {
        sendOfficialApprovalEmail({
          email: targetOfficial.email,
          firstName: targetOfficial.first_name,
          lastName: targetOfficial.last_name,
          positionTitle: targetOfficial.position_title,
          office: targetOfficial.office,
          tloId: TLOid
        }).catch(err => console.error('[processRegistration] Approval email error:', err));
      } else if (action === 'reject') {
        sendOfficialRejectionEmail({
          email: targetOfficial.email,
          firstName: targetOfficial.first_name,
          lastName: targetOfficial.last_name,
          positionTitle: targetOfficial.position_title,
          office: targetOfficial.office,
          reason: denial_reason || 'Registration rejected by Central Office Administrator.'
        }).catch(err => console.error('[processRegistration] Rejection email error:', err));
      }
    }

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const executeReassignment = async (client, official, effTs, justification, assignee_TLOid, target_TLOid) => {
  const TLOid = official.TLOid;
  if (assignee_TLOid) {
    const assigneeRes = await client.query(`
      SELECT app_TLOid AS "TLOid", first_name, last_name, email, contact_details
      FROM third_level_officials_profiling_application
      WHERE app_TLOid = $1
      UNION ALL
      SELECT uid AS "TLOid", first_name, last_name, email, contact_number AS contact_details
      FROM tlo_users
      WHERE uid = $1
      LIMIT 1
    `, [assignee_TLOid]);
    const assignee = assigneeRes.rows[0];
    if (!assignee) throw new Error('Assignee not found');

    const existingAssignmentRes = await client.query(`
      SELECT 1
      FROM third_level_official_masterlist
      WHERE LOWER(email) = LOWER($1)
        AND status = 'Active'
      LIMIT 1
    `, [assignee.email]);
    if (existingAssignmentRes.rows.length > 0) throw new Error('Selected personnel already has an assigned position');

    if (official.first_name && official.first_name !== 'VACANT') {
      await client.query(`
        INSERT INTO third_level_officials_updates
          ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Vacated', $8, NOW(), ${effTs}, $9)
      `, [TLOid, official.first_name, official.last_name, official.position_title,
        official.office, official.strand, official.email, justification || 'Reassigned position to another personnel', null]);
    }

    await client.query(`
      UPDATE third_level_official_masterlist
      SET first_name = $1, last_name = $2, email = $3, contact_details = $4,
          status = 'Active', updated_at = NOW(), effectivity_date = ${effTs}
      WHERE "TLOid" = $5
    `, [assignee.first_name, assignee.last_name, assignee.email, assignee.contact_details, TLOid]);

    await client.query(`
      INSERT INTO third_level_officials_updates
        ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, NOW(), ${effTs}, $9)
    `, [TLOid, assignee.first_name, assignee.last_name, official.position_title,
      official.office, official.strand, assignee.email, justification || 'Assigned through reassignment', null]);
  } else if (target_TLOid) {
    // Resolve target organizational values
    const targetItemRes = await client.query(
      `SELECT i.item_number, i.position_title,
              COALESCE(a.office, m.office) AS office,
              COALESCE(a.strand, m.strand) AS strand,
              COALESCE(a.region, m.region) AS region,
              COALESCE(a.division, m.division) AS division
       FROM tlo_items i
       LEFT JOIN (
         SELECT DISTINCT ON (item_number) *
         FROM tlo_assignments
         ORDER BY item_number, id DESC
       ) a ON a.item_number = i.item_number
       LEFT JOIN third_level_official_masterlist m ON m."TLOid" = i.item_number
       WHERE i.item_number = $1`,
      [target_TLOid]
    );
    const targetSlot = targetItemRes.rows[0];

    // Resolve official's personnel_id and item_number
    const activeAssignRes = await client.query(
      `SELECT a.*, p.id AS person_uuid
       FROM tlo_assignments a
       JOIN tlo_personnel p ON p.id = a.personnel_id
       WHERE (a.item_number = $1 OR p.legacy_tlo_id = $1)
       ORDER BY a.id DESC
       LIMIT 1`,
      [TLOid]
    );

    let personId = activeAssignRes.rows[0]?.person_uuid;
    let itemNumber = activeAssignRes.rows[0]?.item_number || TLOid;
    if (!personId) {
      const pRes = await client.query('SELECT id FROM tlo_personnel WHERE legacy_tlo_id = $1 LIMIT 1', [TLOid]);
      personId = pRes.rows[0]?.id;
    }

    const effDateVal = effTs && effTs !== 'NOW()' ? effTs.replace(/'/g, '').replace('::timestamp', '') : new Date().toISOString().split('T')[0];

    // Append-only INSERT into tlo_assignments (previous row is untouched)
    if (personId) {
      await client.query(
        `INSERT INTO tlo_assignments (
           personnel_id, item_number, region, division, office, strand,
           designation, assignment_type, status, start_date, end_date,
           remarks, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, 'Permanent', 'Active', $8, NULL,
           $9, NOW(), NOW()
         )`,
        [
          personId,
          itemNumber,
          targetSlot?.region || official.region,
          targetSlot?.division || official.division,
          targetSlot?.office || official.office,
          targetSlot?.strand || official.strand,
          targetSlot?.position_title || official.position_title,
          effDateVal,
          justification || `Reassigned from ${official.position_title}`
        ]
      );
    }

    // Update masterlist view for backward compatibility
    await client.query(`
      UPDATE third_level_official_masterlist
      SET region = $1, division = $2, office = $3, strand = $4,
          designation = $5, appointment_date = ${effTs}, updated_at = NOW()
      WHERE "TLOid" = $6
    `, [
      targetSlot?.region || official.region,
      targetSlot?.division || official.division,
      targetSlot?.office || official.office,
      targetSlot?.strand || official.strand,
      targetSlot?.position_title || official.position_title,
      TLOid
    ]);

    await client.query(`
      INSERT INTO third_level_officials_updates
        ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, NOW(), ${effTs}, $9)
    `, [TLOid, official.first_name, official.last_name,
        targetSlot?.position_title || official.position_title,
        targetSlot?.office || official.office,
        targetSlot?.strand || official.strand, official.email, justification || `Reassigned from ${official.position_title}`, null]);
  } else {
    await client.query(`
    UPDATE third_level_official_masterlist
    SET updated_at = NOW(), effectivity_date = ${effTs}
    WHERE "TLOid" = $1
  `, [TLOid]);
  }
};

let isProcessingVacancies = false;

let lastProcessTime = 0;

export const processScheduledVacancies = async (client) => {
  const now = Date.now();
  if (isProcessingVacancies || now - lastProcessTime < 60000) return; // Only run once per minute

  isProcessingVacancies = true;
  lastProcessTime = now;

  try {
    await client.query(`
      UPDATE third_level_official_masterlist
      SET status = 'Vacated', first_name = NULL, last_name = NULL, email = NULL, updated_at = NOW()
      WHERE status = 'Vacating' AND effectivity_date <= NOW()
    `);
    await client.query(`
      UPDATE third_level_official_masterlist
      SET status = 'Inactive', updated_at = NOW()
      WHERE status = 'Resigning' AND effectivity_date <= NOW()
    `);

    const pendingReassignments = await client.query(`
      SELECT * FROM third_level_official_masterlist
      WHERE (status = 'Reassigning' OR status = 'Pending Assignment') AND effectivity_date <= NOW()
    `);

    for (const official of pendingReassignments.rows) {
      try {
        const effTsStr = official.effectivity_date ? `'${official.effectivity_date.toISOString()}'::timestamp` : 'NOW()';
        await executeReassignment(client, official, effTsStr, 'Scheduled reassignment executed', official.reassign_assignee_tloid, official.reassign_target_tloid);

        await client.query(`
          UPDATE third_level_official_masterlist
          SET reassign_target_tloid = NULL, reassign_assignee_tloid = NULL
          WHERE "TLOid" = $1
        `, [official.TLOid]);
      } catch (err) {
        console.error('Failed scheduled reassignment for', official.TLOid, err);
      }
    }
  } catch (err) {
    console.error('Failed to process scheduled vacancies:', err);
  } finally {
    isProcessingVacancies = false;
  }
};

export const processAnticipatedVacancies = async (client) => {
  try {
    // Identify personnel within 5 years of mandatory retirement (age 60 to 65)
    const res = await client.query(`
      SELECT "TLOid", first_name, last_name, position_title, office, date_of_birth 
      FROM third_level_official_masterlist
      WHERE status = 'Active' 
        AND date_of_birth IS NOT NULL
        AND date_of_birth <= NOW() - INTERVAL '60 years'
        AND date_of_birth > NOW() - INTERVAL '65 years'
    `);

    if (res.rows.length > 0) {
      console.log(`\n📌 [Anticipated Vacancies] Identified ${res.rows.length} personnel retiring within 5 years.`);
    }
  } catch (err) {
    console.error('Failed to process anticipated vacancies:', err);
  }
};

// HTTP Endpoint for Vercel Cron
export const triggerCron = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized cron trigger' });
    }

    await processScheduledVacancies(pool);
    res.json({ success: true, message: 'Cron job executed successfully' });
  } catch (err) {
    console.error('Vercel Cron Error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const reassignOfficial = async (req, res) => {
  const allowedRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const {
    tloId,
    newRegion,
    newDivision,
    newOffice,
    office,
    targetOffice,
    newStrand,
    strand,
    targetStrand,
    newDesignation,
    target_TLOid,
    vacantItemNumber,
    remarks,
    justification,
    inclusiveDateStart,
    inclusiveDateEnd,
    inclusive_date_start,
    inclusive_date_end,
    fromDate,
    toDate,
    effectiveDate
  } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!tloId || typeof tloId !== 'string' || !tloId.trim()) {
    return res.status(400).json({ error: 'tloId is required' });
  }

  const safeTloId = tloId.trim();
  const targetItemId = (vacantItemNumber || target_TLOid || req.body.targetTloId || '').trim();
  if (!targetItemId) {
    return res.status(400).json({ error: 'A vacant position must be selected for reassignment.' });
  }

  const userRemarks = (remarks || justification || '').trim();
  const actorEmail = req.user?.email || null;

  const cleanDate = (d) => {
    if (!d || typeof d !== 'string') return null;
    const t = d.trim();
    return (t && t.toUpperCase() !== 'N/A' && t.toUpperCase() !== 'NONE') ? t : null;
  };

  const rawStart = inclusiveDateStart || inclusive_date_start || fromDate || null;
  const rawEnd = effectiveDate || inclusiveDateEnd || inclusive_date_end || toDate || null;
  const dateStart = cleanDate(rawStart);
  const dateEnd = cleanDate(rawEnd);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Step 1: Read current official record ───────────────────────────────
    const fetchRes = await client.query(
      `SELECT "TLOid", position_title, office, strand, division, region, designation, email, appointment_date, is_oic
       FROM third_level_official_masterlist
       WHERE "TLOid" = $1`,
      [safeTloId]
    );

    if (fetchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Official with TLOid '${safeTloId}' not found.` });
    }

    const current = fetchRes.rows[0];
    const finalEnd = dateEnd || new Date().toISOString().split('T')[0];

    // ── Step 2: Resolve official's personnel_id & lock current active assignment ──
    const pRes = await client.query(
      `SELECT id, first_name, last_name, email
       FROM tlo_personnel
       WHERE legacy_tlo_id = $1
          OR (LOWER(TRIM(email)) = LOWER(TRIM($2)) AND email IS NOT NULL AND email != '')
       ORDER BY CASE WHEN legacy_tlo_id = $1 THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [safeTloId, current.email]
    );

    if (pRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Personnel record not found for official '${safeTloId}'.` });
    }

    const personId = pRes.rows[0].id;

    // Lock and read the official's CURRENT active assignment via personnel_id
    const activeAssignRes = await client.query(
      `SELECT a.*
       FROM tlo_assignments a
       WHERE a.personnel_id = $1
         AND a.status = 'Active'
       ORDER BY a.id DESC
       LIMIT 1
       FOR UPDATE`,
      [personId]
    );

    if (activeAssignRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot reassign official '${safeTloId}': No active assignment record found in tlo_assignments.` });
    }

    const activeAssign = activeAssignRes.rows[0];

    // ── Step 3: Capture ALL OLD values into immutable variables ───────────
    const oldItemNumber = activeAssign.item_number;
    const oldPositionTitle = (activeAssign.position_title || current.position_title || '').toUpperCase();
    const oldDesignation = activeAssign.designation || current.designation || null;
    const oldOffice = activeAssign.office || current.office || null;
    const oldStrand = activeAssign.strand || current.strand || null;
    const oldDivision = activeAssign.division || current.division || null;
    const oldRegion = activeAssign.region || current.region || null;
    const oldStartDate = activeAssign.start_date
      ? new Date(activeAssign.start_date).toISOString().split('T')[0]
      : (dateStart || (current.appointment_date ? new Date(current.appointment_date).toISOString().split('T')[0] : null));
    const oldEndDate = finalEnd;
    const oldOic = Boolean(activeAssign.oic || current.is_oic || (current.designation && current.designation.toUpperCase().includes('OIC')));

    // ── Step 4: Authoritatively resolve & validate selected vacant position ──
    const targetItemRes = await client.query(
      `SELECT 
         i.item_number,
         m."TLOid",
         COALESCE(NULLIF(i.position_title, ''), NULLIF(m.position_title, '')) AS position_title,
         m.region,
         m.division,
         m.office,
         m.strand,
         m.designation,
         m.first_name,
         m.status AS masterlist_status,
         (
           SELECT COUNT(*) 
           FROM tlo_assignments a 
           WHERE a.item_number = i.item_number 
             AND a.status = 'Active'
         ) AS active_assignment_count
       FROM tlo_items i
       JOIN third_level_official_masterlist m ON m."TLOid" = i.item_number
       WHERE i.item_number = $1`,
      [targetItemId]
    );

    if (targetItemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Selected vacant position '${targetItemId}' not found in plantilla items.` });
    }

    const ti = targetItemRes.rows[0];

    // Verify position is genuinely vacant
    if (Number(ti.active_assignment_count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected position '${targetItemId}' is already occupied by an active assignment.` });
    }

    const isVacantMasterlist = !ti.first_name ||
      ti.first_name.trim() === '' ||
      ti.first_name.toUpperCase().includes('VACANT') ||
      ti.masterlist_status === 'Vacant' ||
      ti.masterlist_status === 'Vacated';

    if (!isVacantMasterlist) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected position '${targetItemId}' is currently occupied in the masterlist.` });
    }

    // Authoritative values strictly from database
    const targetRegion = ti.region ? ti.region.trim() : null;
    const targetDivision = ti.division ? ti.division.trim() : null;
    const targetOffice = ti.office ? ti.office.trim() : null;
    const targetStrand = ti.strand ? ti.strand.trim() : null;
    const targetPositionTitle = ti.position_title ? ti.position_title.trim() : null;
    const targetDesignation = (ti.designation && ti.designation.trim()) || targetPositionTitle;

    if (!targetRegion) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected vacant position '${targetItemId}' has no valid Region in database.` });
    }
    if (!targetDivision) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected vacant position '${targetItemId}' has no valid Division in database.` });
    }
    if (!targetOffice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected vacant position '${targetItemId}' has no valid Office in database.` });
    }
    if (!targetStrand) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected vacant position '${targetItemId}' has no valid Strand in database.` });
    }
    if (!targetPositionTitle) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Selected vacant position '${targetItemId}' has no valid Position Title in database.` });
    }

    const targetIsOic = Boolean(targetDesignation && targetDesignation.toUpperCase().includes('OIC'));
    const targetAssignmentType = targetIsOic ? 'OIC' : 'Permanent';

    // ── Step 5: Archive OLD position into tlo_position_history & RETURNING id ──
    const historyRes = await client.query(
      `INSERT INTO tlo_position_history (
         source_table, tlo_id, position_name, designation,
         office, strand, division, region,
         inclusive_date_start, inclusive_date_end,
         status, oic, delete_flg, created_at, updated_at, created_by, updated_by
       ) VALUES (
         'masterlist', $1, $2, $3,
         $4, $5, $6, $7,
         $8, $9,
         'Inactive', $10, 'No', NOW(), NOW(), $11, $11
       ) RETURNING id`,
      [
        safeTloId,
        oldPositionTitle,
        oldDesignation,
        oldOffice,
        oldStrand,
        oldDivision,
        oldRegion,
        oldStartDate,
        oldEndDate,
        oldOic,
        actorEmail
      ]
    );

    const historyId = historyRes.rows[0].id;
    let binaryId = null;
    let savedFilePath = null;

    // ── Step 5b: Process Reassignment Order PDF if attached ───────────────
    if (req.file) {
      const mimeType = req.file.mimetype;
      const { binary_id } = await upsertBinary(client, req.file.buffer, mimeType, req.file.buffer.length);
      binaryId = binary_id;

      const pad = (n) => n.toString().padStart(2, '0');
      const now = new Date();
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const ext = path.extname(req.file.originalname) || (mimeType === 'application/pdf' ? '.pdf' : '');
      
      const filename = `reassignment_order_${safeTloId}_history_${historyId}_${timestamp}${ext}`;
      const folderRelative = path.join('uploads', safeTloId, 'reassignment_order');
      const folderAbsolute = path.join(process.cwd(), folderRelative);

      if (!fs.existsSync(folderAbsolute)) {
        fs.mkdirSync(folderAbsolute, { recursive: true });
      }
      const fileAbsolute = path.join(folderAbsolute, filename);
      fs.writeFileSync(fileAbsolute, req.file.buffer);
      savedFilePath = `/uploads/${safeTloId}/reassignment_order/${filename}`;

      let azureData = null;
      let finalBlobUrlOrPath = savedFilePath;
      try {
        azureData = await uploadToAzure(
          req.file.buffer,
          filename,
          mimeType,
          safeTloId,
          `reassignment_order_history_${historyId}`
        );
        if (azureData && (azureData.blobUrl || azureData.url)) {
          finalBlobUrlOrPath = azureData.blobUrl || azureData.url;
        }
      } catch (azureErr) {
        console.warn('[reassignOfficial] Azure upload skipped/failed:', azureErr.message);
      }

      if (finalBlobUrlOrPath) {
        await client.query('UPDATE unified_binaries SET azure_blob_url = $1 WHERE id = $2', [finalBlobUrlOrPath, binaryId]);
      }

      await client.query(
        `UPDATE tlo_position_history SET reassignment_order_binary_id = $1 WHERE id = $2`,
        [binaryId, historyId]
      );
    }

    // ── Step 6: Update existing OLD tlo_assignments row to Inactive ───────
    await client.query(
      `UPDATE tlo_assignments
       SET status = 'Inactive', end_date = $1, updated_at = NOW(), updated_by = $2
       WHERE id = $3`,
      [finalEnd, actorEmail, activeAssign.id]
    );

    // ── Step 7: Insert NEW active assignment in tlo_assignments ───────────
    const newAssignRes = await client.query(
      `INSERT INTO tlo_assignments (
         personnel_id, item_number, region, division, office, strand,
         position_title, designation, assignment_type, status, oic,
         start_date, end_date, reassignment_order_binary_id, remarks,
         created_by, updated_by, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, 'Active', $10,
         $11, NULL, $12, $13,
         $14, $14, NOW(), NOW()
       ) RETURNING id`,
      [
        personId,
        ti.item_number, // The selected vacant plantilla position's item_number!
        targetRegion,
        targetDivision,
        targetOffice,
        targetStrand,
        targetPositionTitle,
        targetDesignation,
        targetAssignmentType,
        targetIsOic,
        finalEnd,
        binaryId,
        userRemarks || `Reassigned to ${targetRegion} / ${targetDivision} (${targetOffice})`,
        actorEmail
      ]
    );
    const newAssignmentId = newAssignRes.rows[0].id;

    // ── Step 8: Update third_level_official_masterlist view ───────────────
    await client.query(
      `UPDATE third_level_official_masterlist
       SET region = $1, division = $2, office = $3, strand = $4,
           designation = $5,
           appointment_date = COALESCE($6, appointment_date),
           reassignment_order_binary_id = COALESCE($7, reassignment_order_binary_id),
           updated_at = NOW()
       WHERE "TLOid" = $8`,
      [targetRegion, targetDivision, targetOffice, targetStrand, targetDesignation, finalEnd, binaryId, safeTloId]
    );

    await client.query('COMMIT');

    console.log(`[reassignOfficial] Official ${safeTloId} reassigned to ${targetRegion} / ${targetDivision} (Old Item: ${oldItemNumber}, New Item: ${ti.item_number}, Assignment ID: ${newAssignmentId}) by ${actorEmail}`);

    res.json({
      success: true,
      message: `Official ${safeTloId} successfully reassigned.`,
      data: {
        tloId: safeTloId,
        assignmentId: newAssignmentId,
        historyId: historyId,
        newItemNumber: ti.item_number,
        newRegion: targetRegion,
        newDivision: targetDivision,
        newOffice: targetOffice,
        newStrand: targetStrand,
        newDesignation: targetDesignation,
        binaryId: binaryId,
        filePath: savedFilePath
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reassignOfficial] Transaction rolled back:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

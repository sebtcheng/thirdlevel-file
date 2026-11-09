import fs from 'fs';
import pool from '../../config/db.js';
import * as officialsRepository from './repositories/officialsRepository.js';
import { ensureOicColumn, getPositionTitleVariants, THIRD_LEVEL_POSITIONS, displayPositionTitle, getOptionalColumnExpression } from '../../utils/officialRules.js';
import { executeReassignment, processScheduledVacancies } from '../official-profiling/index.js';

export const buildOfficialsFilterConditions = (query, user) => {
  const params = [];
  const conditions = [];

  const { search, status, strand, category, position, designation, office, is_oic, region, division, name, position_title, level } = query;

  const userRole = user?.role;
  const isRO = userRole === 'Regional Office' || userRole === 'RO_HRMO' || userRole === 'RO HRMO';
  const isSDO = userRole === 'School Division Office' || userRole === 'SDO_HRMO' || userRole === 'SDO HRMO';

  const targetRegion = user?.assigned_region || user?.region;
  const targetDivision = user?.assigned_division || user?.division;

  if (isRO && targetRegion) {
    params.push(targetRegion);
    conditions.push(`strand = $${params.length}`);
  }
  if (isSDO && targetRegion && targetDivision) {
    params.push(targetRegion);
    conditions.push(`strand = $${params.length}`);
    params.push(targetDivision);
    conditions.push(`division = $${params.length}`);
  }

  let filterLevel = Array.isArray(level) ? level[level.length - 1] : level;
  if (filterLevel && filterLevel !== 'All') {
    if (filterLevel === 'Central Office') {
      conditions.push(`(region = 'Central Office' OR (COALESCE(region, '') = '' AND COALESCE(strand, '') NOT ILIKE 'Region%' AND COALESCE(strand, '') NOT ILIKE 'NCR' AND COALESCE(strand, '') NOT ILIKE 'CAR%' AND COALESCE(strand, '') NOT ILIKE 'NIR' AND COALESCE(strand, '') NOT ILIKE 'BARMM'))`);
    } else if (filterLevel === 'Regional Office') {
      conditions.push(`(region != 'Central Office' OR (COALESCE(region, '') = '' AND (COALESCE(strand, '') ILIKE 'Region%' OR COALESCE(strand, '') ILIKE 'NCR' OR COALESCE(strand, '') ILIKE 'CAR%' OR COALESCE(strand, '') ILIKE 'NIR' OR COALESCE(strand, '') ILIKE 'BARMM'))) AND (office ILIKE '%Regional Office%' OR office ILIKE 'ro' OR office = strand OR position_title ILIKE '%Regional Director%' OR position_title ILIKE '% RD %' OR position_title ILIKE '% ARD %')`);
    } else if (filterLevel === 'Schools Division Office') {
      conditions.push(`(region != 'Central Office' OR (COALESCE(region, '') = '' AND (COALESCE(strand, '') ILIKE 'Region%' OR COALESCE(strand, '') ILIKE 'NCR' OR COALESCE(strand, '') ILIKE 'CAR%' OR COALESCE(strand, '') ILIKE 'NIR' OR COALESCE(strand, '') ILIKE 'BARMM'))) AND NOT (office ILIKE '%Regional Office%' OR office ILIKE 'ro' OR office = strand OR position_title ILIKE '%Regional Director%' OR position_title ILIKE '% RD %' OR position_title ILIKE '% ARD %')`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length} OR position_title ILIKE $${params.length} OR office ILIKE $${params.length} OR strand ILIKE $${params.length})`);
  }

  const filterStatus = Array.isArray(status) ? status[status.length - 1] : status;
  if (filterStatus && filterStatus !== 'All' && filterStatus !== 'Legacy') {
    if (filterStatus === 'Vacant' || filterStatus === 'Vacated') {
      conditions.push(`(status = 'Vacated' OR status = 'Vacant' OR first_name IS NULL OR first_name = '' OR first_name ILIKE '%VACANT%')`);
    } else {
      params.push(filterStatus);
      conditions.push(`status = $${params.length}`);
    }
  } else {
    conditions.push(`status != 'For Approval' AND status != 'Rejected'`);
  }

  let filterStrand = Array.isArray(strand) ? strand[strand.length - 1] : strand;
  if (filterStrand && filterStrand !== 'All') {
    params.push(filterStrand);
    conditions.push(`strand = $${params.length}`);
  }

  let filterRegion = Array.isArray(region) ? region[region.length - 1] : region;
  if (filterRegion && filterRegion !== 'All') {
    if (filterRegion === 'Central Office') {
      conditions.push(`(region = 'Central Office' OR (COALESCE(region, '') = '' AND COALESCE(strand, '') NOT ILIKE 'Region%' AND COALESCE(strand, '') NOT ILIKE 'NCR' AND COALESCE(strand, '') NOT ILIKE 'CAR%' AND COALESCE(strand, '') NOT ILIKE 'NIR' AND COALESCE(strand, '') NOT ILIKE 'BARMM'))`);
    } else if (filterRegion === 'CARAGA') {
      conditions.push(`(region = 'CARAGA' OR (COALESCE(region, '') = '' AND (COALESCE(strand, '') ILIKE 'Region XIII%' OR COALESCE(strand, '') ILIKE 'CARAGA%')))`);
    } else {
      params.push(filterRegion + '%');
      conditions.push(`(region ILIKE $${params.length} OR (COALESCE(region, '') = '' AND COALESCE(strand, '') ILIKE $${params.length}))`);
    }
  }

  let filterOffice = Array.isArray(office) ? office[office.length - 1] : office;
  let filterDivision = Array.isArray(division) ? division[division.length - 1] : division;
  let activeOffice = filterOffice || filterDivision;
  if (activeOffice && activeOffice !== 'All') {
    if (activeOffice === 'No Division') {
      conditions.push(`((office IS NULL OR office = '') AND (division IS NULL OR division = ''))`);
    } else {
      params.push(activeOffice);
      conditions.push(`(office = $${params.length} OR strand = $${params.length} OR division = $${params.length})`);
    }
  }

  let filterPos1 = Array.isArray(position) ? position[position.length - 1] : position;
  let filterPos2 = Array.isArray(position_title) ? position_title[position_title.length - 1] : position_title;
  let activePosition = filterPos1 || filterPos2;
  if (activePosition && activePosition !== 'All') {
    if (activePosition === 'Unassigned') {
      conditions.push(`(position_title IS NULL OR position_title = '')`);
    } else {
      params.push(activePosition);
      conditions.push(`position_title ILIKE $${params.length}`);
    }
  }

  let filterDesignation = Array.isArray(designation) ? designation[designation.length - 1] : designation;
  if (filterDesignation && filterDesignation !== 'All') {
    if (filterDesignation === 'No Designation') {
      conditions.push(`(designation IS NULL OR designation = '')`);
    } else {
      params.push(filterDesignation);
      conditions.push(`designation = $${params.length}`);
    }
  }

  let filterName = Array.isArray(name) ? name[name.length - 1] : name;
  if (filterName && filterName !== 'All') {
    if (filterName === 'VACANT POSITION') {
      conditions.push(`(first_name IS NULL OR first_name = 'VACANT')`);
    } else {
      params.push(`%${filterName}%`);
      conditions.push(`CONCAT_WS(' ', first_name, last_name) ILIKE $${params.length}`);
    }
  }

  if (category === 'Third Level' || category === 'Third Level Officials') {
    params.push(THIRD_LEVEL_POSITIONS);
    conditions.push(`position_title = ANY($${params.length}) AND NOT (COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
  } else if (category === 'Third Level (OIC)' || category === 'Officer in Charge') {
    params.push(THIRD_LEVEL_POSITIONS);
    conditions.push(`(position_title = ANY($${params.length}) OR designation = ANY($${params.length}) OR designation ILIKE '%OIC%') AND (COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
  } else if (category === 'Division Chiefs') {
    params.push(THIRD_LEVEL_POSITIONS);
    conditions.push(`position_title != ALL($${params.length}) AND NOT (COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
  } else if (category === 'Division Chiefs (OIC)') {
    params.push(THIRD_LEVEL_POSITIONS);
    conditions.push(`position_title != ALL($${params.length}) AND designation != ALL($${params.length}) AND (designation NOT ILIKE '%OIC%' OR designation IS NULL) AND (COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
  } else if (category === 'OIC / Chiefs') {
    conditions.push(`(COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
  } else if (category === 'Concurrent Positions' || category === 'Concurrent Roles' || query.concurrent === 'true' || query.is_concurrent === 'true') {
    conditions.push(`status = 'Active' AND email IS NOT NULL AND email != '' AND LOWER(email) IN (
      SELECT LOWER(email) 
      FROM third_level_official_masterlist 
      WHERE status = 'Active' AND email IS NOT NULL AND email != '' 
      GROUP BY LOWER(email) 
      HAVING COUNT(*) > 1
    )`);
  }

  let filterOic = Array.isArray(is_oic) ? is_oic[is_oic.length - 1] : is_oic;
  if (filterOic && filterOic !== 'All') {
    const isYes = ['true', 'yes', '1'].includes(String(filterOic).toLowerCase());
    const isNo = ['false', 'no', '0'].includes(String(filterOic).toLowerCase());
    if (isYes) {
      conditions.push(`(COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')`);
    } else if (isNo) {
      conditions.push(`(COALESCE(is_oic, FALSE) = FALSE AND (designation NOT ILIKE '%OIC%' OR designation IS NULL))`);
    }
  }

  return { params, conditions };
};

export const getOfficials = async (req, res) => {
  const allowedRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office', 'RO HRMO', 'SDO HRMO'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }

  processScheduledVacancies(pool).catch(err => console.error('Background process error:', err));

  const { page, limit, sortColumn, sortDirection, include_test_accounts } = req.query;
  let query = `
    WITH RankedOfficials AS (
      SELECT 
        m."TLOid", m.first_name, m.last_name, m.email, m.position_title, m.office, m.strand, m.region, m.division, m.status, m.is_oic, m.designation, m.contact_details, m.effectivity_date, m.reassign_assignee_tloid, m.reassign_target_tloid, m.created_at, m.updated_at, m.photo_binary_id, m.pds_binary_id, m.pending_admin_case, m.date_of_birth, m.is_testaccount,
        (SELECT vacate_reason FROM third_level_officials_updates u WHERE u."TLOid" = m."TLOid" AND u.vacate_reason IS NOT NULL ORDER BY updated_at DESC LIMIT 1) as vacate_reason,
        (SELECT CONCAT_WS(' ', u.first_name, u.last_name) FROM third_level_officials_updates u WHERE u."TLOid" = m."TLOid" AND u.first_name IS NOT NULL AND u.first_name != 'VACANT' AND u.status != 'Vacated' ORDER BY updated_at DESC LIMIT 1) as previous_incumbent,
        (
          CASE WHEN m.first_name IS NULL OR m.first_name = '' OR m.first_name ILIKE '%VACANT%' OR m.status = 'Vacated' THEN NULL
          ELSE (
            (CASE WHEN 
              m.first_name IS NOT NULL AND m.first_name != '' AND
              m.last_name IS NOT NULL AND m.last_name != '' AND
              m.gender IS NOT NULL AND m.gender != '' AND
              m.date_of_birth IS NOT NULL AND
              m.civil_status IS NOT NULL AND m.civil_status != '' AND
              m.photo_binary_id IS NOT NULL AND
              m.employment_status IS NOT NULL AND m.employment_status != '' AND
              m.region IS NOT NULL AND m.region != '' AND
              m.position_title IS NOT NULL AND m.position_title != '' AND
              m.appointment_date IS NOT NULL AND
              (COALESCE(m.is_oic, false) = false OR (m.designation IS NOT NULL AND m.designation != '')) AND
              m.permanent_address IS NOT NULL AND m.permanent_address != '' AND
              ((m.contact_details IS NOT NULL AND m.contact_details != '') OR (m.alt_contact_details_1 IS NOT NULL AND m.alt_contact_details_1 != ''))
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              (m.ces_stage IS NOT NULL AND m.ces_stage != '' AND m.ces_stage != 'NOT APPLICABLE') OR
              m.emt_passer IS NOT NULL OR
              EXISTS (SELECT 1 FROM tlo_eligibility_records el WHERE el.source_table = 'masterlist' AND el.tlo_id = m."TLOid")
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              EXISTS (SELECT 1 FROM tlo_position_history ph WHERE ph.source_table = 'masterlist' AND ph.tlo_id = m."TLOid")
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              EXISTS (SELECT 1 FROM tlo_education_records ed WHERE ed.source_table = 'masterlist' AND ed.tlo_id = m."TLOid")
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              m.performance_rating_1 IS NOT NULL AND m.performance_rating_1 != '' AND
              m.performance_rating_1_period IS NOT NULL AND m.performance_rating_1_period != ''
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              EXISTS (SELECT 1 FROM tlo_training_records tr WHERE tr.source_table = 'masterlist' AND tr.tlo_id = m."TLOid")
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              (m.notable_achievements IS NOT NULL AND jsonb_array_length(CASE WHEN jsonb_typeof(m.notable_achievements) = 'array' THEN m.notable_achievements ELSE '[]'::jsonb END) > 0) OR
              EXISTS (SELECT 1 FROM tlo_accomplishment_records ac WHERE ac.source_table = 'masterlist' AND ac.tlo_id = m."TLOid")
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              m.pds_binary_id IS NOT NULL AND m.service_records_binary_id IS NOT NULL
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              m.pending_admin_case IS NOT NULL AND m.pending_admin_case != '' AND (
                (m.guilty_admin_details IS NOT NULL AND m.criminally_charged_details IS NOT NULL AND m.convicted_crime_details IS NOT NULL) OR
                (UPPER(m.pending_admin_case) IN ('NO', 'NONE', 'N/A'))
              )
            THEN 10 ELSE 0 END) +
            (CASE WHEN 
              m.dpa_consented_at IS NOT NULL
            THEN 10 ELSE 0 END)
          ) END
        ) AS profile_completion,
        ROW_NUMBER() OVER (
          PARTITION BY CASE WHEN m.first_name IS NULL OR m.first_name = 'VACANT' THEN m."TLOid" ELSE LOWER(m.email) END 
          ORDER BY m."TLOid" ASC
        ) as rn
      FROM third_level_official_masterlist m
  `;

  try {
    await ensureOicColumn();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { params, conditions } = buildOfficialsFilterConditions(req.query, req.user);

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ` 
    ), ActivePositions AS (
      SELECT LOWER(email) as low_email, "TLOid", position_title, office
      FROM third_level_official_masterlist
      WHERE status = 'Active' AND email IS NOT NULL AND email != ''
    )
    SELECT 
      f.*,
      COUNT(*) OVER() AS total_count,
      (
         SELECT string_agg(t2.position_title || ' (' || COALESCE(t2.office, '') || ')', ' | ')
         FROM ActivePositions t2 
         WHERE t2.low_email = LOWER(f.email)
           AND t2."TLOid" != f."TLOid" 
      ) as concurrent_positions
    FROM RankedOfficials f 
    WHERE f.rn = 1 
  `;

  // Server-side sorting
  const sortMap = {
    'status': 'f.status',
    'office': 'f.office',
    'position_title': 'f.position_title',
    'first_name': 'f.first_name',
    'name': 'f.last_name',
    'region': 'f.strand',
    'division': 'f.office',
    'designation': 'f.designation',
    'profile_completion': 'f.profile_completion'
  };
  if (sortColumn && sortMap[sortColumn]) {
    query += ` ORDER BY ${sortMap[sortColumn]} ${sortDirection === 'desc' ? 'DESC' : 'ASC'} NULLS LAST`;
  } else {
    query += ` ORDER BY f."TLOid" ASC`;
  }

  // Server-side pagination
  if (page && limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;
  }

  try {
    const result = await officialsRepository.runQuery(query, params);
    res.json({
      success: true,
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      data: result.rows.map(row => ({
        ...row,
        position_title: displayPositionTitle(row.position_title)
      }))
    });
  } catch (err) {
    import('fs').then(fs => fs.writeFileSync('getOfficials_error.log', err.stack || err.message)).catch(() => { });
    res.status(500).json({ error: err.message });
  }
};

export const getKpiSummary = async (req, res) => {
  try {
    await ensureOicColumn();
    const { params, conditions } = buildOfficialsFilterConditions(req.query, req.user);
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      WITH ActivePositions AS (
        SELECT LOWER(email) as low_email, "TLOid", position_title, office
        FROM third_level_official_masterlist
        WHERE status = 'Active' AND email IS NOT NULL AND email != ''
      ),
      FilteredMasterlist AS (
        SELECT 
          m.*,
          (
             SELECT string_agg(t2.position_title || ' (' || COALESCE(t2.office, '') || ')', ' | ')
             FROM ActivePositions t2 
             WHERE t2.low_email = LOWER(m.email)
               AND t2."TLOid" != m."TLOid" 
          ) as concurrent_positions
        FROM third_level_official_masterlist m
        ${whereClause}
      )
      SELECT 
        COUNT(*) FILTER (
          WHERE status = 'Active' 
            AND COALESCE(is_oic, FALSE) = FALSE 
            AND (designation NOT ILIKE '%OIC%' OR designation IS NULL) 
            AND position_title = ANY($${params.length + 1})
        ) AS total_third_level,
        COUNT(*) FILTER (
          WHERE status = 'Vacant' 
             OR status = 'Vacated' 
             OR first_name IS NULL 
             OR first_name = '' 
             OR first_name ILIKE '%VACANT%'
        ) AS total_vacant,
        COUNT(*) FILTER (
          WHERE status = 'Active' 
            AND (COALESCE(is_oic, FALSE) = TRUE OR designation ILIKE '%OIC%')
        ) AS total_oic,
        COUNT(DISTINCT CASE 
          WHEN status = 'Active' AND concurrent_positions IS NOT NULL AND email IS NOT NULL AND email != '' 
          THEN LOWER(TRIM(email)) 
        END) AS total_concurrent
      FROM FilteredMasterlist;
    `;
    params.push(THIRD_LEVEL_POSITIONS);

    const result = await officialsRepository.runQuery(query, params);

    // Also fetch all masterlist rows for filter dropdowns / directory compatibility
    const allRows = await officialsRepository.findDirectoryRows();
    

    res.json({
      success: true,
      kpis: result.rows[0],
      data: allRows.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLastVacateUpdate = async (req, res) => {
  try {
    const { TLOid } = req.params;
    const result = await officialsRepository.findLastVacateUpdate(TLOid);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPositionIncumbents = async (req, res) => {
  const { position_title, office } = req.query;

  if (!position_title) {
    return res.status(400).json({ error: 'position_title required' });
  }

  try {
    const isOfficeProvided = office && office !== 'null' && office !== 'undefined' && office !== '';
    const positionTitleVariants = getPositionTitleVariants(position_title);
    const params = isOfficeProvided ? [positionTitleVariants, office] : [positionTitleVariants];
    const officeCondition = isOfficeProvided ? 'AND (office = $2 OR office IS NULL)' : '';

    const query = `
      WITH AllIncumbents AS (
        SELECT 
          0 as id, "TLOid", first_name, last_name, strand, office, 'Current' as remarks, updated_at as tenure_date,
          1 as is_current
        FROM third_level_official_masterlist
        WHERE position_title = ANY($1) ${officeCondition}
          AND first_name IS NOT NULL AND first_name != 'VACANT'
        
        UNION ALL
        
        SELECT 
          0 as id, u."TLOid", u.first_name, u.last_name, u.strand, u.office, u.remarks, u.updated_at as tenure_date,
          0 as is_current
        FROM third_level_officials_updates u
        WHERE u.position_title = ANY($1) ${officeCondition}
          AND u.first_name IS NOT NULL AND u.first_name != 'VACANT'
      ),
      RankedIncumbents AS (
        SELECT ai.*, m.appointment_date,
          ROW_NUMBER() OVER (PARTITION BY LOWER(ai.first_name), LOWER(ai.last_name) ORDER BY ai.is_current DESC, ai.tenure_date DESC) as rn
        FROM AllIncumbents ai
        LEFT JOIN third_level_official_masterlist m ON ai."TLOid" = m."TLOid"
      )
      SELECT * FROM RankedIncumbents
      WHERE rn = 1
      ORDER BY is_current DESC, tenure_date DESC
    `;

    const result = await officialsRepository.runQuery(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getActiveOfficials = async (req, res) => {
  const { exclude_TLOid } = req.query;
  try {
    await ensureOicColumn();
    const params = [];
    let query = `
      SELECT "TLOid", first_name, last_name, position_title, office, strand, email
      FROM third_level_official_masterlist
      WHERE status = 'Active' AND first_name IS NOT NULL AND first_name NOT IN ('VACANT', 'Test1', 'Test2', 'Test3')
    `;
    if (exclude_TLOid) {
      params.push(exclude_TLOid);
      query += ` AND "TLOid" != $${params.length}`;
    }
    query += ` ORDER BY last_name ASC, first_name ASC`;
    const result = await officialsRepository.runQuery(query, params);
    res.json({ success: true, data: result.rows.map(row => ({ ...row, position_title: displayPositionTitle(row.position_title) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createUnassignedPersonnel = async (req, res) => {
  const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { first_name, last_name, email, employee_number } = req.body;
  if (!email || !first_name || !last_name) return res.json({ success: false, error: 'Missing required fields' });

  const client = await pool.connect();
  try {
    const masterCheck = await client.query('SELECT 1 FROM third_level_official_masterlist WHERE LOWER(email) = LOWER($1)', [email]);
    const appCheck = await client.query('SELECT 1 FROM third_level_officials_profiling_application WHERE LOWER(email) = LOWER($1)', [email]);
    const userCheck = await client.query('SELECT 1 FROM tlo_users WHERE LOWER(email) = LOWER($1)', [email]);

    if (masterCheck.rows.length > 0 || appCheck.rows.length > 0 || userCheck.rows.length > 0) {
      return res.json({ success: false, error: 'Email already exists. Please use a different email address.' });
    }

    const countRes = await client.query('SELECT COUNT(*) FROM third_level_officials_profiling_application');
    const count = parseInt(countRes.rows[0].count) + 1;
    const appTloId = `APP-2026-${String(count).padStart(4, '0')}`;
    const normalizedEmailInit = email.toLowerCase().trim();

    await client.query('BEGIN');

    // Check if employee_number column exists
    const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='third_level_officials_profiling_application'`);
    const cols = colsRes.rows.map(r => r.column_name.toLowerCase());
    const empCol = cols.find(c => c === 'employee_number' || c === 'employee_no' || c === 'emp_no');

    if (empCol && employee_number) {
      await client.query(`
        INSERT INTO third_level_officials_profiling_application (
            application_id, app_TLOid, first_name, last_name, email, "${empCol}", application_status, created_at, updated_at
        ) VALUES (DEFAULT, $1, $2, $3, $4, $5, NULL, NOW(), NOW())
      `, [appTloId, first_name, last_name, normalizedEmailInit, employee_number]);
    } else {
      await client.query(`
        INSERT INTO third_level_officials_profiling_application (
            application_id, app_TLOid, first_name, last_name, email, application_status, created_at, updated_at
        ) VALUES (DEFAULT, $1, $2, $3, $4, NULL, NOW(), NOW())
      `, [appTloId, first_name, last_name, normalizedEmailInit]);
    }

    await client.query('COMMIT');
    res.json({ success: true, TLOid: appTloId, message: 'Personnel added successfully', newPersonnel: { TLOid: appTloId, first_name, last_name, email: normalizedEmailInit, employee_number } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const registerPersonnel = async (req, res) => {
  const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const {
    first_name,
    middle_name,
    last_name,
    email,
    position_title,
    strand,
    region,
    office,
    division,
    designation,
    alt_email_1,
    alt_email_2,
    contact_details,
    alt_contact_1,
    alt_contact_2
  } = req.body;

  if (!email || !first_name || !last_name) return res.json({ success: false, error: 'Missing required fields' });

  const client = await pool.connect();
  try {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@deped.gov.ph')) {
      return res.json({ success: false, error: 'Only @deped.gov.ph emails are allowed for DepEd Email.' });
    }

    const mName = (middle_name || '').trim().toUpperCase();
    const fName = (first_name || '').trim().toUpperCase();
    const upperFirstName = mName ? `${fName} ${mName}` : fName;
    const upperLastName = (last_name || '').trim().toUpperCase();

    const masterCheck = await client.query('SELECT 1 FROM third_level_official_masterlist WHERE LOWER(email) = $1', [normalizedEmail]);

    if (masterCheck.rows.length > 0) {
      return res.json({ success: false, error: 'Email already exists in the masterlist. Please use a different email address.' });
    }

    await client.query('BEGIN');

    const uidRes = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING("TLOid" FROM 5) AS INTEGER)), 0) AS max_num
      FROM third_level_official_masterlist WHERE "TLOid" ~ '^TLO-[0-9]{4}$'
    `);
    const nextNum = parseInt(uidRes.rows[0].max_num) + 1;
    const tloId = `TLO-${String(nextNum).padStart(4, '0')}`;

    await client.query(`
      INSERT INTO third_level_official_masterlist (
          "TLOid", first_name, last_name, email, position_title, 
          strand, region, office, division, designation, 
          alt_email_1, alt_email_2, contact_details, alt_contact_details_1, alt_contact_details_2,
          status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Active', NOW(), NOW())
    `, [
      tloId, upperFirstName, upperLastName, normalizedEmail, position_title,
      (strand || '').trim(), (region || '').trim(), (office || '').trim(), (division || '').trim(), (designation || '').trim(),
      (alt_email_1 || '').trim(), (alt_email_2 || '').trim(), (contact_details || '').trim(), (alt_contact_1 || '').trim(), (alt_contact_2 || '').trim()
    ]);

    await client.query('COMMIT');
    res.json({ success: true, TLOid: tloId, message: 'Personnel registered successfully', newPersonnel: { TLOid: tloId, first_name: upperFirstName, last_name: upperLastName, email: normalizedEmail, position_title } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const getUnassignedPersonnel = async (req, res) => {
  const adminRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office', 'Regional Office', 'School Division Office'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { search } = req.query;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  try {
    await ensureOicColumn();
    const appEmployeeExpr = await getOptionalColumnExpression(
      'third_level_officials_profiling_application',
      'a',
      ['employee_number', 'employee_no', 'emp_no']
    );
    const userEmployeeExpr = await getOptionalColumnExpression(
      'tlo_users',
      'u',
      ['employee_number', 'employee_no', 'emp_no']
    );
    const params = [];
    let query = `
      SELECT DISTINCT ON (LOWER(COALESCE(a.email, u.email)))
        COALESCE(a.app_TLOid, u.uid) AS "TLOid",
        COALESCE(NULLIF(a.first_name, ''), u.first_name) AS first_name,
        COALESCE(NULLIF(a.last_name, ''), u.last_name) AS last_name,
        COALESCE(a.email, u.email) AS email,
        COALESCE(${appEmployeeExpr}, ${userEmployeeExpr}) AS employee_number,
        COALESCE(a.contact_details, u.contact_number) AS contact_details
      FROM tlo_users u
      FULL JOIN third_level_officials_profiling_application a
        ON LOWER(a.email) = LOWER(u.email)
      WHERE COALESCE(a.email, u.email) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM third_level_official_masterlist m
          WHERE LOWER(m.email) = LOWER(COALESCE(a.email, u.email))
            AND m.status = 'Active'
        )
        AND COALESCE(NULLIF(a.first_name, ''), u.first_name) IS NOT NULL
    `;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        COALESCE(a.first_name, u.first_name) ILIKE $${params.length}
        OR COALESCE(a.last_name, u.last_name) ILIKE $${params.length}
        OR CONCAT_WS(' ', COALESCE(NULLIF(a.first_name, ''), u.first_name), COALESCE(NULLIF(a.last_name, ''), u.last_name)) ILIKE $${params.length}
        OR COALESCE(a.app_TLOid, u.uid) ILIKE $${params.length}
        OR COALESCE(a.email, u.email) ILIKE $${params.length}
        OR COALESCE(${appEmployeeExpr}, ${userEmployeeExpr}) ILIKE $${params.length}
      )`;
    }

    params.push(limit);
    query += ` ORDER BY LOWER(COALESCE(a.email, u.email)), last_name ASC, first_name ASC LIMIT $${params.length}`;
    const result = await officialsRepository.runQuery(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const adminAction = async (req, res) => {
  if (req.user.role !== 'Personnel Admin' && req.user.role !== 'Admin' && req.user.role !== 'Super User' && req.user.role !== 'Central Office') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { TLOid, action, justification, effectivityDate, target_TLOid, successor_TLOid, assignee_TLOid, vacateReason } = req.body;
  if (!TLOid || !action) return res.status(400).json({ error: 'TLOid and action are required' });

  let effTs = 'NOW()';
  let isFuture = false;

  if (effectivityDate) {
    const parsedDate = new Date(effectivityDate);
    if (!isNaN(parsedDate.getTime())) {
      effTs = `'${parsedDate.toISOString()}'::timestamp`;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const effDateObj = new Date(parsedDate);
      effDateObj.setHours(0, 0, 0, 0);

      isFuture = effDateObj > today;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureOicColumn(client);

    const currentRes = await client.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [TLOid]);
    const official = currentRes.rows[0];
    if (!official) throw new Error('Official not found');

    if (official.first_name && official.first_name !== 'VACANT' && action !== 'reassign') {
      await client.query(`
        INSERT INTO third_level_officials_updates
          ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), ${effTs}, $10)
      `, [official.TLOid, official.first_name, official.last_name, official.position_title,
      official.office, official.strand, official.email,
      action === 'vacate' ? 'Vacated' : action === 'succeed' ? 'Succeeded' : action === 'cancel-vacate' ? 'Active' : 'Reassigned',
      justification || 'Administrative action', vacateReason || null]);
    }

    if (action === 'cancel-vacate') {
      await client.query(`
        UPDATE third_level_official_masterlist
        SET status = 'Active', updated_at = NOW(), effectivity_date = NULL, reassign_target_tloid = NULL, reassign_assignee_tloid = NULL
        WHERE "TLOid" = $1
      `, [TLOid]);

    } else if (action === 'vacate') {
      if (isFuture) {
        if (vacateReason === 'Resignation') {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Resigning', updated_at = NOW(), effectivity_date = ${effTs}
            WHERE "TLOid" = $1
          `, [TLOid]);
        } else {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Vacating', updated_at = NOW(), effectivity_date = ${effTs}
            WHERE "TLOid" = $1
          `, [TLOid]);
        }
      } else {
        if (vacateReason === 'Resignation') {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Inactive', updated_at = NOW(), effectivity_date = ${effTs}
            WHERE "TLOid" = $1
          `, [TLOid]);
        } else {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Vacated', first_name = NULL, last_name = NULL, email = NULL, updated_at = NOW(), effectivity_date = ${effTs}
            WHERE "TLOid" = $1
          `, [TLOid]);
        }
      }

    } else if (action === 'succeed') {
      if (successor_TLOid) {
        const successorRes = await client.query('SELECT * FROM third_level_official_masterlist WHERE "TLOid" = $1', [successor_TLOid]);
        const successor = successorRes.rows[0];
        if (!successor) throw new Error('Successor not found in masterlist');

        await client.query(`
          INSERT INTO third_level_officials_updates
            ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Vacated', $8, NOW(), ${effTs}, $9)
        `, [successor_TLOid, successor.first_name, successor.last_name, successor.position_title,
          successor.office, successor.strand, successor.email, `Succeeding ${official.first_name} ${official.last_name}`, null]);

        await client.query(`
          UPDATE third_level_official_masterlist
          SET status = 'Vacated', first_name = NULL, last_name = NULL, email = NULL,
              updated_at = NOW(), effectivity_date = ${effTs}
          WHERE "TLOid" = $1
        `, [successor_TLOid]);

        await client.query(`
          UPDATE third_level_official_masterlist
          SET first_name = $1, last_name = $2, email = $3, status = 'Active', updated_at = NOW(), effectivity_date = ${effTs}
          WHERE "TLOid" = $4
        `, [successor.first_name, successor.last_name, successor.email, TLOid]);

        await client.query(`
          INSERT INTO third_level_officials_updates
            ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date, vacate_reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, NOW(), ${effTs}, $9)
        `, [TLOid, successor.first_name, successor.last_name, official.position_title,
          official.office, official.strand, successor.email, `Succession from ${successor.position_title}`, null]);
      } else {
        await client.query(`
          UPDATE third_level_official_masterlist
          SET status = 'Succeeded', first_name = NULL, last_name = NULL, email = NULL, updated_at = NOW(), effectivity_date = ${effTs}
          WHERE "TLOid" = $1
        `, [TLOid]);
      }

    } else if (action === 'reassign') {
      if (isFuture) {
        if (assignee_TLOid) {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Pending Assignment', updated_at = NOW(), effectivity_date = ${effTs}, reassign_assignee_tloid = $2
            WHERE "TLOid" = $1
          `, [TLOid, assignee_TLOid]);

          await client.query(`
            INSERT INTO third_level_officials_updates
              ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending Assignment', $8, NOW(), ${effTs})
          `, [TLOid, official.first_name, official.last_name, official.position_title, official.office, official.strand, official.email, justification || null]);

        } else if (target_TLOid) {
          await client.query(`
            UPDATE third_level_official_masterlist
            SET status = 'Reassigning', updated_at = NOW(), effectivity_date = ${effTs}, reassign_target_tloid = $2
            WHERE "TLOid" = $1
          `, [TLOid, target_TLOid]);

          await client.query(`
            INSERT INTO third_level_officials_updates
              ("TLOid", first_name, last_name, position_title, office, strand, email, status, remarks, updated_at, effectivity_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Reassigning', $8, NOW(), ${effTs})
          `, [TLOid, official.first_name, official.last_name, official.position_title, official.office, official.strand, official.email, justification || null]);
        }
      } else {
        await executeReassignment(client, official, effTs, justification, assignee_TLOid, target_TLOid);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const toggleTestAccount = async (req, res) => {
  const allowedRoles = ['Personnel Admin', 'Admin', 'Super User', 'Central Office'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { TLOid, is_testaccount } = req.body;
  if (!TLOid) {
    return res.status(400).json({ error: 'TLOid is required' });
  }

  try {
    const result = await officialsRepository.updateTestAccount(TLOid, is_testaccount);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Official record not found' });
    }

    res.json({
      success: true,
      message: `Official ${TLOid} test status updated to ${is_testaccount}`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error toggling test account:', err);
    res.status(500).json({ error: err.message });
  }
};

import pool from '../../../config/db.js';

export const getPoolingConfig = async () => {
  const query = `
    SELECT id, is_intake_active, intake_start_date, intake_end_date, created_at, updated_at
    FROM pooling_configurations
    ORDER BY id ASC
    LIMIT 1;
  `;
  const result = await pool.query(query);
  if (result.rows.length === 0) {
    return {
      id: 1,
      is_intake_active: true,
      intake_start_date: null,
      intake_end_date: null
    };
  }
  return result.rows[0];
};

export const createApplication = async (data) => {
  const {
    candidate_id,
    candidate_name,
    first_name,
    last_name,
    email,
    contact_number,
    applied_position,
    target_region,
    questionnaire_responses,
    document_attachments
  } = data;

  const query = `
    INSERT INTO applications (
      candidate_id,
      candidate_name,
      first_name,
      last_name,
      email,
      contact_number,
      applied_position,
      target_region,
      questionnaire_responses,
      document_attachments,
      submission_timestamp,
      evaluation_scores,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), '{}'::jsonb, 'submitted')
    RETURNING *;
  `;

  const values = [
    candidate_id || null,
    candidate_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Anonymous Candidate',
    first_name || null,
    last_name || null,
    email || null,
    contact_number || null,
    applied_position,
    target_region,
    JSON.stringify(questionnaire_responses || {}),
    JSON.stringify(document_attachments || [])
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findApplications = async ({ page = 1, limit = 10, sortBy = 'submission_timestamp', sortOrder = 'DESC', search = '', position = '', region = '' }) => {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const safeLimit = Math.max(1, parseInt(limit, 10));

  const allowedSortCols = {
    submission_timestamp: 'a.submission_timestamp',
    candidate_name: 'a.candidate_name',
    applied_position: 'a.applied_position',
    target_region: 'a.target_region',
    status: 'a.status',
    overall_qualification_status: 'a.overall_qualification_status'
  };
  const sortCol = allowedSortCols[sortBy] || 'a.submission_timestamp';
  const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(
      a.candidate_name ILIKE $${params.length} OR 
      a.email ILIKE $${params.length} OR 
      a.applied_position ILIKE $${params.length} OR 
      a.target_region ILIKE $${params.length}
    )`);
  }

  if (position && position !== 'All') {
    params.push(position);
    conditions.push(`a.applied_position = $${params.length}`);
  }

  if (region && region !== 'All') {
    params.push(region);
    conditions.push(`a.target_region = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM applications a ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataQuery = `
    SELECT 
      a.id,
      a.candidate_id,
      a.candidate_name,
      a.first_name,
      a.last_name,
      a.email,
      a.contact_number,
      a.applied_position,
      a.target_region,
      a.submission_timestamp,
      a.status,
      a.evaluation_scores,
      a.evaluation_notes,
      a.qs_education_met,
      a.qs_experience_met,
      a.qs_training_met,
      a.qs_eligibility_met,
      COALESCE(a.overall_qualification_status, 'UNASSESSED') AS overall_qualification_status,
      a.created_at,
      COALESCE(nsc.nsc_evaluator_count, 0) AS nsc_evaluator_count,
      CASE 
        WHEN COALESCE(nsc.nsc_evaluator_count, 0) >= 5 THEN nsc.nsc_avg_score
        ELSE NULL
      END AS nsc_average_score
    FROM applications a
    LEFT JOIN (
      SELECT 
        application_id,
        COUNT(DISTINCT evaluator_id)::int AS nsc_evaluator_count,
        ROUND(AVG(total)::numeric, 2) AS nsc_avg_score
      FROM nsc_scores
      GROUP BY application_id
    ) nsc ON nsc.application_id = a.id
    ${whereClause}
    ORDER BY ${sortCol} ${orderDir}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const dataResult = await pool.query(dataQuery, [...params, safeLimit, offset]);

  return {
    rows: dataResult.rows,
    total,
    page: parseInt(page, 10),
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit)
  };
};

export const findApplicationById = async (id) => {
  const query = `
    SELECT 
      id,
      candidate_id,
      candidate_name,
      first_name,
      last_name,
      email,
      contact_number,
      applied_position,
      target_region,
      submission_timestamp,
      questionnaire_responses,
      document_attachments,
      evaluation_scores,
      evaluation_notes,
      qs_education_met,
      qs_experience_met,
      qs_training_met,
      qs_eligibility_met,
      COALESCE(overall_qualification_status, 'UNASSESSED') AS overall_qualification_status,
      status,
      created_at,
      updated_at
    FROM applications
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const updateApplicationQS = async (id, { qs_education_met, qs_experience_met, qs_training_met, qs_eligibility_met, overall_qualification_status }) => {
  const query = `
    UPDATE applications
    SET 
      qs_education_met = $1,
      qs_experience_met = $2,
      qs_training_met = $3,
      qs_eligibility_met = $4,
      overall_qualification_status = $5,
      updated_at = NOW()
    WHERE id = $6
    RETURNING *;
  `;
  const result = await pool.query(query, [
    qs_education_met,
    qs_experience_met,
    qs_training_met,
    qs_eligibility_met,
    overall_qualification_status,
    id
  ]);
  return result.rows[0] || null;
};

export const getNSCScoresByApplicationId = async (applicationId) => {
  const query = `
    SELECT 
      id,
      application_id,
      evaluator_id,
      evaluator_name,
      leadership,
      experience,
      education,
      interview,
      total,
      notes,
      created_at,
      updated_at
    FROM nsc_scores
    WHERE application_id = $1
    ORDER BY evaluator_id ASC;
  `;
  const result = await pool.query(query, [applicationId]);
  return result.rows;
};

export const getNSCAggregation = async (applicationId) => {
  const query = `
    SELECT 
      ROUND(AVG(total)::numeric, 2) AS overall_average_score,
      ROUND(AVG(leadership)::numeric, 2) AS avg_leadership,
      ROUND(AVG(experience)::numeric, 2) AS avg_experience,
      ROUND(AVG(education)::numeric, 2) AS avg_education,
      ROUND(AVG(interview)::numeric, 2) AS avg_interview,
      COUNT(DISTINCT evaluator_id)::int AS evaluator_count
    FROM nsc_scores
    WHERE application_id = $1;
  `;
  const result = await pool.query(query, [applicationId]);
  const row = result.rows[0];
  return {
    overall_average_score: row && row.overall_average_score !== null ? parseFloat(row.overall_average_score) : null,
    evaluator_count: row ? parseInt(row.evaluator_count, 10) : 0,
    criteria_averages: {
      leadership: row && row.avg_leadership !== null ? parseFloat(row.avg_leadership) : null,
      experience: row && row.avg_experience !== null ? parseFloat(row.avg_experience) : null,
      education: row && row.avg_education !== null ? parseFloat(row.avg_education) : null,
      interview: row && row.avg_interview !== null ? parseFloat(row.avg_interview) : null
    }
  };
};

export const upsertNSCScore = async (applicationId, scoreData) => {
  const {
    evaluator_id,
    evaluator_name,
    leadership = 0,
    experience = 0,
    education = 0,
    interview = 0,
    notes = ''
  } = scoreData;

  const l = Math.min(100, Math.max(0, parseFloat(leadership) || 0));
  const ex = Math.min(100, Math.max(0, parseFloat(experience) || 0));
  const ed = Math.min(100, Math.max(0, parseFloat(education) || 0));
  const i = Math.min(100, Math.max(0, parseFloat(interview) || 0));
  const total = parseFloat(((l * 0.35) + (ex * 0.35) + (ed * 0.20) + (i * 0.10)).toFixed(2));

  const query = `
    INSERT INTO nsc_scores (
      application_id,
      evaluator_id,
      evaluator_name,
      leadership,
      experience,
      education,
      interview,
      total,
      notes,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (application_id, evaluator_id)
    DO UPDATE SET
      evaluator_name = COALESCE(EXCLUDED.evaluator_name, nsc_scores.evaluator_name),
      leadership = EXCLUDED.leadership,
      experience = EXCLUDED.experience,
      education = EXCLUDED.education,
      interview = EXCLUDED.interview,
      total = EXCLUDED.total,
      notes = COALESCE(EXCLUDED.notes, nsc_scores.notes),
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    applicationId,
    String(evaluator_id),
    evaluator_name || `Committee Member ${evaluator_id}`,
    l,
    ex,
    ed,
    i,
    total,
    notes || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findApplicationsByCandidate = async (candidateId, email) => {
  const query = `
    SELECT 
      id,
      candidate_id,
      candidate_name,
      first_name,
      last_name,
      email,
      contact_number,
      applied_position,
      target_region,
      submission_timestamp,
      status,
      qs_education_met,
      qs_experience_met,
      qs_training_met,
      qs_eligibility_met,
      overall_qualification_status,
      evaluation_scores,
      created_at
    FROM applications
    WHERE candidate_id = $1::text OR (email IS NOT NULL AND email = $2::text)
    ORDER BY submission_timestamp DESC;
  `;
  const result = await pool.query(query, [String(candidateId || ''), String(email || '')]);
  return result.rows;
};

export const updateApplicationEvaluation = async (id, scores, notes) => {
  const query = `
    UPDATE applications
    SET 
      evaluation_scores = $1,
      evaluation_notes = COALESCE($2, evaluation_notes),
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [JSON.stringify(scores || {}), notes, id]);
  return result.rows[0] || null;
};

export const findBinaryMetadata = async (binaryIds) => {
  if (!binaryIds || binaryIds.length === 0) return [];
  const query = `
    SELECT id, mime_type, size_bytes, azure_blob_url, created_at
    FROM unified_binaries
    WHERE id = ANY($1::uuid[]);
  `;
  try {
    const result = await pool.query(query, [binaryIds]);
    return result.rows;
  } catch (_err) {
    return [];
  }
};


import {
  getPoolingConfig,
  createApplication,
  findApplications,
  findApplicationById,
  updateApplicationEvaluation,
  findBinaryMetadata,
  updateApplicationQS,
  getNSCScoresByApplicationId,
  getNSCAggregation,
  upsertNSCScore,
  findApplicationsByCandidate
} from './repositories/poolingRepository.js';

const ALLOWED_ADMIN_ROLES = [
  'Personnel Admin',
  'Admin',
  'Super User',
  'Central Office',
  'Regional Office',
  'School Division Office',
  'RO HRMO',
  'SDO HRMO'
];

const ALLOWED_POSITIONS = ['RD', 'ARD', 'SDS', 'ASDS'];

export const getPoolingStatus = async (_req, res) => {
  try {
    const config = await getPoolingConfig();
    const now = new Date();
    let isOpen = Boolean(config.is_intake_active);

    if (config.intake_start_date && new Date(config.intake_start_date) > now) {
      isOpen = false;
    }
    if (config.intake_end_date && new Date(config.intake_end_date) < now) {
      isOpen = false;
    }

    res.json({
      success: true,
      isOpen,
      is_intake_active: config.is_intake_active,
      intake_start_date: config.intake_start_date,
      intake_end_date: config.intake_end_date,
      message: isOpen
        ? 'TIMON applications intake window is currently open.'
        : 'TIMON applications intake window is currently closed.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const submitApplication = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid authentication token required to submit applications.'
    });
  }

  try {
    // 1. Enforce intake window state
    const config = await getPoolingConfig();
    const now = new Date();
    let isOpen = Boolean(config.is_intake_active);

    if (config.intake_start_date && new Date(config.intake_start_date) > now) {
      isOpen = false;
    }
    if (config.intake_end_date && new Date(config.intake_end_date) < now) {
      isOpen = false;
    }

    if (!isOpen) {
      return res.status(403).json({
        success: false,
        error: 'TIMON applications intake window is currently closed. Submissions are rejected.'
      });
    }

    // 2. Strictly validate applied_position against allowed set
    const appliedPosition = String(req.body.applied_position || '').trim().toUpperCase();
    if (!ALLOWED_POSITIONS.includes(appliedPosition)) {
      return res.status(400).json({
        success: false,
        error: `Invalid applied position '${appliedPosition}'. Allowed positions are strictly: ${ALLOWED_POSITIONS.join(', ')}.`
      });
    }

    // 3. Validate presence of target_region
    const targetRegion = String(req.body.target_region || '').trim();
    if (!targetRegion) {
      return res.status(400).json({
        success: false,
        error: 'Target region is required.'
      });
    }

    // 4. Validate presence of questionnaire answers
    const questionnaire = req.body.questionnaire_responses;
    if (!questionnaire || typeof questionnaire !== 'object' || Object.keys(questionnaire).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Questionnaire responses are required.'
      });
    }

    // 5. Validate presence of required document attachments
    const documents = req.body.document_attachments;
    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document attachments are required. Please upload required supporting documents.'
      });
    }

    const candidateId = req.user?.uid || req.user?.TLOid || req.user?.id || req.body.candidate_id || req.body.email || 'APP-' + Date.now();
    const candidateName = req.body.candidate_name || `${req.body.first_name || ''} ${req.body.last_name || ''}`.trim() || req.user?.name || `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || 'Applicant';

    const newApp = await createApplication({
      candidate_id: candidateId,
      candidate_name: candidateName,
      first_name: req.body.first_name || req.user?.first_name || null,
      last_name: req.body.last_name || req.user?.last_name || null,
      email: req.body.email || req.user?.email || null,
      contact_number: req.body.contact_number || req.user?.contact_number || null,
      applied_position: appliedPosition,
      target_region: targetRegion,
      questionnaire_responses: questionnaire,
      document_attachments: documents
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully to TIMON applications.',
      data: {
        id: newApp.id,
        candidate_id: newApp.candidate_id,
        candidate_name: newApp.candidate_name,
        applied_position: newApp.applied_position,
        target_region: newApp.target_region,
        submission_timestamp: newApp.submission_timestamp
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminApplications = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { page = 1, limit = 10, sortBy = 'submission_timestamp', sortOrder = 'DESC', search = '', position = '', region = '' } = req.query;

    const result = await findApplications({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      position,
      region
    });

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        candidate_id: row.candidate_id,
        candidate_name: row.candidate_name,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        contact_number: row.contact_number,
        applied_position: row.applied_position,
        target_region: row.target_region,
        submission_timestamp: row.submission_timestamp,
        status: row.status,
        overall_qualification_status: row.overall_qualification_status || 'UNASSESSED',
        nsc_average_score: row.nsc_average_score !== null && row.nsc_average_score !== undefined
          ? parseFloat(row.nsc_average_score)
          : null,
        nsc_evaluator_count: row.nsc_evaluator_count ? parseInt(row.nsc_evaluator_count, 10) : 0,
        evaluation_scores: row.evaluation_scores,
        evaluation_notes: row.evaluation_notes
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminApplicationDetail = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { id } = req.params;
    const application = await findApplicationById(id);

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    // Process uploaded documents and gather binary metadata
    const rawDocs = Array.isArray(application.document_attachments) ? application.document_attachments : [];
    const binaryIds = rawDocs
      .map(d => d.binary_id || d.id)
      .filter(idVal => idVal && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idVal));

    const binaryMetaList = await findBinaryMetadata(binaryIds);
    const metaMap = new Map();
    binaryMetaList.forEach(m => metaMap.set(m.id, m));

    const documents = rawDocs.map(doc => {
      const bId = doc.binary_id || doc.id || null;
      const bMeta = bId ? metaMap.get(bId) : null;
      return {
        file_name: doc.file_name || doc.name || `${doc.doc_type || 'document'}.pdf`,
        doc_type: doc.doc_type || 'attachment',
        binary_id: bId,
        preview_url: bId ? `/api/binary/${bId}` : null,
        download_url: bId ? `/api/binary/${bId}` : null,
        mime_type: bMeta?.mime_type || doc.mime_type || 'application/pdf',
        size_bytes: bMeta?.size_bytes || doc.size_bytes || null,
        uploaded_at: bMeta?.created_at || doc.uploaded_at || application.submission_timestamp
      };
    });

    // Provide structured placeholder or existing evaluation data
    const evaluationScores = application.evaluation_scores && Object.keys(application.evaluation_scores).length > 0
      ? application.evaluation_scores
      : {
          leadership: null,
          experience: null,
          education: null,
          interview: null,
          total: null
        };

    const nscScores = await getNSCScoresByApplicationId(id);
    const nscAggregation = await getNSCAggregation(id);

    res.json({
      success: true,
      data: {
        id: application.id,
        candidate_id: application.candidate_id,
        candidate_name: application.candidate_name,
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        contact_number: application.contact_number,
        applied_position: application.applied_position,
        target_region: application.target_region,
        submission_timestamp: application.submission_timestamp,
        questionnaire_responses: application.questionnaire_responses || {},
        documents,
        evaluation_scores: evaluationScores,
        evaluation_notes: application.evaluation_notes || '',
        qs_education_met: Boolean(application.qs_education_met),
        qs_experience_met: Boolean(application.qs_experience_met),
        qs_training_met: Boolean(application.qs_training_met),
        qs_eligibility_met: Boolean(application.qs_eligibility_met),
        overall_qualification_status: application.overall_qualification_status || null,
        nsc_scores: nscScores,
        nsc_average_score: nscAggregation.overall_average_score,
        nsc_summary: nscAggregation,
        status: application.status,
        created_at: application.created_at,
        updated_at: application.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateApplicationQSController = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { id } = req.params;
    const {
      qs_education_met,
      qs_experience_met,
      qs_training_met,
      qs_eligibility_met
    } = req.body;

    // Crucial Logic: Calculate overall_qualification_status strictly on the server-side.
    // If all 4 criteria are true, set to 'QUALIFIED'. If ANY criteria is false, set to 'NOT QUALIFIED'.
    const isEdu = Boolean(qs_education_met);
    const isExp = Boolean(qs_experience_met);
    const isTrain = Boolean(qs_training_met);
    const isElig = Boolean(qs_eligibility_met);

    const overall_qualification_status = (isEdu && isExp && isTrain && isElig)
      ? 'QUALIFIED'
      : 'NOT QUALIFIED';

    const updated = await updateApplicationQS(id, {
      qs_education_met: isEdu,
      qs_experience_met: isExp,
      qs_training_met: isTrain,
      qs_eligibility_met: isElig,
      overall_qualification_status
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    res.json({
      success: true,
      message: 'Qualification Standards (QS) evaluation updated successfully.',
      data: {
        id: updated.id,
        qs_education_met: updated.qs_education_met,
        qs_experience_met: updated.qs_experience_met,
        qs_training_met: updated.qs_training_met,
        qs_eligibility_met: updated.qs_eligibility_met,
        overall_qualification_status: updated.overall_qualification_status,
        updated_at: updated.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getNSCScoresController = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { id } = req.params;
    const application = await findApplicationById(id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    const scores = await getNSCScoresByApplicationId(id);
    const aggregation = await getNSCAggregation(id);

    res.json({
      success: true,
      data: {
        application_id: parseInt(id, 10),
        scores,
        overall_average_score: aggregation.overall_average_score,
        evaluator_count: aggregation.evaluator_count,
        criteria_averages: aggregation.criteria_averages
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const saveNSCScoreController = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { id } = req.params;
    const application = await findApplicationById(id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    const payload = req.body;

    if (Array.isArray(payload.scores)) {
      for (const item of payload.scores) {
        if (item && (item.evaluator_id !== undefined && item.evaluator_id !== null)) {
          await upsertNSCScore(id, item);
        }
      }
    } else if (payload.evaluator_id !== undefined || req.params.evaluatorId !== undefined) {
      const evaluatorId = req.params.evaluatorId || payload.evaluator_id;
      await upsertNSCScore(id, { ...payload, evaluator_id: evaluatorId });
    } else {
      return res.status(400).json({ success: false, error: 'evaluator_id or scores array is required.' });
    }

    const updatedScores = await getNSCScoresByApplicationId(id);
    const aggregation = await getNSCAggregation(id);

    // Keep application.evaluation_scores total synced with overall average
    if (aggregation.overall_average_score !== null) {
      await updateApplicationEvaluation(id, {
        ...(application.evaluation_scores || {}),
        total: aggregation.overall_average_score
      });
    }

    res.json({
      success: true,
      message: 'NSC evaluator score(s) saved successfully.',
      data: {
        application_id: parseInt(id, 10),
        scores: updatedScores,
        overall_average_score: aggregation.overall_average_score,
        evaluator_count: aggregation.evaluator_count,
        criteria_averages: aggregation.criteria_averages
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateAdminEvaluation = async (req, res) => {
  if (!req.user || !ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied: Admin credentials required.' });
  }

  try {
    const { id } = req.params;
    const { evaluation_scores, evaluation_notes } = req.body;

    const updated = await updateApplicationEvaluation(id, evaluation_scores, evaluation_notes);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    res.json({
      success: true,
      message: 'Evaluation and scoring saved successfully.',
      data: {
        id: updated.id,
        evaluation_scores: updated.evaluation_scores,
        evaluation_notes: updated.evaluation_notes,
        updated_at: updated.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMyApplications = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }

  try {
    const candidateId = req.user.TLOid || req.user.id || req.user.email;
    const userEmail = req.user.email;
    const applications = await findApplicationsByCandidate(candidateId, userEmail);

    res.json({
      success: true,
      data: applications
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


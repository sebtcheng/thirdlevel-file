import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import pool from '../src/config/db.js';

let server;
let base;
let adminToken;
let applicantToken;
let jwtSecret;
const createdCandidateIds = [];

// Each submission uses its own applicant, because the API allows one application per registrant per period.
const mkApplicantToken = (id) => {
  createdCandidateIds.push(String(id));
  return jwt.sign({ id, role: 'TLO Applicant', email: `applicant.${id}@deped.gov.ph`, name: 'Applicant Test' }, jwtSecret, { expiresIn: '1h' });
};

beforeAll(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;

  const secret = process.env.JWT_SECRET || 'STRIDE_INSIGHTED_SECRET_2026_KEY_PROD';
  jwtSecret = secret;
  adminToken = jwt.sign(
    { id: 9999, role: 'Central Office', email: 'admin.records@deped.gov.ph', name: 'Records Admin' },
    secret,
    { expiresIn: '1h' }
  );
  applicantToken = jwt.sign(
    { id: 1001, role: 'TLO Applicant', email: 'applicant.test@deped.gov.ph', name: 'Applicant Test' },
    secret,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  // Remove the applications these tests created so reruns start clean.
  if (createdCandidateIds.length) {
    await pool.query('DELETE FROM applications WHERE candidate_id = ANY($1::text[])', [createdCandidateIds]);
  }
  await new Promise((resolve) => server.close(resolve));
});

describe('Applicant Pooling & Records Management API', () => {
  it('synchronizes submission dates and enforces the window for signed-in applicants', async () => {
    const { rows: [config] } = await pool.query('SELECT * FROM pooling_configurations ORDER BY id LIMIT 1');
    const { rows: [period] } = await pool.query('SELECT * FROM application_periods WHERE is_active = TRUE');
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    try {
      const denied = await fetch(`${base}/api/pooling/status`, {
        method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${applicantToken}` },
        body: JSON.stringify({ start_date: '2099-01-01', end_date: '2099-01-31' })
      });
      expect(denied.status).toBe(403);
      const saved = await fetch(`${base}/api/pooling/status`, {
        method: 'PATCH', headers, body: JSON.stringify({ start_date: '2099-01-01', end_date: '2099-01-31' })
      });
      expect(saved.status).toBe(200);
      expect((await saved.json()).isOpen).toBe(false);
      const { rows: [updated] } = await pool.query('SELECT * FROM application_periods WHERE is_active = TRUE');
      expect(updated.start_date.toISOString()).toBe('2098-12-31T16:00:00.000Z');
      expect(updated.end_date.toISOString()).toBe('2099-01-31T15:59:59.999Z');
      const { rows: [intake] } = await pool.query('SELECT * FROM pooling_configurations WHERE id = $1', [config.id]);
      expect(intake.is_intake_active).toBe(config.is_intake_active);
      expect(intake.intake_start_date).toEqual(updated.start_date);
      const submitted = await fetch(`${base}/api/pooling/applications`, {
        method: 'POST', headers: { ...headers, Authorization: `Bearer ${applicantToken}` }, body: '{}'
      });
      expect(submitted.status).toBe(403);
    } finally {
      await pool.query('UPDATE pooling_configurations SET intake_start_date=$1, intake_end_date=$2, updated_at=$3 WHERE id=$4', [config.intake_start_date, config.intake_end_date, config.updated_at, config.id]);
      if (period) await pool.query('UPDATE application_periods SET start_date=$1, end_date=$2, updated_at=$3 WHERE id=$4', [period.start_date, period.end_date, period.updated_at, period.id]);
      else await pool.query("DELETE FROM application_periods WHERE is_active = TRUE AND name = 'TIMON Application Period'");
    }
  });

  it('withdrawal permanently deletes application details and scores without retaining history', async () => {
    const token = mkApplicantToken(910004);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const payload = {
      applied_position: 'RD', target_region: 'Region VI', first_name: 'WITHDRAWAL', last_name: 'TEST',
      questionnaire_responses: { pending_admin_case: 'No' },
      document_attachments: [{ doc_type: 'pds', binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }]
    };
    const created = await fetch(`${base}/api/pooling/applications`, { method: 'POST', headers, body: JSON.stringify(payload) });
    expect(created.status).toBe(201);
    const { data: { id } } = await created.json();
    await pool.query("INSERT INTO nsc_scores (application_id, evaluator_id) VALUES ($1, 'withdrawal-test')", [id]);
    const stranger = await fetch(`${base}/api/pooling/history/${id}/withdraw`, {
      method: 'POST', headers: { Authorization: `Bearer ${applicantToken}` }
    });
    expect(stranger.status).toBe(404);
    expect((await pool.query('SELECT id FROM applications WHERE id = $1', [id])).rowCount).toBe(1);
    const withdrawn = await fetch(`${base}/api/pooling/history/${id}/withdraw`, { method: 'POST', headers });
    expect(withdrawn.status).toBe(200);
    expect((await pool.query('SELECT id FROM applications WHERE id = $1', [id])).rowCount).toBe(0);
    expect((await pool.query('SELECT id FROM nsc_scores WHERE application_id = $1', [id])).rowCount).toBe(0);
    const history = await (await fetch(`${base}/api/pooling/history`, { headers })).json();
    expect(history.data.some(item => item.id === id)).toBe(false);
    const adminList = await (await fetch(`${base}/api/admin/records/applications?search=WITHDRAWAL`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })).json();
    expect(adminList.data.some(item => item.id === id)).toBe(false);
    expect((await fetch(`${base}/api/pooling/history/${id}/withdraw`, { method: 'POST', headers })).status).toBe(404);
    expect((await fetch(`${base}/api/pooling/history/${id}`, { headers })).status).toBe(404);
    expect((await fetch(`${base}/api/admin/records/applications/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })).status).toBe(404);
    const strangerHistory = await (await fetch(`${base}/api/pooling/history`, {
      headers: { Authorization: `Bearer ${applicantToken}` }
    })).json();
    expect(strangerHistory.data.some(item => item.id === id)).toBe(false);
    const resubmitted = await fetch(`${base}/api/pooling/applications`, { method: 'POST', headers, body: JSON.stringify(payload) });
    expect(resubmitted.status).toBe(201);
  });

  it('GET /api/pooling/status returns window state without leaking raw vacancy counts', async () => {
    const res = await fetch(`${base}/api/pooling/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.isOpen).toBe('boolean');
    // Ensure no raw counts or item numbers leaked
    expect(data.vacancies).toBeUndefined();
    expect(data.item_numbers).toBeUndefined();
    expect(data.count).toBeUndefined();
  });

  it('POST /api/pooling/applications returns 401 when accessed unauthenticated', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applied_position: 'RD',
        target_region: 'Region IV-A'
      })
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/pooling/applications returns 401 when accessed unauthenticated', async () => {
    const res = await fetch(`${base}/api/pooling/applications`);
    expect(res.status).toBe(401);
  });

  it('GET /api/applications returns 401 when accessed unauthenticated', async () => {
    const res = await fetch(`${base}/api/applications`);
    expect(res.status).toBe(401);
  });

  it('GET /api/pooling/applications returns candidate applications when authenticated', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      headers: { Authorization: `Bearer ${applicantToken}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('POST /api/pooling/applications rejects invalid applied_position', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`
      },
      body: JSON.stringify({
        applied_position: 'INVALID_ROLE',
        target_region: 'Region IV-A',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: [{ binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }]
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid applied position');
  });

  it('POST /api/pooling/applications rejects missing target_region', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`
      },
      body: JSON.stringify({
        applied_position: 'RD',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: [{ binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }]
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Target region is required');
  });

  it('POST /api/pooling/applications rejects missing questionnaire responses', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`
      },
      body: JSON.stringify({
        applied_position: 'SDS',
        target_region: 'Region VII',
        questionnaire_responses: {},
        document_attachments: [{ binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }]
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Questionnaire responses are required');
  });

  it('POST /api/pooling/applications rejects missing document attachments', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`
      },
      body: JSON.stringify({
        applied_position: 'ASDS',
        target_region: 'NCR',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: []
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Document attachments are required');
  });

  let createdAppId;

  it('POST /api/pooling/applications successfully submits valid executive application', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mkApplicantToken(910001)}`
      },
      body: JSON.stringify({
        first_name: 'MARIA',
        last_name: 'SANTOS',
        email: 'maria.santos.test@deped.gov.ph',
        contact_number: '09171234567',
        applied_position: 'RD',
        target_region: 'Region IV-A',
        questionnaire_responses: {
          pending_admin_case: 'No',
          guilty_admin_details: 'No',
          criminally_charged_details: 'No',
          convicted_crime_details: 'No'
        },
        document_attachments: [
          {
            doc_type: 'pds',
            file_name: 'Maria_Santos_PDS.pdf',
            binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c'
          },
          {
            doc_type: 'service_records',
            file_name: 'Maria_Santos_SR.pdf',
            binary_id: '68d5b268-30fc-4d48-bf5d-14fc39121744'
          }
        ]
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.applied_position).toBe('RD');
    expect(data.data.target_region).toBe('Region IV-A');
    expect(data.data.submission_timestamp).toBeTruthy();
    createdAppId = data.data.id;
  });

  it('POST /api/pooling/applications returns 409 for the same position and region, but allows applying to a different region', async () => {
    const dupRes = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mkApplicantToken(910001)}`
      },
      body: JSON.stringify({
        first_name: 'MARIA',
        last_name: 'SANTOS',
        applied_position: 'RD',
        target_region: 'Region IV-A',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: [
          { doc_type: 'pds', file_name: 'PDS.pdf', binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' },
          { doc_type: 'service_records', file_name: 'Maria_Santos_SR.pdf', binary_id: '68d5b268-30fc-4d48-bf5d-14fc39121744' }
        ]
      })
    });
    expect(dupRes.status).toBe(409);
    const dupData = await dupRes.json();
    expect(dupData.error).toContain('already have a pending application for RD in Region IV-A');

    const diffRegRes = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mkApplicantToken(910001)}`
      },
      body: JSON.stringify({
        first_name: 'MARIA',
        last_name: 'SANTOS',
        applied_position: 'RD',
        target_region: 'Region III',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: [
          { doc_type: 'pds', file_name: 'PDS.pdf', binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' },
          { doc_type: 'service_records', file_name: 'Maria_Santos_SR.pdf', binary_id: '68d5b268-30fc-4d48-bf5d-14fc39121744' }
        ]
      })
    });
    expect(diffRegRes.status).toBe(201);
    const diffRegData = await diffRegRes.json();
    expect(diffRegData.success).toBe(true);
    expect(diffRegData.data.target_region).toBe('Region III');
  });

  it('GET /api/pooling/my-application returns the submission and isReadOnly for the active period', async () => {
    const res = await fetch(`${base}/api/pooling/my-application`, {
      headers: { Authorization: `Bearer ${mkApplicantToken(910001)}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasSubmitted).toBe(true);
    expect(data.isReadOnly).toBe(true);
    expect(data.period?.id).toBeTruthy();
    expect(data.application.applied_position).toBe('RD');
    expect(data.application.document_attachments).toHaveLength(2);
  });

  it('GET /api/pooling/my-application reports not submitted for a registrant with no application', async () => {
    const res = await fetch(`${base}/api/pooling/my-application`, {
      headers: { Authorization: `Bearer ${mkApplicantToken(910099)}` }
    });
    const data = await res.json();
    expect(data.hasSubmitted).toBe(false);
    expect(data.isReadOnly).toBe(false);
    expect(data.application).toBeNull();
  });

  it('GET /api/pooling/history lists the registrant submissions with the period name, newest first', async () => {
    const res = await fetch(`${base}/api/pooling/history`, {
      headers: { Authorization: `Bearer ${mkApplicantToken(910001)}` }
    });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data[0].period_name).toBeTruthy();
    expect(data[0].applied_position).toBe('RD');
    expect(data[0].target_region).toBe('Region III');
    expect(data[1].target_region).toBe('Region IV-A');
    expect(data[0]).toHaveProperty('period_start');
    expect(data[0]).toHaveProperty('period_end');
    const times = data.map((d) => new Date(d.submission_timestamp).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    const empty = await fetch(`${base}/api/pooling/history`, {
      headers: { Authorization: `Bearer ${mkApplicantToken(910098)}` }
    });
    expect((await empty.json()).data).toEqual([]);
  });

  it('GET /api/pooling/history/:id returns only the owner application', async () => {
    const list = await (await fetch(`${base}/api/pooling/history`, {
      headers: { Authorization: `Bearer ${mkApplicantToken(910001)}` }
    })).json();
    const id = list.data[0].id;

    const own = await fetch(`${base}/api/pooling/history/${id}`, { headers: { Authorization: `Bearer ${mkApplicantToken(910001)}` } });
    expect(own.status).toBe(200);
    expect((await own.json()).isReadOnly).toBe(true);

    const other = await fetch(`${base}/api/pooling/history/${id}`, { headers: { Authorization: `Bearer ${mkApplicantToken(910098)}` } });
    expect(other.status).toBe(404);

    const bad = await fetch(`${base}/api/pooling/history/abc`, { headers: { Authorization: `Bearer ${mkApplicantToken(910001)}` } });
    expect(bad.status).toBe(400);
  });

  it('GET /api/pooling/history requires authentication', async () => {
    expect((await fetch(`${base}/api/pooling/history`)).status).toBe(401);
  });

  it('GET /api/pooling/my-application requires authentication', async () => {
    const res = await fetch(`${base}/api/pooling/my-application`);
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/records/applications requires authentication', async () => {
    const res = await fetch(`${base}/api/admin/records/applications`);
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/records/applications returns paginated submissions for admin', async () => {
    const res = await fetch(`${base}/api/admin/records/applications?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeTruthy();
    expect(data.pagination.page).toBe(1);

    const found = data.data.find(d => d.id === createdAppId);
    expect(found).toBeTruthy();
    expect(found.candidate_name).toContain('SANTOS');
    expect(found.applied_position).toBe('RD');
    expect(found.target_region).toBe('Region IV-A');
  });

  it('GET /api/admin/records/applications/:id returns applicant detail with document inspection and scoring placeholders', async () => {
    const res = await fetch(`${base}/api/admin/records/applications/${createdAppId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(createdAppId);
    expect(data.data.applied_position).toBe('RD');
    expect(Array.isArray(data.data.documents)).toBe(true);
    expect(data.data.documents.length).toBe(2);

    // Verify document inspection fields
    const pdsDoc = data.data.documents[0];
    expect(pdsDoc.file_name).toBeTruthy();
    expect(pdsDoc.preview_url).toContain('/api/binary/');
    expect(pdsDoc.download_url).toContain('/api/binary/');

    // Verify evaluation scoring placeholder exists
    expect(data.data.evaluation_scores).toBeTruthy();
  });

  it('POST /api/admin/records/applications/:id/score saves evaluation scoring data', async () => {
    const scores = {
      leadership: 92,
      experience: 88,
      education: 95,
      total: 91.5
    };
    const notes = 'Candidate demonstrates strong leadership and extensive regional management track record.';

    const res = await fetch(`${base}/api/admin/records/applications/${createdAppId}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        evaluation_scores: scores,
        evaluation_notes: notes
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.evaluation_scores.leadership).toBe(92);
    expect(data.data.evaluation_notes).toBe(notes);
  });

  it('PUT /api/admin/records/applications/:id/qs enforces server-side NOT QUALIFIED when any criteria is false', async () => {
    const res = await fetch(`${base}/api/admin/records/applications/${createdAppId}/qs`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        qs_education_met: true,
        qs_experience_met: true,
        qs_training_met: false,
        qs_eligibility_met: true,
        // Attempt to pass QUALIFIED from frontend to verify server ignores it
        overall_qualification_status: 'QUALIFIED'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.qs_education_met).toBe(true);
    expect(data.data.qs_training_met).toBe(false);
    expect(data.data.overall_qualification_status).toBe('NOT QUALIFIED');
  });

  it('PUT /api/admin/records/applications/:id/qs enforces server-side QUALIFIED only when all 4 criteria are true', async () => {
    const res = await fetch(`${base}/api/admin/records/applications/${createdAppId}/qs`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        qs_education_met: true,
        qs_experience_met: true,
        qs_training_met: true,
        qs_eligibility_met: true
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.overall_qualification_status).toBe('QUALIFIED');
  });

  it('POST /api/admin/records/applications/:id/nsc-scores saves evaluator scores idempotently and calculates overall average', async () => {
    // Evaluator 1: leadership 90, experience 80, education 85, interview 95 -> 86.0
    const eval1 = {
      evaluator_id: 'evaluator_1',
      evaluator_name: 'Director Perez',
      leadership: 90,
      experience: 80,
      education: 85,
      interview: 95,
      notes: 'Strong executive presence.'
    };

    const res1 = await fetch(`${base}/api/admin/records/applications/${createdAppId}/nsc-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(eval1)
    });

    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.data.scores.length).toBe(1);
    expect(data1.data.overall_average_score).toBe(86);

    // Call again with updated score to verify idempotency (no duplicate evaluator row)
    const res1Retry = await fetch(`${base}/api/admin/records/applications/${createdAppId}/nsc-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ ...eval1, leadership: 95 })
    });
    expect(res1Retry.status).toBe(200);
    const data1Retry = await res1Retry.json();
    expect(data1Retry.data.scores.length).toBe(1);
    expect(parseFloat(data1Retry.data.scores[0].leadership)).toBe(95);

    // Add Evaluator 2: leadership 80, experience 90, education 90, interview 80 -> 85.5
    const res2 = await fetch(`${base}/api/admin/records/applications/${createdAppId}/nsc-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        evaluator_id: 'evaluator_2',
        evaluator_name: 'Undersecretary Garcia',
        leadership: 80,
        experience: 90,
        education: 90,
        interview: 80
      })
    });

    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.data.scores.length).toBe(2);
    expect(data2.data.evaluator_count).toBe(2);
    // Average of 87.75 and 85.5 -> 86.63
    expect(typeof data2.data.overall_average_score).toBe('number');
  });

  it('GET /api/admin/records/applications/:id returns QS status, NSC scores, and questionnaire responses', async () => {
    const res = await fetch(`${base}/api/admin/records/applications/${createdAppId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.qs_education_met).toBe(true);
    expect(data.data.overall_qualification_status).toBe('QUALIFIED');
    expect(Array.isArray(data.data.nsc_scores)).toBe(true);
    expect(data.data.nsc_scores.length).toBe(2);
    expect(data.data.nsc_average_score).toBeGreaterThan(0);
    expect(data.data.questionnaire_responses).toBeTruthy();
  });

  it('POST /api/pooling/applications accepts restored rich questionnaire payload without requiring vacancy foreign key', async () => {
    const res = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mkApplicantToken(910002)}`
      },
      body: JSON.stringify({
        applied_position: 'ASDS',
        target_region: 'Central Office',
        first_name: 'TEST',
        last_name: 'APPLICANT',
        email: 'test.decoupled@deped.gov.ph',
        questionnaire_responses: {
          part_a_scenarios: { scenario_1: { ranking: ['B', 'A', 'C', 'D'], justification: 'Team collaboration' } },
          part_b_essays: { essay_1: 'Essay answer addressing trade-offs.' },
          part_c_ratings: { 1: 4, 2: 2 },
          part_c_sets: { set_1: { most: 'A', least: 'C' } }
        },
        document_attachments: [
          { doc_type: 'pds', file_name: 'PDS.pdf', binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }
        ]
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.applied_position).toBe('ASDS');
  });

  it('enforces UNASSESSED qualification status default on creation and conditional NSC score completeness threshold', async () => {
    // 1. Submit a fresh application
    const createRes = await fetch(`${base}/api/pooling/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mkApplicantToken(910003)}`
      },
      body: JSON.stringify({
        applied_position: 'RD',
        target_region: 'Region III',
        first_name: 'QUALIFICATION',
        last_name: 'TESTER',
        email: 'qs.tester@deped.gov.ph',
        questionnaire_responses: { pending_admin_case: 'No' },
        document_attachments: [{ doc_type: 'pds', binary_id: 'e03104ab-b349-4a04-adc6-35c3137f918c' }]
      })
    });
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    const appId = createData.data.id;

    // 2. Fetch admin submissions list - verify overall_qualification_status defaults to UNASSESSED
    // and nsc_average_score is null (0 evaluator scores)
    const listRes1 = await fetch(`${base}/api/admin/records/applications?search=qs.tester`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(listRes1.status).toBe(200);
    const listData1 = await listRes1.json();
    const appRow1 = listData1.data.find(a => a.id === appId);
    expect(appRow1).toBeDefined();
    expect(appRow1.overall_qualification_status).toBe('UNASSESSED');
    expect(appRow1.nsc_average_score).toBeNull();
    expect(appRow1.nsc_evaluator_count).toBe(0);

    // 3. Add 4 evaluator scores (incomplete: 4/5)
    for (let i = 1; i <= 4; i++) {
      const evalRes = await fetch(`${base}/api/admin/records/applications/${appId}/nsc-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          evaluator_id: `evaluator_${i}`,
          evaluator_name: `Member ${i}`,
          leadership: 90,
          experience: 90,
          education: 90,
          interview: 90
        })
      });
      expect(evalRes.status).toBe(200);
    }

    // 4. Fetch list again - with 4/5 distinct evaluators, nsc_average_score MUST STILL be null
    const listRes2 = await fetch(`${base}/api/admin/records/applications?search=qs.tester`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listData2 = await listRes2.json();
    const appRow2 = listData2.data.find(a => a.id === appId);
    expect(appRow2.nsc_evaluator_count).toBe(4);
    expect(appRow2.nsc_average_score).toBeNull();

    // 5. Add 5th evaluator score (completes 5/5 requirement)
    const evalRes5 = await fetch(`${base}/api/admin/records/applications/${appId}/nsc-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        evaluator_id: 'evaluator_5',
        evaluator_name: 'Member 5',
        leadership: 80,
        experience: 80,
        education: 80,
        interview: 80
      })
    });
    expect(evalRes5.status).toBe(200);

    // 6. Fetch list again - with 5 distinct evaluators, nsc_average_score is calculated and returned!
    const listRes3 = await fetch(`${base}/api/admin/records/applications?search=qs.tester`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listData3 = await listRes3.json();
    const appRow3 = listData3.data.find(a => a.id === appId);
    expect(appRow3.nsc_evaluator_count).toBe(5);
    expect(appRow3.nsc_average_score).not.toBeNull();
    // 4 members scored 90 (weighted 90), 1 member scored 80 (weighted 80): avg = (4*90 + 80)/5 = 88
    expect(appRow3.nsc_average_score).toBe(88);
  });
});

import pool from '../../../config/db.js';
import { upsertBinary } from '../../../utils/binaryPipeline.js';

export const storeApplicationDocument = (buffer, mimeType) => upsertBinary(pool, buffer, mimeType);

// Replace one legacy browser-only attachment with a server-stored binary reference.
// Ownership is enforced in the same statement; only 'bin-...' entries may be relinked.
export const relinkApplicationDocument = async (candidateId, applicationId, docType, attachment) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      SELECT document_attachments FROM applications
      WHERE id = $1 AND candidate_id = $2 FOR UPDATE
    `, [applicationId, String(candidateId)]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return { found: false, relinked: false };
    }
    const attachments = Array.isArray(rows[0].document_attachments) ? rows[0].document_attachments : [];
    const index = attachments.findIndex(item => item?.doc_type === docType && String(item?.binary_id || '').startsWith('bin-'));
    if (index === -1) {
      await client.query('ROLLBACK');
      return { found: true, relinked: false };
    }
    const updated = { ...attachments[index], ...attachment };
    attachments[index] = updated;
    await client.query('UPDATE applications SET document_attachments = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(attachments), applicationId]);
    await client.query('COMMIT');
    return { found: true, relinked: true, attachment: updated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

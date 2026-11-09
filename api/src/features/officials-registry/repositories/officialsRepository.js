import pool from '../../../config/db.js';

// Runs a dynamically built SELECT (filters/paging assembled by the controller).
export async function runQuery(query, params) {
  return pool.query(query, params);
}

export async function findDirectoryRows() {
  const allRowsQuery = `
      SELECT m.status, m.is_oic, m.position_title, m.first_name, m.last_name, m.email, m.office, m.strand, m.region, m.division, m.designation, m.effectivity_date,
        m.date_of_birth, m.created_at, m.updated_at, m."TLOid",
        m.photo_binary_id, m.pds_binary_id, m.contact_details, m.pending_admin_case
      FROM third_level_official_masterlist m
      WHERE m.status != 'For Approval' AND m.status != 'Rejected'
      ORDER BY m."TLOid" ASC
    `;
  return pool.query(allRowsQuery);
}

export async function findLastVacateUpdate(TLOid) {
  return pool.query(`
      SELECT vacate_reason, remarks 
      FROM third_level_officials_updates 
      WHERE "TLOid" = $1 AND status IN ('Vacating', 'Resigning', 'Inactive', 'Vacated', 'Reassigning', 'Pending Assignment')
      ORDER BY updated_at DESC LIMIT 1
    `, [TLOid]);
}

export async function updateTestAccount(TLOid, is_testaccount) {
  return pool.query(
      `UPDATE third_level_official_masterlist 
       SET is_testaccount = $1, updated_at = NOW() 
       WHERE "TLOid" = $2 
       RETURNING "TLOid", email, is_testaccount`,
      [Boolean(is_testaccount), TLOid]
    );
}

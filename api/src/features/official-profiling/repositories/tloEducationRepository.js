/**
 * tloEducationRepository.js
 *
 * Repository for tlo_education_records table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Sync strategy (INSERT/UPDATE/DELETE — no delete-and-reinsert):
 *  1. Fetch existing row IDs for the person.
 *  2. For each incoming item with a matching ID → UPDATE.
 *  3. For each incoming item without an ID → INSERT.
 *  4. DELETE any existing rows whose ID is absent from the incoming array.
 */

const TABLE = 'tlo_education_records';

/**
 * Fetch all education records for a person.
 * @param {import('pg').PoolClient} client
 * @param {'masterlist'|'staging'} sourceTable
 * @param {string} tloId
 * @returns {Promise<Array>}
 */
export async function findByTloId(client, sourceTable, tloId) {
  const result = await client.query(
    `SELECT id, source_table, tlo_id, level, degree, institution,
            year_graduated, created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)
     ORDER BY
       CASE level WHEN 'Bachelor' THEN 1 WHEN 'Master' THEN 2 WHEN 'Doctorate' THEN 3 ELSE 4 END,
       id ASC`,
    [sourceTable, tloId]
  );
  return result.rows;
}

/**
 * Sync education records for a person using INSERT/UPDATE/DELETE.
 * Preserves existing primary keys.
 *
 * @param {import('pg').PoolClient} client
 * @param {'masterlist'|'staging'} sourceTable
 * @param {string} tloId
 * @param {Array<{id?, level, degree, institution?, year_graduated?}>} incomingArray
 * @param {string|null} updatedBy  email of the user performing the update
 */
export async function syncForTloId(client, sourceTable, tloId, incomingArray, updatedBy = null) {
  // 1. Fetch existing rows
  const existingRes = await client.query(
    `SELECT id, level FROM ${TABLE} WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)`,
    [sourceTable, tloId]
  );
  const existingRows = existingRes.rows;
  const existingIds = new Set(existingRows.map(r => r.id));
  const incomingIds = new Set();

  const availableByLevel = {};
  existingRows.forEach(r => {
    if (!availableByLevel[r.level]) availableByLevel[r.level] = [];
    availableByLevel[r.level].push(r.id);
  });

  const toUpdate = [];
  const toInsert = [];

  for (const item of incomingArray) {
    const level = item.level || 'Bachelor';
    const degree = (item.degree || '').trim();
    const institution = item.institution ? item.institution.trim() : null;
    const parsedYear = item.year_graduated ? parseInt(item.year_graduated, 10) : null;
    const yearGraduated = (parsedYear && parsedYear >= 1900 && parsedYear <= 2100) ? parsedYear : null;

    let targetId = item.id && existingIds.has(item.id) ? item.id : null;
    if (!targetId && availableByLevel[level] && availableByLevel[level].length > 0) {
      targetId = availableByLevel[level].shift();
    }

    if (targetId) {
      toUpdate.push({ id: targetId, level, degree, institution, yearGraduated });
      incomingIds.add(targetId);
    } else {
      toInsert.push({ level, degree, institution, yearGraduated });
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET level = u.level,
           degree = u.degree,
           institution = u.institution,
           year_graduated = u.year_graduated,
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::varchar[]) AS level,
                UNNEST($4::text[]) AS degree,
                UNNEST($5::text[]) AS institution,
                UNNEST($6::int[]) AS year_graduated
       ) AS u
       WHERE t.id = u.id AND t.source_table = $7 AND LOWER(t.tlo_id) = LOWER($8)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.level),
        toUpdate.map(u => u.degree),
        toUpdate.map(u => u.institution),
        toUpdate.map(u => u.yearGraduated),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, level, degree, institution, year_graduated,
          created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.level, u.degree, u.institution, u.year_graduated, NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::varchar[]) AS level,
                UNNEST($5::text[]) AS degree,
                UNNEST($6::text[]) AS institution,
                UNNEST($7::int[]) AS year_graduated
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.level),
        toInsert.map(i => i.degree),
        toInsert.map(i => i.institution),
        toInsert.map(i => i.yearGraduated)
      ]
    );
    for (const row of insertRes.rows) {
      incomingIds.add(row.id);
    }
  }

  // 3. DELETE orphaned rows (IDs present in DB but not in incoming array)
  const idsToDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (idsToDelete.length > 0) {
    try {
      await client.query(`SAVEPOINT sp_del_education`);
      await client.query(
        `DELETE FROM ${TABLE} WHERE id = ANY($1::int[]) AND source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
        [idsToDelete, sourceTable, tloId]
      );
      await client.query(`RELEASE SAVEPOINT sp_del_education`);
    } catch (delErr) {
      await client.query(`ROLLBACK TO SAVEPOINT sp_del_education`).catch(() => { });
      console.warn(`[tloEducationRepository] Deletion skipped/prohibited: ${delErr.message}`);
    }
  }
}

/**
 * Clone all education records from one person to another.
 * Used during processApplication approve: copies staging → masterlist.
 *
 * @param {import('pg').PoolClient} client
 * @param {'masterlist'|'staging'} fromSourceTable
 * @param {string} fromTloId
 * @param {'masterlist'|'staging'} toSourceTable
 * @param {string} toTloId
 * @param {string|null} updatedBy
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  // Remove existing target rows first (clean slate for approval)
  await client.query(
    `DELETE FROM ${TABLE} WHERE source_table = $1 AND tlo_id = $2`,
    [toSourceTable, toTloId]
  );
  // Copy from source
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, level, degree, institution, year_graduated,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, level, degree, institution, year_graduated,
            NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND tlo_id = $5`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

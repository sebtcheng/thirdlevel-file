/**
 * tloAccomplishmentRepository.js
 *
 * Repository for tlo_accomplishment_records table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Soft-delete pattern: delete_flg = 'No' (active) | 'Yes' (deleted)
 * Physical DELETE is never performed; the Sentinel prohibition is avoided.
 */

const TABLE = 'tlo_accomplishment_records';

/**
 * Fetch all ACTIVE accomplishment records for a person (delete_flg = 'No').
 */
export async function findByTloId(client, sourceTable, tloId) {
  const result = await client.query(
    `SELECT id, source_table, tlo_id, description, award_year,
            delete_flg, created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)
       AND delete_flg = 'No'
     ORDER BY award_year DESC NULLS LAST, id ASC`,
    [sourceTable, tloId]
  );
  return result.rows;
}

/**
 * Sync accomplishment records using INSERT / UPDATE / soft-DELETE.
 * Rows omitted from incomingArray are soft-deleted (delete_flg = 'Yes').
 */
export async function syncForTloId(client, sourceTable, tloId, incomingArray, updatedBy = null) {
  const existingRes = await client.query(
    `SELECT id, delete_flg, LOWER(description) AS desc_lower
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)`,
    [sourceTable, tloId]
  );
  const activeIds = new Set();
  const softDeletedByDesc = new Map();

  for (const row of existingRes.rows) {
    if (row.delete_flg === 'No') {
      activeIds.add(row.id);
    } else if (row.desc_lower) {
      softDeletedByDesc.set(row.desc_lower, row.id);
    }
  }

  const incomingIds = new Set();
  const toUpdate = [];
  const toInsert = [];

  for (const rawItem of incomingArray) {
    const item = typeof rawItem === 'string'
      ? { description: rawItem }
      : rawItem;

    const description = (item.description || '').trim();
    if (!description) continue; // skip blank entries

    const parsedYear = item.award_year ? parseInt(item.award_year, 10) : null;
    const awardYear = isNaN(parsedYear) ? null : parsedYear;

    if (item.id && activeIds.has(item.id)) {
      toUpdate.push({ id: item.id, description, award_year: awardYear });
      incomingIds.add(item.id);
    } else {
      const descLower = description.toLowerCase();
      if (softDeletedByDesc.has(descLower)) {
        const resurrectId = softDeletedByDesc.get(descLower);
        softDeletedByDesc.delete(descLower); // only resurrect once
        toUpdate.push({ id: resurrectId, description, award_year: awardYear });
        incomingIds.add(resurrectId);
      } else {
        toInsert.push({ description, award_year: awardYear });
      }
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET description = u.description,
           award_year = u.award_year,
           delete_flg = 'No',
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::text[]) AS description,
                UNNEST($4::int[]) AS award_year
       ) AS u
       WHERE t.id = u.id AND t.source_table = $5 AND LOWER(t.tlo_id) = LOWER($6)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.description),
        toUpdate.map(u => u.award_year),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, description, award_year, delete_flg,
          created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.description, u.award_year, 'No', NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::text[]) AS description,
                UNNEST($5::int[]) AS award_year
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.description),
        toInsert.map(i => i.award_year)
      ]
    );
    for (const row of insertRes.rows) {
      incomingIds.add(row.id);
    }
  }

  // Soft-delete rows that were omitted from the incoming array
  const idsToSoftDelete = [...activeIds].filter(id => !incomingIds.has(id));
  if (idsToSoftDelete.length > 0) {
    await client.query(
      `UPDATE ${TABLE}
       SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
       WHERE id = ANY($2::int[]) AND source_table = $3 AND LOWER(tlo_id) = LOWER($4)`,
      [updatedBy, idsToSoftDelete, sourceTable, tloId]
    );
    console.log(`[tloAccomplishmentRepository] Soft-deleted ${idsToSoftDelete.length} record(s) for ${tloId}`);
  }
}

/**
 * Clone all ACTIVE accomplishment records from one person to another.
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  // Soft-delete existing destination records first
  await client.query(
    `UPDATE ${TABLE} SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
     WHERE source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
    [updatedBy, toSourceTable, toTloId]
  );
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, description, award_year, delete_flg,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, description, award_year, 'No', NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND LOWER(tlo_id) = LOWER($5) AND delete_flg = 'No'`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

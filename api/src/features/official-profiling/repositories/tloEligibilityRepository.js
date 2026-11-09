/**
 * tloEligibilityRepository.js
 *
 * Repository for tlo_eligibility_records table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Soft-delete pattern: delete_flg = 'No' (active) | 'Yes' (deleted)
 * Physical DELETE is never performed; the Sentinel prohibition is avoided.
 */

const TABLE = 'tlo_eligibility_records';

/**
 * Fetch all ACTIVE eligibility records for a person (delete_flg = 'No').
 */
export async function findByTloId(client, sourceTable, tloId) {
  const result = await client.query(
    `SELECT id, source_table, tlo_id, eligibility_type, rating,
            conferment_date, place_of_assignment, details, delete_flg,
            created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)
       AND delete_flg = 'No'
     ORDER BY conferment_date ASC NULLS LAST, id ASC`,
    [sourceTable, tloId]
  );
  return result.rows;
}

/**
 * Sync eligibility records using INSERT / UPDATE / soft-DELETE.
 */
export async function syncForTloId(client, sourceTable, tloId, incomingArray, updatedBy = null) {
  const existingRes = await client.query(
    `SELECT id FROM ${TABLE} WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2) AND delete_flg = 'No'`,
    [sourceTable, tloId]
  );
  const existingIds = new Set(existingRes.rows.map(r => r.id));
  const incomingIds = new Set();

  const toUpdate = [];
  const toInsert = [];

  for (const item of incomingArray) {
    const eligibilityType = ((item.eligibility || item.eligibility_type || item.title || '')).toUpperCase().trim();
    const rating = item.rating ? String(item.rating).trim() : null;
    const cleanDate = (d) => {
      if (!d || typeof d !== 'string') return null;
      const t = d.trim();
      return (t && t.toUpperCase() !== 'N/A' && t.toUpperCase() !== 'NONE') ? t : null;
    };
    const confermentDate = cleanDate(item.date || item.conferment_date);
    const placeOfAssignment = item.place_of_assignment ? item.place_of_assignment.toUpperCase().trim() : null;
    const details = item.details ? item.details.trim() : null;

    if (item.id && existingIds.has(item.id)) {
      toUpdate.push({ id: item.id, eligibilityType, rating, confermentDate, placeOfAssignment, details });
      incomingIds.add(item.id);
    } else {
      toInsert.push({ eligibilityType, rating, confermentDate, placeOfAssignment, details });
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET eligibility_type = u.eligibility_type,
           rating = u.rating,
           conferment_date = u.conferment_date,
           place_of_assignment = u.place_of_assignment,
           details = u.details,
           delete_flg = 'No',
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::text[]) AS eligibility_type,
                UNNEST($4::varchar[]) AS rating,
                UNNEST($5::date[]) AS conferment_date,
                UNNEST($6::text[]) AS place_of_assignment,
                UNNEST($7::text[]) AS details
       ) AS u
       WHERE t.id = u.id AND t.source_table = $8 AND LOWER(t.tlo_id) = LOWER($9)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.eligibilityType),
        toUpdate.map(u => u.rating),
        toUpdate.map(u => u.confermentDate),
        toUpdate.map(u => u.placeOfAssignment),
        toUpdate.map(u => u.details),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, eligibility_type, rating, conferment_date,
          place_of_assignment, details, delete_flg,
          created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.eligibility_type, u.rating, u.conferment_date,
              u.place_of_assignment, u.details, 'No', NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::text[]) AS eligibility_type,
                UNNEST($5::varchar[]) AS rating,
                UNNEST($6::date[]) AS conferment_date,
                UNNEST($7::text[]) AS place_of_assignment,
                UNNEST($8::text[]) AS details
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.eligibilityType),
        toInsert.map(i => i.rating),
        toInsert.map(i => i.confermentDate),
        toInsert.map(i => i.placeOfAssignment),
        toInsert.map(i => i.details)
      ]
    );
    for (const row of insertRes.rows) {
      incomingIds.add(row.id);
    }
  }

  // Soft-delete omitted rows
  const idsToSoftDelete = [...existingIds].filter(id => !incomingIds.has(id));
  if (idsToSoftDelete.length > 0) {
    await client.query(
      `UPDATE ${TABLE}
       SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
       WHERE id = ANY($2::int[]) AND source_table = $3 AND LOWER(tlo_id) = LOWER($4)`,
      [updatedBy, idsToSoftDelete, sourceTable, tloId]
    );
    console.log(`[tloEligibilityRepository] Soft-deleted ${idsToSoftDelete.length} record(s) for ${tloId}`);
  }
}

/**
 * Clone all ACTIVE eligibility records from one person to another.
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  await client.query(
    `UPDATE ${TABLE} SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
     WHERE source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
    [updatedBy, toSourceTable, toTloId]
  );
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, eligibility_type, rating, conferment_date,
        place_of_assignment, details, delete_flg,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, eligibility_type, rating, conferment_date,
            place_of_assignment, details, 'No', NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND LOWER(tlo_id) = LOWER($5) AND delete_flg = 'No'`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

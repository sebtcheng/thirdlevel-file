/**
 * tloTrainingRepository.js
 *
 * Repository for tlo_training_records table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Soft-delete pattern: delete_flg = 'No' (active) | 'Yes' (deleted)
 * Physical DELETE is never performed; the Sentinel prohibition is avoided.
 */

const TABLE = 'tlo_training_records';

/**
 * Fetch all ACTIVE training records for a person (delete_flg = 'No').
 */
export async function findByTloId(client, sourceTable, tloId) {
  const result = await client.query(
    `SELECT id, source_table, tlo_id, training_name, hours,
            inclusive_date_start, inclusive_date_end, conducted_by, delete_flg,
            created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)
       AND delete_flg = 'No'
     ORDER BY inclusive_date_start DESC NULLS LAST, id ASC`,
    [sourceTable, tloId]
  );
  return result.rows;
}

/**
 * Sync training records using INSERT / UPDATE / soft-DELETE.
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
    const trainingName = ((item.training_name || item.training_title || '')).toUpperCase().trim();
    const hours = item.hours != null ? parseInt(item.hours, 10) : null;
    const cleanDate = (d) => {
      if (!d || typeof d !== 'string') return null;
      const t = d.trim();
      return (t && t.toUpperCase() !== 'N/A' && t.toUpperCase() !== 'NONE') ? t : null;
    };
    const dateStart = cleanDate(item.date_from || item.inclusive_date_start);
    const dateEnd = cleanDate(item.date_to || item.inclusive_date_end);
    const conductedBy = item.conducted_by ? item.conducted_by.trim() : null;
    const parsedHours = isNaN(hours) ? null : hours;

    if (item.id && existingIds.has(item.id)) {
      toUpdate.push({
        id: item.id,
        trainingName,
        hours: parsedHours,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        conductedBy
      });
      incomingIds.add(item.id);
    } else {
      toInsert.push({
        trainingName,
        hours: parsedHours,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        conductedBy
      });
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET training_name = u.training_name,
           hours = u.hours,
           inclusive_date_start = u.inclusive_date_start,
           inclusive_date_end = u.inclusive_date_end,
           conducted_by = u.conducted_by,
           delete_flg = 'No',
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::text[]) AS training_name,
                UNNEST($4::int[]) AS hours,
                UNNEST($5::date[]) AS inclusive_date_start,
                UNNEST($6::date[]) AS inclusive_date_end,
                UNNEST($7::text[]) AS conducted_by
       ) AS u
       WHERE t.id = u.id AND t.source_table = $8 AND LOWER(t.tlo_id) = LOWER($9)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.trainingName),
        toUpdate.map(u => u.hours),
        toUpdate.map(u => u.dateStart),
        toUpdate.map(u => u.dateEnd),
        toUpdate.map(u => u.conductedBy),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, training_name, hours, inclusive_date_start,
          inclusive_date_end, conducted_by, delete_flg,
          created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.training_name, u.hours, u.inclusive_date_start,
              u.inclusive_date_end, u.conducted_by, 'No', NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::text[]) AS training_name,
                UNNEST($5::int[]) AS hours,
                UNNEST($6::date[]) AS inclusive_date_start,
                UNNEST($7::date[]) AS inclusive_date_end,
                UNNEST($8::text[]) AS conducted_by
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.trainingName),
        toInsert.map(i => i.hours),
        toInsert.map(i => i.dateStart),
        toInsert.map(i => i.dateEnd),
        toInsert.map(i => i.conductedBy)
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
    console.log(`[tloTrainingRepository] Soft-deleted ${idsToSoftDelete.length} record(s) for ${tloId}`);
  }
}

/**
 * Clone all ACTIVE training records from one person to another.
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  await client.query(
    `UPDATE ${TABLE} SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
     WHERE source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
    [updatedBy, toSourceTable, toTloId]
  );
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, training_name, hours, inclusive_date_start,
        inclusive_date_end, conducted_by, delete_flg,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, training_name, hours, inclusive_date_start,
            inclusive_date_end, conducted_by, 'No', NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND LOWER(tlo_id) = LOWER($5) AND delete_flg = 'No'`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

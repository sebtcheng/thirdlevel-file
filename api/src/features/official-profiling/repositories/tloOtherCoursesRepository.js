/**
 * tloOtherCoursesRepository.js
 *
 * Repository for tlo_other_courses table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Soft-delete pattern: delete_flg = 'No' (active) | 'Yes' (deleted)
 * Physical DELETE is never performed; the Sentinel prohibition is avoided.
 */

const TABLE = 'tlo_other_courses';

/**
 * Fetch all ACTIVE other course records for a person (delete_flg = 'No').
 */
export async function findByTloId(client, sourceTable, tloId) {
  const result = await client.query(
    `SELECT id, source_table, tlo_id, course_title, institution, details,
            date_from, date_to, delete_flg, created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2)
       AND delete_flg = 'No'
     ORDER BY date_from DESC NULLS LAST, id ASC`,
    [sourceTable, tloId]
  );
  return result.rows;
}

/**
 * Sync other course records using INSERT / UPDATE / soft-DELETE.
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
    const courseTitle = (item.course || item.course_title || '').trim();
    const details = item.details ? item.details.trim() : null;
    const institution = item.institution ? item.institution.trim() : null;
    const cleanDate = (d) => {
      if (!d || typeof d !== 'string') return null;
      const t = d.trim();
      return (t && t.toUpperCase() !== 'N/A' && t.toUpperCase() !== 'NONE') ? t : null;
    };
    const dateFrom = cleanDate(item.date_from);
    const dateTo = cleanDate(item.date_to);

    if (item.id && existingIds.has(item.id)) {
      toUpdate.push({
        id: item.id,
        courseTitle,
        institution,
        details,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      });
      incomingIds.add(item.id);
    } else {
      toInsert.push({
        courseTitle,
        institution,
        details,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      });
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET course_title = u.course_title,
           institution = u.institution,
           details = u.details,
           date_from = u.date_from,
           date_to = u.date_to,
           delete_flg = 'No',
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::text[]) AS course_title,
                UNNEST($4::text[]) AS institution,
                UNNEST($5::text[]) AS details,
                UNNEST($6::date[]) AS date_from,
                UNNEST($7::date[]) AS date_to
       ) AS u
       WHERE t.id = u.id AND t.source_table = $8 AND LOWER(t.tlo_id) = LOWER($9)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.courseTitle),
        toUpdate.map(u => u.institution),
        toUpdate.map(u => u.details),
        toUpdate.map(u => u.dateFrom),
        toUpdate.map(u => u.dateTo),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, course_title, institution, details,
          date_from, date_to, delete_flg, created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.course_title, u.institution, u.details,
              u.date_from, u.date_to, 'No', NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::text[]) AS course_title,
                UNNEST($5::text[]) AS institution,
                UNNEST($6::text[]) AS details,
                UNNEST($7::date[]) AS date_from,
                UNNEST($8::date[]) AS date_to
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.courseTitle),
        toInsert.map(i => i.institution),
        toInsert.map(i => i.details),
        toInsert.map(i => i.dateFrom),
        toInsert.map(i => i.dateTo)
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
    console.log(`[tloOtherCoursesRepository] Soft-deleted ${idsToSoftDelete.length} record(s) for ${tloId}`);
  }
}

/**
 * Clone all ACTIVE other course records from one person to another.
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  await client.query(
    `UPDATE ${TABLE} SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
     WHERE source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
    [updatedBy, toSourceTable, toTloId]
  );
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, course_title, institution, details,
        date_from, date_to, delete_flg,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, course_title, institution, details,
            date_from, date_to, 'No', NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND LOWER(tlo_id) = LOWER($5) AND delete_flg = 'No'`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

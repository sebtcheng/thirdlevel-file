/**
 * tloPositionRepository.js
 *
 * Repository for tlo_position_history table.
 * Provides: findByTloId, syncForTloId, cloneToNewTloId
 *
 * Soft-delete pattern: delete_flg = 'No' (active) | 'Yes' (deleted)
 * Physical DELETE is never performed; the Sentinel prohibition is avoided.
 */

const TABLE = 'tlo_position_history';

/**
 * Fetch all ACTIVE position history records for a person (delete_flg = 'No').
 */
export async function findByTloId(client, sourceTable, tloId, altTloId = null) {
  const params = [sourceTable, tloId];
  let idClause = 'LOWER(tlo_id) = LOWER($2)';
  if (altTloId && String(altTloId).toLowerCase() !== String(tloId).toLowerCase()) {
    params.push(altTloId);
    idClause = '(LOWER(tlo_id) = LOWER($2) OR LOWER(tlo_id) = LOWER($3))';
  }

  const result = await client.query(
    `SELECT id, source_table, tlo_id, position_name, 
            COALESCE(NULLIF(office, ''), division) AS office,
            strand, division, region,
            inclusive_date_start, inclusive_date_end, oic_positions, delete_flg,
            status, oic, designation,
            created_at, updated_at, created_by, updated_by
     FROM ${TABLE}
     WHERE source_table = $1 AND ${idClause}
       AND delete_flg = 'No'
     ORDER BY inclusive_date_start DESC NULLS LAST, id DESC`,
    params
  );
  return result.rows;
}

/**
 * Sync position history using INSERT / UPDATE / soft-DELETE.
 */
export async function syncForTloId(client, sourceTable, tloId, incomingArray, updatedBy = null) {
  const existingRes = await client.query(
    `SELECT id, position_name, inclusive_date_start, status FROM ${TABLE} WHERE source_table = $1 AND LOWER(tlo_id) = LOWER($2) AND delete_flg = 'No'`,
    [sourceTable, tloId]
  );
  const existingRows = existingRes.rows;
  const existingIds = new Set(existingRows.map(r => r.id));
  const incomingIds = new Set();

  // Index existing rows by position_name and start date for candidate matching
  const candidateMap = new Map();
  for (const r of existingRows) {
    const pName = (r.position_name || '').toUpperCase().trim();
    const sDate = r.inclusive_date_start ? new Date(r.inclusive_date_start).toISOString().split('T')[0] : '';
    const key = `${pName}|${sDate}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, []);
    }
    candidateMap.get(key).push(r.id);
  }

  const toUpdate = [];
  const toInsert = [];

  for (const item of incomingArray) {
    const positionName = ((item.position_name || '')).toUpperCase().trim();
    const designation = item.designation ? item.designation.trim() : null;
    const office = item.office ? item.office.trim() : null;
    const strand = item.strand ? item.strand.trim() : null;
    const division = item.division ? item.division.trim() : null;
    const region = item.region ? item.region.trim() : null;
    const cleanDate = (d) => {
      if (!d || typeof d !== 'string') return null;
      const t = d.trim();
      return (t && t.toUpperCase() !== 'N/A' && t.toUpperCase() !== 'NONE') ? t : null;
    };
    const dateStart = cleanDate(item.start_date || item.inclusive_date_start);
    const dateEnd = cleanDate(item.end_date || item.inclusive_date_end);
    const oicPositions = item.oic_positions && Array.isArray(item.oic_positions) && item.oic_positions.length > 0
      ? JSON.stringify(item.oic_positions)
      : null;

    const status = item.status && ['Active', 'Inactive'].includes(item.status)
      ? item.status
      : (dateEnd && new Date(dateEnd) < new Date() ? 'Inactive' : (item.status === 'Active' ? 'Active' : 'Inactive'));
    const oic = Boolean(item.oic ?? item.is_oic ?? (positionName && positionName.includes('OIC')));

    // Resolve target existing ID: by item.id, or candidate match by name + start_date
    let targetId = item.id && existingIds.has(item.id) ? item.id : null;
    if (!targetId && positionName) {
      const key = `${positionName}|${dateStart || ''}`;
      const candidates = candidateMap.get(key);
      if (candidates && candidates.length > 0) {
        while (candidates.length > 0) {
          const candId = candidates.shift();
          if (!incomingIds.has(candId)) {
            targetId = candId;
            break;
          }
        }
      }
    }

    if (targetId) {
      toUpdate.push({
        id: targetId,
        positionName,
        office,
        strand,
        division,
        region,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        oicPositions,
        status,
        oic,
        designation
      });
      incomingIds.add(targetId);
    } else {
      toInsert.push({
        positionName,
        office,
        strand,
        division,
        region,
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        oicPositions,
        status,
        oic,
        designation
      });
    }
  }

  if (toUpdate.length > 0) {
    await client.query(
      `UPDATE ${TABLE} AS t
       SET position_name = u.position_name,
           office = u.office,
           strand = u.strand,
           division = u.division,
           region = u.region,
           inclusive_date_start = u.inclusive_date_start,
           inclusive_date_end = u.inclusive_date_end,
           oic_positions = u.oic_positions::jsonb,
           status = u.status,
           oic = u.oic,
           designation = u.designation,
           delete_flg = 'No',
           updated_at = NOW(),
           updated_by = $1
       FROM (
         SELECT UNNEST($2::int[]) AS id,
                UNNEST($3::text[]) AS position_name,
                UNNEST($4::text[]) AS office,
                UNNEST($5::text[]) AS strand,
                UNNEST($6::text[]) AS division,
                UNNEST($7::text[]) AS region,
                UNNEST($8::date[]) AS inclusive_date_start,
                UNNEST($9::date[]) AS inclusive_date_end,
                UNNEST($10::text[]) AS oic_positions,
                UNNEST($11::varchar[]) AS status,
                UNNEST($12::boolean[]) AS oic,
                UNNEST($13::text[]) AS designation
       ) AS u
       WHERE t.id = u.id AND t.source_table = $14 AND LOWER(t.tlo_id) = LOWER($15)`,
      [
        updatedBy,
        toUpdate.map(u => u.id),
        toUpdate.map(u => u.positionName),
        toUpdate.map(u => u.office),
        toUpdate.map(u => u.strand),
        toUpdate.map(u => u.division),
        toUpdate.map(u => u.region),
        toUpdate.map(u => u.dateStart),
        toUpdate.map(u => u.dateEnd),
        toUpdate.map(u => u.oicPositions),
        toUpdate.map(u => u.status),
        toUpdate.map(u => u.oic),
        toUpdate.map(u => u.designation),
        sourceTable,
        tloId
      ]
    );
  }

  if (toInsert.length > 0) {
    const insertRes = await client.query(
      `INSERT INTO ${TABLE}
         (source_table, tlo_id, position_name, office, strand, division, region,
          inclusive_date_start, inclusive_date_end, oic_positions, status, oic, designation, delete_flg,
          created_at, updated_at, created_by, updated_by)
       SELECT $1, $2, u.position_name, u.office, u.strand, u.division, u.region,
              u.inclusive_date_start, u.inclusive_date_end, u.oic_positions::jsonb, u.status, u.oic, u.designation,
              'No', NOW(), NOW(), $3, $3
       FROM (
         SELECT UNNEST($4::text[]) AS position_name,
                UNNEST($5::text[]) AS office,
                UNNEST($6::text[]) AS strand,
                UNNEST($7::text[]) AS division,
                UNNEST($8::text[]) AS region,
                UNNEST($9::date[]) AS inclusive_date_start,
                UNNEST($10::date[]) AS inclusive_date_end,
                UNNEST($11::text[]) AS oic_positions,
                UNNEST($12::varchar[]) AS status,
                UNNEST($13::boolean[]) AS oic,
                UNNEST($14::text[]) AS designation
       ) AS u
       RETURNING id`,
      [
        sourceTable,
        tloId,
        updatedBy,
        toInsert.map(i => i.positionName),
        toInsert.map(i => i.office),
        toInsert.map(i => i.strand),
        toInsert.map(i => i.division),
        toInsert.map(i => i.region),
        toInsert.map(i => i.dateStart),
        toInsert.map(i => i.dateEnd),
        toInsert.map(i => i.oicPositions),
        toInsert.map(i => i.status),
        toInsert.map(i => i.oic),
        toInsert.map(i => i.designation)
      ]
    );
    for (const row of insertRes.rows) {
      incomingIds.add(row.id);
    }
  }

  // Soft-delete omitted rows ONLY if they are not system-archived inactive assignment records
  const idsToSoftDelete = existingRows
    .filter(r => !incomingIds.has(r.id) && r.status !== 'Inactive')
    .map(r => r.id);

  if (idsToSoftDelete.length > 0) {
    await client.query(
      `UPDATE ${TABLE}
       SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
       WHERE id = ANY($2::int[]) AND source_table = $3 AND LOWER(tlo_id) = LOWER($4)`,
      [updatedBy, idsToSoftDelete, sourceTable, tloId]
    );
    console.log(`[tloPositionRepository] Soft-deleted ${idsToSoftDelete.length} user-removed record(s) for ${tloId}`);
  }
}

/**
 * Clone all ACTIVE position history records from one person to another.
 */
export async function cloneToNewTloId(client, fromSourceTable, fromTloId, toSourceTable, toTloId, updatedBy = null) {
  await client.query(
    `UPDATE ${TABLE} SET delete_flg = 'Yes', updated_at = NOW(), updated_by = $1
     WHERE source_table = $2 AND LOWER(tlo_id) = LOWER($3)`,
    [updatedBy, toSourceTable, toTloId]
  );
  await client.query(
    `INSERT INTO ${TABLE}
       (source_table, tlo_id, position_name, office, strand, division, region,
        inclusive_date_start, inclusive_date_end, oic_positions, status, oic, designation, delete_flg,
        created_at, updated_at, created_by, updated_by)
     SELECT $1, $2, position_name, office, strand, division, region,
            inclusive_date_start, inclusive_date_end, oic_positions, status, oic, designation, 'No', NOW(), NOW(), $3, $3
     FROM ${TABLE}
     WHERE source_table = $4 AND LOWER(tlo_id) = LOWER($5) AND delete_flg = 'No'`,
    [toSourceTable, toTloId, updatedBy, fromSourceTable, fromTloId]
  );
}

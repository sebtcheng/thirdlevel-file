import pool from '../../../config/db.js';
import { db } from '../../../db/index.js';
import { sql } from 'drizzle-orm';
import { gmisPositions, officialMasterlist } from '../../../db/schema.js';

// Distinct, trimmed position titles currently in the masterlist (designation dropdown).
export async function findMasterlistPositions() {
  // UPPER(TRIM()) so "Director III" and "DIRECTOR III" are one option.
  const title = sql`UPPER(TRIM(${officialMasterlist.positionTitle}))`;
  const rows = await db
    .select({ position_title: sql`${title}`.mapWith(String) })
    .from(officialMasterlist)
    .where(sql`${officialMasterlist.positionTitle} IS NOT NULL AND ${title} <> '' AND ${title} NOT ILIKE 'N/A'`)
    .groupBy(title)
    .orderBy(title);
  return rows.map((r) => r.position_title);
}

export async function findPositionLookups() {
    const posResult = await pool.query(`
      SELECT DISTINCT position_title 
      FROM third_level_official_masterlist 
      WHERE position_title IS NOT NULL 
        AND position_title != '' 
        AND position_title NOT ILIKE 'N/A'
      ORDER BY position_title
    `);
    const desigResult = await pool.query(`
      SELECT DISTINCT designation 
      FROM third_level_official_masterlist 
      WHERE designation IS NOT NULL 
        AND designation != '' 
        AND designation NOT ILIKE 'N/A'
      ORDER BY designation
    `);
    const strandResult = await pool.query(`
      SELECT DISTINCT strand FROM third_level_official_masterlist WHERE strand IS NOT NULL AND strand != '' ORDER BY strand
    `);
    const regionResult = await pool.query(`
      SELECT DISTINCT region FROM third_level_official_masterlist WHERE region IS NOT NULL AND region != '' ORDER BY region
    `);
    const officeResult = await pool.query(`
      SELECT DISTINCT office FROM third_level_official_masterlist WHERE office IS NOT NULL AND office != '' ORDER BY office
    `);
    const divisionResult = await pool.query(`
      SELECT DISTINCT division FROM third_level_official_masterlist WHERE division IS NOT NULL AND division != '' ORDER BY division
    `);
    const regionDivisionResult = await pool.query(`
      SELECT DISTINCT region, division 
      FROM third_level_official_masterlist 
      WHERE division IS NOT NULL AND division != '' 
        AND region IS NOT NULL AND region != ''
    `);
  return { posResult, desigResult, strandResult, regionResult, officeResult, divisionResult, regionDivisionResult };
}

export async function findTloPositions() {
  // Source of the TIMON "current position" dropdown: ref.gmis_positions (imported from gmis_positions.csv).
  const raw = await db
    .select({ id: gmisPositions.id, position_name: gmisPositions.positionTitle })
    .from(gmisPositions)
    .orderBy(gmisPositions.id);
  // Case-insensitive dedupe; every title is returned upper-cased ("Director III" and "DIRECTOR III" collapse).
  const seen = new Map();
  for (const r of raw) {
    const name = String(r.position_name || '').trim().toUpperCase();
    if (name && !seen.has(name)) seen.set(name, { id: r.id, position_name: name });
  }
  const rows = [...seen.values()].sort((a, b) => a.position_name.localeCompare(b.position_name));
  return { rows };
}

export async function runApplicationsQuery(query, params) {
  return pool.query(query, params);
}

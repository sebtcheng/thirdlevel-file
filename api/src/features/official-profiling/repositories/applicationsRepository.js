import pool from '../../../config/db.js';

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

export async function runApplicationsQuery(query, params) {
  return pool.query(query, params);
}

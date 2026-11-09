/**
 * tloProfileService.js
 *
 * Business logic layer for TLO profile child table operations.
 * Orchestrates the 6 repositories and is called by thirdLevelController.js.
 *
 * Responsibilities:
 *  - fetchAllChildRecords(client, sourceTable, tloId)
 *      → Used by getProfile to add relational arrays to the response
 *  - syncAllChildTables(client, sourceTable, tloId, body, updatedBy)
 *      → Used by updateProfile inside the existing transaction
 *  - cloneChildTablesOnApproval(client, fromTloId, toTloId, updatedBy)
 *      → Used by processApplication approve flow
 *
 * Design rules:
 *  - Never opens its own transaction (caller owns the transaction)
 *  - Never throws on missing tables (graceful degradation via try/catch)
 *  - Dual-write: existing JSONB columns are still written by the controller;
 *    this service writes to the relational tables in parallel
 */

import * as educationRepo      from './repositories/tloEducationRepository.js';
import * as eligibilityRepo    from './repositories/tloEligibilityRepository.js';
import * as positionRepo       from './repositories/tloPositionRepository.js';
import * as trainingRepo       from './repositories/tloTrainingRepository.js';
import * as accomplishmentRepo from './repositories/tloAccomplishmentRepository.js';
import * as otherCoursesRepo   from './repositories/tloOtherCoursesRepository.js';

/**
 * Determines the source_table discriminator from a TLOid string.
 * APP-* → 'staging', everything else → 'masterlist'
 * @param {string} tloId
 * @returns {'masterlist'|'staging'}
 */
export function resolveSourceTable(tloId) {
  if (!tloId) return 'masterlist';
  const s = String(tloId).trim();
  if (s.startsWith('APP-') || (s.startsWith('TLO-') && s.split('-').length > 2) || /^\d+$/.test(s)) {
    return 'staging';
  }
  return 'masterlist';
}

/**
 * Fetch all child table records for a profile.
 * Called from getProfile to augment the response with relational arrays.
 * Each domain uses Promise.all for parallelism.
 * Gracefully returns empty arrays if a table does not yet exist (migration not run).
 *
 * @param {import('pg').PoolClient|import('pg').Pool} client
 * @param {'masterlist'|'staging'} sourceTable
 * @param {string} tloId
 * @returns {Promise<{
 *   education_records: Array,
 *   eligibility_records: Array,
 *   position_history: Array,
 *   training_records: Array,
 *   accomplishment_records: Array,
 *   other_course_records: Array
 * }>}
 */
export async function fetchAllChildRecords(client, sourceTable, tloId) {
  const safe = (fn) => fn.catch(err => {
    console.warn(`[tloProfileService] fetchAllChildRecords graceful skip: ${err.message}`);
    return [];
  });

  let altTloId = null;
  if (sourceTable === 'staging' && tloId) {
    try {
      const altRes = await client.query(
        `SELECT application_id, app_tloid FROM third_level_officials_profiling_application
         WHERE LOWER(app_tloid) = LOWER($1) OR application_id::text = $1 LIMIT 1`,
        [String(tloId)]
      );
      if (altRes.rows.length > 0) {
        const row = altRes.rows[0];
        altTloId = String(tloId).toLowerCase() === String(row.app_tloid).toLowerCase()
          ? String(row.application_id)
          : row.app_tloid;
      }
    } catch (e) {
      // graceful fallback
    }
  }

  const [
    education_records,
    eligibility_records,
    position_history,
    training_records,
    accomplishment_records,
    other_course_records
  ] = await Promise.all([
    safe(educationRepo.findByTloId(client, sourceTable, tloId)),
    safe(eligibilityRepo.findByTloId(client, sourceTable, tloId)),
    safe(positionRepo.findByTloId(client, sourceTable, tloId, altTloId)),
    safe(trainingRepo.findByTloId(client, sourceTable, tloId)),
    safe(accomplishmentRepo.findByTloId(client, sourceTable, tloId)),
    safe(otherCoursesRepo.findByTloId(client, sourceTable, tloId))
  ]);

  return {
    education_records,
    eligibility_records,
    position_history,
    training_records,
    accomplishment_records,
    other_course_records
  };
}

/**
 * Sync all child tables for a profile update.
 * Called from updateProfile inside the existing transaction.
 * Only syncs a domain if the corresponding field is present in the request body.
 * Gracefully skips domains if the relational table does not yet exist.
 *
 * @param {import('pg').PoolClient} client
 * @param {'masterlist'|'staging'} sourceTable
 * @param {string} tloId
 * @param {Object} body  request body from updateProfile
 * @param {string|null} updatedBy  email of user performing update
 */
export async function syncAllChildTables(client, sourceTable, tloId, body, updatedBy = null) {
  const safe = async (label, fn) => {
    const sp = `sp_sync_${label}`;
    try {
      await client.query(`SAVEPOINT ${sp}`);
      await fn();
      await client.query(`RELEASE SAVEPOINT ${sp}`);
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`).catch(() => {});
      console.warn(`[tloProfileService] syncAllChildTables [${label}] skipped: ${err.message}`);
    }
  };

  // Education: driven by education_degrees array (existing JSONB field name preserved)
  // Map legacy JSONB field names → relational column names expected by tloEducationRepository.
  // The DB CHECK constraint requires exactly: 'Bachelor' | 'Master' | 'Doctorate'
  if (body.education_degrees !== undefined && Array.isArray(body.education_degrees)) {
    const normalizeLevel = (raw) => {
      if (!raw) return 'Bachelor';
      const u = raw.toString().toUpperCase();
      if (u.includes('DOCTORATE') || u.includes('DOCTOR')) return 'Doctorate';
      if (u.includes('MASTER'))                              return 'Master';
      return 'Bachelor'; // fallback covers BACCALAUREATE / BACHELOR'S DEGREE
    };
    const mappedEducation = body.education_degrees.map(ed => ({
      id:             ed.id,
      level:          normalizeLevel(ed.level || ed.highest_education),
      degree:         ed.degree         || ed.specific_degree   || ed.education_program || '',
      institution:    ed.institution    || ed.school            || null,
      year_graduated: ed.year_graduated
                        ? parseInt(ed.year_graduated, 10) || null
                        : ed.education_year_graduated
                          ? parseInt(ed.education_year_graduated, 10) || null
                          : null,
    }));
    await safe('education', () =>
      educationRepo.syncForTloId(client, sourceTable, tloId, mappedEducation, updatedBy)
    );
  }

  // Eligibilities
  if (body.eligibilities !== undefined && Array.isArray(body.eligibilities)) {
    await safe('eligibility', () =>
      eligibilityRepo.syncForTloId(client, sourceTable, tloId, body.eligibilities, updatedBy)
    );
  }

  // Previous positions
  if (body.previous_positions !== undefined && Array.isArray(body.previous_positions)) {
    await safe('positions', () =>
      positionRepo.syncForTloId(client, sourceTable, tloId, body.previous_positions, updatedBy)
    );
  }

  // Relevant trainings
  if (body.relevant_trainings !== undefined && Array.isArray(body.relevant_trainings)) {
    await safe('trainings', () =>
      trainingRepo.syncForTloId(client, sourceTable, tloId, body.relevant_trainings, updatedBy)
    );
  }

  // Individual accomplishments
  if (body.individual_accomplishments !== undefined && Array.isArray(body.individual_accomplishments)) {
    await safe('accomplishments', () =>
      accomplishmentRepo.syncForTloId(client, sourceTable, tloId, body.individual_accomplishments, updatedBy)
    );
  }

  // Other courses
  if (body.other_courses !== undefined && Array.isArray(body.other_courses)) {
    await safe('other_courses', () =>
      otherCoursesRepo.syncForTloId(client, sourceTable, tloId, body.other_courses, updatedBy)
    );
  }
}

/**
 * Clone all child table rows from a staging application to the masterlist.
 * Called from processApplication approve flow inside the existing transaction.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} fromAppTloId  staging app_TLOid (e.g. 'APP-2026-0001')
 * @param {string} toMasterTloId canonical masterlist TLOid (e.g. 'TLO-0001')
 * @param {string|null} updatedBy
 */
export async function cloneChildTablesOnApproval(client, fromAppTloId, toMasterTloId, updatedBy = null) {
  const safe = async (label, fn) => {
    const sp = `sp_clone_${label}`;
    try {
      await client.query(`SAVEPOINT ${sp}`);
      await fn();
      await client.query(`RELEASE SAVEPOINT ${sp}`);
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`).catch(() => {});
      console.warn(`[tloProfileService] cloneChildTablesOnApproval [${label}] skipped: ${err.message}`);
    }
  };

  await safe('education',       () => educationRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
  await safe('eligibility',     () => eligibilityRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
  await safe('positions',       () => positionRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
  await safe('trainings',       () => trainingRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
  await safe('accomplishments', () => accomplishmentRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
  await safe('other_courses',   () => otherCoursesRepo.cloneToNewTloId(client, 'staging', fromAppTloId, 'masterlist', toMasterTloId, updatedBy));
}

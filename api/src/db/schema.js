// Drizzle definitions that mirror the LIVE dev database (reverse-engineered, no migrations generated).
// Schema changes still ship as SQL files in database/migrations/.
import { sql } from 'drizzle-orm';
import { pgSchema, pgTable, serial, integer, text, varchar, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// Reference data schema ("ref"). Created by database/migrations/20261111_030_create_ref_gmis_positions.sql.
export const refSchema = pgSchema('ref');

export const gmisPositions = refSchema.table('gmis_positions', {
  id: serial('id').primaryKey(),
  positionTitle: varchar('position_title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Shape of applications.questionnaire_responses as written by the TIMON application form.
/**
 * @typedef {object} QuestionnaireResponses
 * @property {Record<string, unknown>} [personal_employment]
 * @property {Record<string, unknown>} [designation_oic]
 * @property {Record<string, unknown>} [eligibility]
 * @property {Record<string, unknown>} [statutory]
 */

export const tloPositions = pgTable('tlo_positions', {
  id: serial('id').primaryKey(),
  positionTitle: varchar('position_title'),
  positionCode: varchar('position_code'),
  salaryGrade: varchar('salary_grade'),
  region: varchar('region'),
  division: varchar('division'),
  bureau: varchar('bureau'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const tloUsers = pgTable('tlo_users', {
  uid: text('uid').primaryKey(),
  email: text('email'),
  role: text('role'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  region: text('region'),
  division: text('division'),
  province: text('province'),
  city: text('city'),
  barangay: text('barangay'),
  office: text('office'),
  position: text('position'),
  disabled: boolean('disabled').default(false),
  contactNumber: text('contact_number'),
  altEmail: text('alt_email'),
  accountCategory: text('account_category'),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  hashVersion: text('hash_version').default('firebase'),
  passcode: text('passcode'),
  iern: text('iern'),
  registrantType: text('registrant_type'),
  schoolId: text('school_id'),
  hasSeenNexusTutorial: boolean('has_seen_nexus_tutorial').default(false),
  registrationStatus: varchar('registration_status').default('Valid'),
  isTestaccount: boolean('is_testaccount').default(false),
  assignedRegion: text('assigned_region'),
  assignedDivision: text('assigned_division'),
  divisionMultiple: text('division_multiple').array().default([]),
  assignment: text('assignment'),
  dateOfAssignment: text('date_of_assignment'),
});

// Subset of third_level_official_masterlist (the table has ~90 columns); only what registration reads.
export const officialMasterlist = pgTable('third_level_official_masterlist', {
  tloId: text('TLOid').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  positionTitle: text('position_title'),
});

// Intake periods. At most one row may be active (partial unique index in the migration).
export const applicationPeriods = pgTable('application_periods', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_application_periods_single_active').on(t.isActive).where(sql`${t.isActive}`),
]);

export const applications = pgTable('applications', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  candidateId: text('candidate_id'),
  candidateName: text('candidate_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  contactNumber: text('contact_number'),
  appliedPosition: varchar('applied_position').notNull(),
  targetRegion: varchar('target_region').notNull(),
  submissionTimestamp: timestamp('submission_timestamp', { withTimezone: true }).notNull().defaultNow(),
  questionnaireResponses: jsonb('questionnaire_responses').$type().default({}),
  documentAttachments: jsonb('document_attachments').default([]),
  evaluationScores: jsonb('evaluation_scores').default({}),
  evaluationNotes: text('evaluation_notes'),
  status: varchar('status').notNull().default('submitted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  qsEducationMet: boolean('qs_education_met').default(false),
  qsExperienceMet: boolean('qs_experience_met').default(false),
  qsTrainingMet: boolean('qs_training_met').default(false),
  qsEligibilityMet: boolean('qs_eligibility_met').default(false),
  overallQualificationStatus: varchar('overall_qualification_status').default('UNASSESSED'),
  applicationPeriodId: integer('application_period_id').references(() => applicationPeriods.id),
}, (t) => [
  // One application per registrant (candidate_id) per period; legacy rows with NULL period are exempt.
  uniqueIndex('uq_applications_candidate_period').on(t.candidateId, t.applicationPeriodId).where(sql`${t.applicationPeriodId} IS NOT NULL`),
]);

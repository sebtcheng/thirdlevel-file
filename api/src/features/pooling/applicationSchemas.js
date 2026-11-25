import { z } from 'zod/v4';
import { applicationInsertSchema } from '../../db/zod.js';

const upperCase = (label) => z.string().refine((v) => v === v.toUpperCase(), { error: `${label} must be in ALL CAPS` });

// Names on the application record (drizzle-zod insert schema, tightened to ALL CAPS).
export const applicationNamesSchema = applicationInsertSchema
  .pick({ firstName: true, lastName: true })
  .extend({
    firstName: upperCase('First name').nullish(),
    lastName: upperCase('Last name').nullish(),
  });

// Names inside questionnaire_responses.personal_employment (the form's Surname / First / Middle name).
export const personalEmploymentNamesSchema = z.object({
  surname: upperCase('Surname').nullish(),
  first_name: upperCase('First name').nullish(),
  middle_name: upperCase('Middle name').nullish(),
}).loose();

export const ALLOWED_POSITIONS = ['RD', 'ARD', 'SDS', 'ASDS'];

// Core POST /api/pooling/applications payload (error messages keep the wording the API already returned).
export const submitApplicationSchema = z.object({
  applied_position: z.preprocess(
    (v) => String(v ?? '').trim().toUpperCase(),
    z.enum(ALLOWED_POSITIONS, { error: `Invalid applied position. Allowed positions are strictly: ${ALLOWED_POSITIONS.join(', ')}.` })
  ),
  target_region: z.preprocess((v) => String(v ?? '').trim(), z.string().min(1, 'Target region is required.')),
  questionnaire_responses: z
    .record(z.string(), z.unknown(), { error: 'Questionnaire responses are required.' })
    .refine((o) => Object.keys(o).length > 0, 'Questionnaire responses are required.'),
  document_attachments: z
    .array(z.unknown(), { error: 'Document attachments are required. Please upload required supporting documents.' })
    .min(1, 'Document attachments are required. Please upload required supporting documents.'),
}).loose();

// Returns { ok: true } or { ok: false, error } for a submit-application body.
export function validateUpperCaseNames(body) {
  const top = applicationNamesSchema.safeParse({ firstName: body?.first_name, lastName: body?.last_name });
  if (!top.success) return { ok: false, error: top.error.issues[0].message };

  const personal = body?.questionnaire_responses?.personal_employment;
  if (personal !== undefined) {
    const pe = personalEmploymentNamesSchema.safeParse(personal);
    if (!pe.success) return { ok: false, error: pe.error.issues[0].message };
  }
  return { ok: true };
}

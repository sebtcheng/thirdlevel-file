import { describe, it, expect } from 'vitest';
import { validateUpperCaseNames } from '../src/features/pooling/applicationSchemas.js';

describe('application ALL CAPS name validation', () => {
  it('accepts upper-case names', () => {
    const body = {
      first_name: 'JUAN', last_name: 'DELA CRUZ',
      questionnaire_responses: { personal_employment: { surname: 'DELA CRUZ', first_name: 'JUAN', middle_name: 'SANTOS' } },
    };
    expect(validateUpperCaseNames(body).ok).toBe(true);
  });

  it('accepts a missing middle name', () => {
    expect(validateUpperCaseNames({ questionnaire_responses: { personal_employment: { surname: 'CHENG', first_name: 'SE' } } }).ok).toBe(true);
  });

  it('rejects lower or mixed-case names at the top level and in personal_employment', () => {
    expect(validateUpperCaseNames({ first_name: 'Juan', last_name: 'DELA CRUZ' }).ok).toBe(false);
    const r = validateUpperCaseNames({ questionnaire_responses: { personal_employment: { surname: 'Dela Cruz' } } });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ALL CAPS/);
  });
});

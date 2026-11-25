import { describe, it, expect } from 'vitest';
import { emailCheckQuerySchema, registerBodySchema } from '../src/features/auth/authSchemas.js';
import { tloPositionSelectSchema, tloUserInsertSchema } from '../src/db/zod.js';

describe('auth Zod schemas', () => {
  it('accepts a normal email query and trims it', () => {
    const r = emailCheckQuerySchema.safeParse({ email: ' a@b.co ', isCO: 'false' });
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('a@b.co');
  });

  it('rejects missing, repeated (array) and malformed emails', () => {
    expect(emailCheckQuerySchema.safeParse({}).success).toBe(false);
    expect(emailCheckQuerySchema.safeParse({ email: ['a@b.co', 'c@d.co'] }).success).toBe(false);
    expect(emailCheckQuerySchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('does not restrict the email domain', () => {
    expect(emailCheckQuerySchema.safeParse({ email: 'someone@gmail.com' }).success).toBe(true);
  });

  it('requires email and password on register', () => {
    expect(registerBodySchema.safeParse({ email: 'a@b.co' }).success).toBe(false);
    expect(registerBodySchema.safeParse({ email: 'a@b.co', password: 'x', isCO: 'true', contactNumber: 9170000000 }).success).toBe(true);
  });

  it('exposes drizzle-zod base schemas', () => {
    expect(tloPositionSelectSchema.shape).toHaveProperty('positionTitle');
    expect(tloUserInsertSchema.shape).toHaveProperty('email');
  });
});

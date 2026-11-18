import { z } from 'zod/v4';

const email = z.string({ error: 'Email required' }).trim().min(1, 'Email required').max(254, 'Invalid email format').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format');

// GET /check-email and /check-masterlist-email. A repeated ?email= arrives as an array and fails here.
export const emailCheckQuerySchema = z.object({
  email,
  isCO: z.string().optional(),
  role: z.string().optional(),
});

// POST /register-user
export const registerBodySchema = z.object({
  email,
  password: z.string({ error: 'Email and Password are required' }).min(1, 'Email and Password are required'),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  contactNumber: z.union([z.string(), z.number()]).nullish(),
  role: z.string().nullish(),
  assigned_region: z.string().nullish(),
  assigned_division: z.string().nullish(),
  passcode: z.string().nullish(),
  isCO: z.union([z.boolean(), z.string()]).nullish(),
});

// Standard 400 body for a failed safeParse.
export const validationError = (result) => ({
  error: result.error.issues[0]?.message || 'Invalid request',
  issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
});

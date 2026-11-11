// Base Zod schemas generated from the Drizzle tables (drizzle-zod).
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { tloPositions, tloUsers, officialMasterlist, applications, gmisPositions, applicationPeriods } from './schema.js';

export const applicationPeriodSelectSchema = createSelectSchema(applicationPeriods);
export const applicationPeriodInsertSchema = createInsertSchema(applicationPeriods);

export const gmisPositionSelectSchema = createSelectSchema(gmisPositions);
export const gmisPositionInsertSchema = createInsertSchema(gmisPositions);

export const tloPositionSelectSchema = createSelectSchema(tloPositions);
export const tloPositionInsertSchema = createInsertSchema(tloPositions);
export const tloUserSelectSchema = createSelectSchema(tloUsers);
export const tloUserInsertSchema = createInsertSchema(tloUsers);
export const masterlistSelectSchema = createSelectSchema(officialMasterlist);
export const applicationSelectSchema = createSelectSchema(applications);
export const applicationInsertSchema = createInsertSchema(applications);

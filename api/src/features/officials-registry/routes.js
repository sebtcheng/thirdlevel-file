import express from 'express';
import multer from 'multer';
import authMiddleware from '../../middleware/authMiddleware.js';

const memoryUpload = multer({ storage: multer.memoryStorage() });
import {
  adminAction,
  getActiveOfficials,
  getUnassignedPersonnel,
  getOfficials,
  getPositionIncumbents,
  getLastVacateUpdate,
  createUnassignedPersonnel,
  registerPersonnel,
  getKpiSummary,
  toggleTestAccount
} from './controller.js';
import {
  getApplications,
  processApplication,
  triggerCron,
  processRegistration,
  reassignOfficial
} from '../official-profiling/index.js';
import { bulkProcessDirectory, bulkProcessAchievements } from './uploadDirectoryController.js';

const router = express.Router();

router.get('/applications', authMiddleware, getApplications);
router.post('/process-application', authMiddleware, processApplication);
router.get('/officials', authMiddleware, getOfficials);
router.get('/officials-kpi-summary', authMiddleware, getKpiSummary);
router.get('/officials/:TLOid/last-vacate-update', authMiddleware, getLastVacateUpdate);
router.get('/position-incumbents', authMiddleware, getPositionIncumbents);
router.get('/active-officials', authMiddleware, getActiveOfficials);
router.get('/unassigned-personnel', authMiddleware, getUnassignedPersonnel);
router.post('/add-unassigned-personnel', authMiddleware, createUnassignedPersonnel);
router.post('/register-personnel', authMiddleware, registerPersonnel);
router.post('/process-registration', authMiddleware, processRegistration);
router.post('/toggle-test-account', authMiddleware, toggleTestAccount);
router.post('/reassign-official', authMiddleware, memoryUpload.single('file'), reassignOfficial);
router.post('/admin-action', authMiddleware, adminAction);
router.post('/bulk-process-directory', authMiddleware, bulkProcessDirectory);
router.post('/bulk-process-achievements', authMiddleware, bulkProcessAchievements);
router.get('/cron-trigger', triggerCron);

export default router;

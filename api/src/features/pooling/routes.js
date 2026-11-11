import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { getPoolingStatus, submitApplication, getMyApplications, getMyApplicationState, getApplicationHistory, getApplicationHistoryDetail } from './controller.js';

const router = express.Router();

router.get('/status', getPoolingStatus);
router.post(['/', '/applications'], authMiddleware, submitApplication);
router.get(['/', '/applications'], authMiddleware, getMyApplications);
router.get('/my-application', authMiddleware, getMyApplicationState);
router.get('/history', authMiddleware, getApplicationHistory);
router.get('/history/:id', authMiddleware, getApplicationHistoryDetail);

export default router;


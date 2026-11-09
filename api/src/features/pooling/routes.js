import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { getPoolingStatus, submitApplication, getMyApplications } from './controller.js';

const router = express.Router();

router.get('/status', getPoolingStatus);
router.post(['/', '/applications'], authMiddleware, submitApplication);
router.get(['/', '/applications'], authMiddleware, getMyApplications);

export default router;


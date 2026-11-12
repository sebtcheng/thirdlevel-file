import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { receiveApplicationDocument, uploadApplicationDocument, restoreApplicationDocument } from './documentUpload.js';
import { getPoolingStatus, updatePoolingStatus, submitApplication, getMyApplications, getMyApplicationState, getApplicationHistory, getApplicationHistoryDetail, withdrawApplication } from './controller.js';

const router = express.Router();

router.get('/status', getPoolingStatus);
router.patch('/status', authMiddleware, updatePoolingStatus);
router.post('/documents', authMiddleware, receiveApplicationDocument, uploadApplicationDocument);
router.post(['/', '/applications'], authMiddleware, submitApplication);
router.get(['/', '/applications'], authMiddleware, getMyApplications);
router.get('/my-application', authMiddleware, getMyApplicationState);
router.get('/history', authMiddleware, getApplicationHistory);
router.get('/history/:id', authMiddleware, getApplicationHistoryDetail);
router.post('/history/:id/withdraw', authMiddleware, withdrawApplication);
router.post('/history/:id/documents/:docType', authMiddleware, receiveApplicationDocument, restoreApplicationDocument);

export default router;


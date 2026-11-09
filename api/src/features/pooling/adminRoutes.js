import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import {
  getAdminApplications,
  getAdminApplicationDetail,
  updateAdminEvaluation,
  updateApplicationQSController,
  getNSCScoresController,
  saveNSCScoreController
} from './controller.js';

const router = express.Router();

router.get('/applications', authMiddleware, getAdminApplications);
router.get('/applications/:id', authMiddleware, getAdminApplicationDetail);
router.post('/applications/:id/score', authMiddleware, updateAdminEvaluation);
router.put('/applications/:id/evaluation', authMiddleware, updateAdminEvaluation);

// Qualification Standards (QS) evaluation endpoints
router.put('/applications/:id/qs', authMiddleware, updateApplicationQSController);
router.patch('/applications/:id/qs', authMiddleware, updateApplicationQSController);

// National Screening Committee (NSC) scoring endpoints
router.get('/applications/:id/nsc-scores', authMiddleware, getNSCScoresController);
router.post('/applications/:id/nsc-scores', authMiddleware, saveNSCScoreController);
router.put('/applications/:id/nsc-scores', authMiddleware, saveNSCScoreController);
router.put('/applications/:id/nsc-scores/:evaluatorId', authMiddleware, saveNSCScoreController);

export default router;


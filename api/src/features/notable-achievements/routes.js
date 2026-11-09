import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import { getAllNotableAchievements, createNotableAchievement, updateNotableAchievement, deleteNotableAchievement } from './controller.js';

const router = express.Router();

router.get('/notable-achievements-full', authMiddleware, getAllNotableAchievements);
router.post('/notable-achievements', authMiddleware, createNotableAchievement);
router.put('/notable-achievements/:index_number', authMiddleware, updateNotableAchievement);
router.delete('/notable-achievements/:index_number', authMiddleware, deleteNotableAchievement);

export default router;

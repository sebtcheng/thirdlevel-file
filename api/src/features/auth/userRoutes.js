import express from 'express';
import { updateSettings } from './userController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

router.put('/settings', authMiddleware, updateSettings);

export default router;

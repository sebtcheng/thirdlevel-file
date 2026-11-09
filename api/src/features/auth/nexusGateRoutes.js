import express from 'express';
import { checkAuthCode } from './nexusGateController.js';

const router = express.Router();

router.get('/check-auth-code', checkAuthCode);

export default router;

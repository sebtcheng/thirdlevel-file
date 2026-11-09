import express from 'express';
import { login, masterLogin, pinLogin, forgotPassword, resetPassword } from './loginController.js';

const router = express.Router();

router.post('/login', login);
router.post('/master-login', masterLogin);
router.post('/pin-login', pinLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;

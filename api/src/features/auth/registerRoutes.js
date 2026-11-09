import express from 'express';
import { checkEmail, registerUser, checkMasterlistEmail } from './registerController.js';

const router = express.Router();

router.get('/check-email', checkEmail);
router.get('/check-masterlist-email', checkMasterlistEmail);
router.post('/register-user', registerUser);

export default router;

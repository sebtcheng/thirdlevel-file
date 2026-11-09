import express from 'express';
import loginRoutes from './loginRoutes.js';
import nexusGateRoutes from './nexusGateRoutes.js';
import registerRoutes from './registerRoutes.js';
import userRoutes from './userRoutes.js';

const router = express.Router();

router.use(loginRoutes);
router.use(nexusGateRoutes);
router.use(registerRoutes);
router.use('/user', userRoutes);

export default router;

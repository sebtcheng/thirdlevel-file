import express from 'express';
import { getBinary } from './controller.js';

const router = express.Router();

router.get('/:id', getBinary);

export default router;

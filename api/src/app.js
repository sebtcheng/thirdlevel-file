import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import { authRoutes } from './features/auth/index.js';
import thirdLevelRoutes from './routes/thirdLevelRoutes.js';
import { binaryRoutes } from './features/binary/index.js';
import { poolingRoutes, adminPoolingRoutes } from './features/pooling/index.js';
import requestContext from './middleware/requestContext.js';
import errorHandler from './middleware/errorHandler.js';
import { devRequestMiddleware } from './devtools/dev-diagnostics.ts';
import { devErrorMiddleware, registerDevFaultRoutes } from './devtools/express-dev-error-middleware.ts';
import pool from './config/db.js';

// The express app without side effects (no listen, no DB init, no cron) so tests can import it.
const app = express();

app.use(requestContext);
app.use(devRequestMiddleware());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

app.use('/api/auth', authRoutes);
app.use('/api/third-level', thirdLevelRoutes);
app.use('/api/binary', binaryRoutes);
app.use('/api/pooling', poolingRoutes);
app.use('/api/vacancies', poolingRoutes);
app.use('/api/applications', poolingRoutes);
app.use('/api/admin/records', adminPoolingRoutes);

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  registerDevFaultRoutes(app, { pool });
}

app.use(devErrorMiddleware);
app.use(errorHandler);

export default app;

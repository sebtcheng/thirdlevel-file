import './devtools/dev-bootstrap.ts';
import app from './app.js';
import { initDB } from './config/db.js';
import './cron.js'; // Start the native background cron scheduler

const port = process.env.THIRD_LEVEL_PORT || process.env.PORT || 3008;

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 [Fatal] Uncaught Exception:', err);
});

initDB();

app.listen(port, () => {
  console.log(`🚀 Third Level API Service running on Port ${port}`);
});

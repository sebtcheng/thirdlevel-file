import './devtools/dev-bootstrap.ts';
import app from './app.js';
import { initDB, verifyDbConnection } from './config/db.js';
import './cron.js'; // Start the native background cron scheduler

const port = process.env.THIRD_LEVEL_PORT || process.env.PORT || 3008;

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 [Fatal] Uncaught Exception:', err);
});

try {
  await verifyDbConnection();
} catch (err) {
  console.error(`🛑 [Fatal] ${err.message}`);
  process.exit(1);
}

await initDB();

app.listen(port, () => {
  console.log(`🚀 Third Level API Service running on Port ${port}`);
});

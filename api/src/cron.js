import pool from './config/db.js';
import { processScheduledVacancies, processAnticipatedVacancies } from './features/official-profiling/index.js';

console.log('==================================================');
console.log('🚀 Starting Standalone CRON Service');
console.log('📅 Task: Processing Scheduled Effectivity Dates & Anticipated Vacancies');
console.log('==================================================\n');

// Function to run the job
const runJob = async () => {
  try {
    const timestamp = new Date().toLocaleString();
    process.stdout.write(`[${timestamp}] Checking scheduled vacancies... `);
    
    await processScheduledVacancies(pool);
    console.log('Done.');

    process.stdout.write(`[${timestamp}] Checking anticipated vacancies... `);
    await processAnticipatedVacancies(pool);
    console.log('Done.');
  } catch (err) {
    console.log('Error!');
    console.error('🔥 [Cron Error] Failed to process scheduled/anticipated vacancies:', err);
  }
};

// Function to calculate time until next midnight (12:00 AM)
const scheduleNextRun = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Next 12:00 AM

  const msUntilMidnight = nextMidnight.getTime() - now.getTime();
  
  console.log(`\n⏳ Next execution scheduled for: ${nextMidnight.toLocaleString()}`);
  console.log(`(in approximately ${(msUntilMidnight / 1000 / 60 / 60).toFixed(2)} hours)`);

  setTimeout(() => {
    runJob();
    // Re-schedule for the next midnight after it runs
    scheduleNextRun();
  }, msUntilMidnight);
};

// Start the scheduler
scheduleNextRun();

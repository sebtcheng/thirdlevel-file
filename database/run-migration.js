const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide the migration file name. Example: node run-migration.js 20260806_002_create_tlo_eligibility_records.sql');
    process.exit(1);
  }

  const fileName = args[0];
  const filePath = path.join(__dirname, 'migrations', fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    console.log(`Running migration: ${fileName}...`);
    await pool.query(sql);
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration FAILED:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();

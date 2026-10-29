import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, testConnection } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  console.log('🔄 [Migration] Connecting to PostgreSQL to apply schema...');
  const check = await testConnection();
  if (!check.ok) {
    console.error('❌ [Migration Failed]:', check.message);
    console.error('💡 Please make sure PostgreSQL is running and check your .env database credentials.');
    process.exit(1);
  }

  console.log(`📡 [Migration] Target Database: ${check.database}`);
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('✅ [Migration Success] All 9 tables and indexes applied successfully to PostgreSQL.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration Error]:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Run if called directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations().then(() => {
    console.log('🏁 Migration process complete.');
    process.exit(0);
  });
}


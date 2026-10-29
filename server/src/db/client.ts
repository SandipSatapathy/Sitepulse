import pg from 'pg';
import { getDatabaseConfig } from './config.js';

const { Pool } = pg;
export const pool = new Pool(getDatabaseConfig());

pool.on('error', (err) => {
  console.error('❌ [Database Pool Error]:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function testConnection(): Promise<{ ok: boolean; message: string; database?: string }> {
  try {
    const res = await pool.query('SELECT current_database() as db_name, version() as db_version');
    const dbName = res.rows[0]?.db_name;
    return {
      ok: true,
      message: `Connected successfully to PostgreSQL database: "${dbName}"`,
      database: dbName,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `PostgreSQL connection error: ${err.message}`,
    };
  }
}


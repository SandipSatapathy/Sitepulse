import 'dotenv/config';
import { PoolConfig } from 'pg';

export function getDatabaseConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    const isRemote =
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1');

    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isRemote && process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'sitepulse',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}


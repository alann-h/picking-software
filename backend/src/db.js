import { config } from './config/index.js';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: config.database.url,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

export default pool;
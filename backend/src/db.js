import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});


export default pool;
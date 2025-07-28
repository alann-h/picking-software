import pg from 'pg';

const sslConfig = process.env.VITE_APP_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : false;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});


export default pool;
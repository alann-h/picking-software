import pg from 'pg';

const pool = new pg.Pool({
  user: 'ahattom',
  host: 'smartpicker-db.cxymkwq0mopv.us-east-2.rds.amazonaws.com',
  database: 'smartpicker_db',
  password: 'pOmrDLp3tnSzpvGtjoVN',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'unt_platform',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Test the connection immediately on startup
pool.query('SELECT NOW()')
  .then(() => console.log('📦 Connected to PostgreSQL'))
  .catch(err => console.error('❌ Failed to connect to PostgreSQL:', err.message));

module.exports = pool;

const fs = require('fs');
const path = require('path');
const pool = require('./db');

/**
 * Initializes the database by running init.sql
 * Uses CREATE TABLE IF NOT EXISTS, so it's safe to run multiple times
 */
async function initDb() {
  try {
    const sqlPath = path.join(__dirname, '..', '..', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(sql);
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    // Don't crash the server — tables might already exist
  }
}

module.exports = initDb;

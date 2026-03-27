/**
 * Migration: Add variant_number column to questions table
 * Run once: node migrate-variant.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS variant_number VARCHAR(20);
    `);
    console.log('✅ Migration complete: variant_number column added to questions');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

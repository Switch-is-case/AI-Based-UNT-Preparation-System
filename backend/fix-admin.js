require('dotenv').config();
const pool = require('./src/config/db');
const argon2 = require('argon2');
const fs = require('fs');
const path = require('path');

async function fixAdmin() {
  try {
    console.log('Generating valid Argon2 hash for "admin123"...');
    const hash = await argon2.hash('admin123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    console.log('Updating database...');
    const res = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id',
      [hash, 'admin']
    );

    if (res.rowCount > 0) {
      console.log('✅ Admin password fixed in the database!');
    } else {
      console.log('⚠️ Admin user not found in the database.');
    }

    console.log('Fixing init.sql...');
    const sqlPath = path.join(__dirname, 'init.sql');
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const placeholder = '$argon2id$v=19$m=65536,t=3,p=4$placeholder$hash';
    if (sqlContent.includes(placeholder)) {
      sqlContent = sqlContent.replace(placeholder, hash);
      fs.writeFileSync(sqlPath, sqlContent);
      console.log('✅ init.sql fixed!');
    } else {
      console.log('ℹ️ init.sql already fixed or placeholder not found.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing admin:', err);
    process.exit(1);
  }
}

fixAdmin();

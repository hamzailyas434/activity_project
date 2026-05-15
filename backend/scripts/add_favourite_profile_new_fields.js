const mysql = require("mysql2/promise");
require("dotenv").config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      console.log("Adding relation, color, bday, phone columns to favourite_profiles…");
      await conn.query(`ALTER TABLE favourite_profiles ADD COLUMN IF NOT EXISTS relation VARCHAR(100) DEFAULT '' AFTER name`);
      await conn.query(`ALTER TABLE favourite_profiles ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'iris' AFTER relation`);
      await conn.query(`ALTER TABLE favourite_profiles ADD COLUMN IF NOT EXISTS bday DATE NULL AFTER color`);
      await conn.query(`ALTER TABLE favourite_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '' AFTER bday`);
      console.log("✅ Profile columns added");

      console.log("Adding gift_date and amount columns to favourite_profile_records…");
      await conn.query(`ALTER TABLE favourite_profile_records ADD COLUMN IF NOT EXISTS gift_date DATE NULL AFTER gift_item`);
      await conn.query(`ALTER TABLE favourite_profile_records ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0 AFTER gift_date`);
      console.log("✅ Record columns added");

      console.log("Dropping unique key uk_profile_month (if exists) to allow multiple gifts per month…");
      try {
        await conn.query(`ALTER TABLE favourite_profile_records DROP INDEX uk_profile_month`);
        console.log("✅ Unique key dropped");
      } catch {
        console.log("   (unique key not found — skipping)");
      }

      await conn.commit();
      console.log("✅ Migration complete");
    } catch (err) {
      await conn.rollback();
      console.error("❌ Error:", err);
      throw err;
    } finally {
      conn.release();
    }
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();

const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const conn = await pool.getConnection();
    console.log("Connected...");
    try {
      await conn.query(`
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT NULL
      `);
      console.log("✅ bill_date column added to expenses table");
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();

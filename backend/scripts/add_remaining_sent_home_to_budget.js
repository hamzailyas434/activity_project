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
      const dbName = process.env.DB_NAME;
      const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'expense_budgets' AND COLUMN_NAME = 'remaining_sent_home'`,
        [dbName]
      );
      if (rows.length > 0) {
        console.log("ℹ️  remaining_sent_home already exists on expense_budgets — skipping");
      } else {
        await conn.query(`
          ALTER TABLE expense_budgets
          ADD COLUMN remaining_sent_home TINYINT(1) NOT NULL DEFAULT 0
        `);
        console.log("✅ remaining_sent_home added to expense_budgets");
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

run();

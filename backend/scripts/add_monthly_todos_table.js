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
    console.log("Connected to database...");

    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS monthly_todos (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     INT NOT NULL,
          month       INT NOT NULL,
          year        INT NOT NULL,
          text        TEXT NOT NULL,
          completed   TINYINT(1) NOT NULL DEFAULT 0,
          sort_order  INT NOT NULL DEFAULT 0,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_month_year (user_id, year, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ monthly_todos table created");
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

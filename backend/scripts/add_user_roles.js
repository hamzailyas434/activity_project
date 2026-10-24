const mysql = require("mysql2/promise");
require("dotenv").config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "activity_tracker",
  });

  const connection = await pool.getConnection();
  try {
    console.log("Adding role, hidden_tabs, and last_active columns to users...");

    await connection.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('owner','admin','user') NOT NULL DEFAULT 'user'`
    );
    console.log("  role column added (or already exists).");

    await connection.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_tabs JSON NULL`
    );
    console.log("  hidden_tabs column added (or already exists).");

    await connection.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP NULL`
    );
    console.log("  last_active column added (or already exists).");

    // Set first user (lowest id) as owner with empty hidden_tabs
    await connection.query(
      `UPDATE users SET role='owner', hidden_tabs=JSON_ARRAY() WHERE id=(SELECT id FROM (SELECT MIN(id) as id FROM users) t)`
    );
    console.log("  First user set as owner with empty hidden_tabs.");

    // All other users: role='user', hidden_tabs=['books']
    await connection.query(
      `UPDATE users SET hidden_tabs=JSON_ARRAY('books') WHERE role='user' AND hidden_tabs IS NULL`
    );
    console.log("  Remaining users assigned hidden_tabs=['books'].");

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});

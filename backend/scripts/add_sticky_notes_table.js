const mysql = require("mysql2/promise");
require("dotenv").config();

async function addStickyNotesTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const connection = await pool.getConnection();
    console.log("Connected to database...");

    try {
      await connection.beginTransaction();

      console.log("Creating sticky_notes table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sticky_notes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          color VARCHAR(20) NOT NULL DEFAULT '#fef08a',
          display_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log("✅ sticky_notes table created successfully");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error creating sticky_notes table:", err);
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addStickyNotesTable();

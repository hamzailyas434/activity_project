const mysql = require("mysql2/promise");
require("dotenv").config();

async function addAttachmentsTable() {
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

      // Create attachments table
      console.log("Creating attachments table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS note_attachments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          note_id INT NOT NULL,
          user_id INT NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_data LONGBLOB NOT NULL,
          file_size INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_note_attachments (note_id),
          INDEX idx_user_attachments (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log("✅ Attachments table created successfully");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error creating attachments table:", err);
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

addAttachmentsTable();

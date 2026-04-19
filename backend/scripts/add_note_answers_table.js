const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addNoteAnswersTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    console.log("\n1. Creating note_answers table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS note_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_id INT NOT NULL,
        user_id INT NOT NULL,
        answer LONGTEXT NOT NULL,
        is_very_good BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_note_id (note_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_very_good (is_very_good)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ note_answers table created");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ Database connection closed");
    }
  }
}

addNoteAnswersTable();

const mysql = require("mysql2/promise");
require("dotenv").config();

async function addNotesTable() {
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

      // Check if users table exists first
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users'
      `);

      if (tables.length === 0) {
        console.log("⚠️  Users table not found. Creating users table first...");
        await connection.query(`
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log("✅ Users table created");
      }

      // Create notes table
      console.log("Creating notes table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'general',
          question TEXT NOT NULL,
          answer LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_category (user_id, category),
          INDEX idx_user_question (user_id, question(255))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Check if answer column is TEXT and needs to be upgraded to LONGTEXT
      const [columns] = await connection.query(`
        SELECT DATA_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notes' 
        AND COLUMN_NAME = 'answer'
      `);

      if (columns.length > 0 && columns[0].DATA_TYPE === 'text') {
        console.log("Upgrading answer column from TEXT to LONGTEXT for larger content...");
        await connection.query(`
          ALTER TABLE notes MODIFY COLUMN answer LONGTEXT NOT NULL
        `);
        console.log("✅ Answer column upgraded to LONGTEXT");
      }

      console.log("✅ Notes table created successfully");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error creating notes table:", err);
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

addNotesTable();

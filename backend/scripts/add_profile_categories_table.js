const mysql = require("mysql2/promise");
require("dotenv").config();

async function addProfileCategoriesTable() {
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

      console.log("Adding category column to favourite_profiles...");
      await connection.query(`
        ALTER TABLE favourite_profiles
        ADD COLUMN IF NOT EXISTS category VARCHAR(200) DEFAULT '' AFTER name
      `);
      console.log("✅ category column added");

      console.log("Creating favourite_profile_categories table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS favourite_profile_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          profile_id INT NOT NULL,
          user_id INT NOT NULL,
          category VARCHAR(200) DEFAULT '',
          notes TEXT,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES favourite_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_profile_id (profile_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ favourite_profile_categories table created");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error during migration:", err);
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

addProfileCategoriesTable();

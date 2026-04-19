const mysql = require("mysql2/promise");
require("dotenv").config();

async function addLedgerProfilesTables() {
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

      console.log("Creating person_ledger table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS person_ledger (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          person_name VARCHAR(200) NOT NULL,
          month INT NOT NULL,
          year INT NOT NULL,
          amount DECIMAL(15,2) DEFAULT 0,
          other_amount DECIMAL(15,2) DEFAULT 0,
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_person_month (user_id, person_name, year, month),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ person_ledger table created");

      console.log("Creating favourite_profiles table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS favourite_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(200) NOT NULL,
          shoe_number VARCHAR(50),
          dress_color VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ favourite_profiles table created");

      console.log("Creating favourite_profile_records table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS favourite_profile_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          profile_id INT NOT NULL,
          user_id INT NOT NULL,
          month INT NOT NULL,
          year INT NOT NULL,
          gift_item VARCHAR(200),
          gift_color VARCHAR(100),
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_profile_month (profile_id, year, month),
          FOREIGN KEY (profile_id) REFERENCES favourite_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ favourite_profile_records table created");

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

addLedgerProfilesTables();

const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addQazaNamaz() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Create qaza_namaz table
    console.log("\nCreating qaza_namaz table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qaza_namaz (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        fajr_years DECIMAL(10, 2) DEFAULT 0,
        fajr_days INT DEFAULT 0,
        fajr_qaza INT DEFAULT 0,
        zuhr_years DECIMAL(10, 2) DEFAULT 0,
        zuhr_days INT DEFAULT 0,
        zuhr_qaza INT DEFAULT 0,
        asr_years DECIMAL(10, 2) DEFAULT 0,
        asr_days INT DEFAULT 0,
        asr_qaza INT DEFAULT 0,
        maghrib_years DECIMAL(10, 2) DEFAULT 0,
        maghrib_days INT DEFAULT 0,
        maghrib_qaza INT DEFAULT 0,
        isha_years DECIMAL(10, 2) DEFAULT 0,
        isha_days INT DEFAULT 0,
        isha_qaza INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_qaza (user_id),
        INDEX idx_user_qaza (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ Qaza Namaz table created");

    await connection.end();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

addQazaNamaz();


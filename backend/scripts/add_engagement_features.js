const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addEngagementFeatures() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // 1. Add icon and color to activities table
    console.log("\n1. Adding icon and color columns to activities...");
    try {
      await connection.query(`
        ALTER TABLE activities 
        ADD COLUMN icon VARCHAR(10) DEFAULT '✓' AFTER type,
        ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1' AFTER icon
      `);
      console.log("✅ Icon and color columns added");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("ℹ️ Icon and color columns already exist");
      } else {
        throw err;
      }
    }

    // 2. Create achievements table
    console.log("\n2. Creating achievements table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_type VARCHAR(50) NOT NULL,
        achievement_key VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        icon VARCHAR(10) DEFAULT '🏆',
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_achievement (user_id, achievement_type, achievement_key),
        INDEX idx_user_achievements (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ Achievements table created");

    // 3. Create goals table
    console.log("\n3. Creating goals table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activity_id INT,
        goal_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
        target_value INT NOT NULL,
        current_value INT DEFAULT 0,
        period_start DATE NOT NULL,
        period_end DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        INDEX idx_user_goals (user_id),
        INDEX idx_activity_goals (activity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ Goals table created");

    // 4. Create user_settings table for notifications
    console.log("\n4. Creating user_settings table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        notifications_enabled BOOLEAN DEFAULT FALSE,
        notification_time TIME DEFAULT '09:00:00',
        theme VARCHAR(20) DEFAULT 'dark',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ User settings table created");

    console.log("\n✅ All engagement features added successfully!");
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

addEngagementFeatures();

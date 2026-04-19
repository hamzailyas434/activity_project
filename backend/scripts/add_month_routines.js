/**
 * Adds month_routines table so activities can be scoped per month.
 * - Deleting an activity "from December" only removes it from that month's routine.
 * - Past months keep showing their activities; new months can "import previous routines".
 */
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
    console.log("Adding month_routines table...");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS month_routines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activity_id INT NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_activity_month (user_id, activity_id, year, month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        INDEX idx_user_year_month (user_id, year, month)
      )
    `);
    console.log("✅ month_routines table created");

    // Backfill current month: for each user, add all their activities to current month's routine
    const [rows] = await connection.query(`
      SELECT id FROM users
    `);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const user of rows) {
      const [activities] = await connection.query(
        "SELECT id, display_order FROM activities WHERE user_id = ? ORDER BY display_order, id",
        [user.id]
      );
      for (let i = 0; i < activities.length; i++) {
        await connection.query(
          `INSERT IGNORE INTO month_routines (user_id, activity_id, year, month, display_order)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, activities[i].id, currentYear, currentMonth, activities[i].display_order ?? i]
        );
      }
      if (activities.length) {
        console.log(`  Backfilled ${activities.length} activities for user ${user.id} (${currentYear}-${currentMonth})`);
      }
    }
    console.log("✅ Migration complete");
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

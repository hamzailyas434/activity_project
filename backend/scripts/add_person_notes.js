// Long-form notes per favourite person (markdown text, e.g. a pasted guide). Safe to run twice.
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS favourite_profile_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL DEFAULT '',
        body MEDIUMTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fpn_profile (profile_id),
        FOREIGN KEY (profile_id) REFERENCES favourite_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log("✅ favourite_profile_notes ready");
  } finally {
    await c.end();
  }
}

run().catch(e => { console.error("Migration error:", e); process.exit(1); });

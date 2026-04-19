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
    console.log("Creating refresh_tokens table...");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        token_hash  VARCHAR(64) NOT NULL UNIQUE,
        expires_at  DATETIME NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at  DATETIME NULL,
        ip_address  VARCHAR(45) NULL,
        user_agent  VARCHAR(512) NULL,
        INDEX idx_refresh_user_id    (user_id),
        INDEX idx_refresh_token_hash (token_hash),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("refresh_tokens table created (or already exists).");
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

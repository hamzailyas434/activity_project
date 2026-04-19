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
    console.log("Creating audit_log table...");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NULL,
        action      VARCHAR(100) NOT NULL,
        resource    VARCHAR(100) NULL,
        resource_id VARCHAR(50)  NULL,
        ip_address  VARCHAR(45)  NULL,
        user_agent  VARCHAR(512) NULL,
        status_code SMALLINT     NULL,
        metadata    JSON         NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user_id    (user_id),
        INDEX idx_audit_action     (action),
        INDEX idx_audit_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("audit_log table created (or already exists).");
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

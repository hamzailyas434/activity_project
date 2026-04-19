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
    console.log("Adding 2FA columns to users table...");

    const columns = [
      ["totp_secret",  "ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL"],
      ["totp_enabled", "ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0"],
    ];

    for (const [name, sql] of columns) {
      try {
        await connection.query(sql);
        console.log(`  Added column: ${name}`);
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log(`  Column already exists (skipped): ${name}`);
        } else {
          throw err;
        }
      }
    }

    console.log("2FA migration complete.");
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

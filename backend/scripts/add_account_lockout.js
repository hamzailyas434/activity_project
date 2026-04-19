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
    console.log("Adding account lockout columns to users table...");

    const columns = [
      ["failed_login_attempts", "ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0"],
      ["lockout_until",         "ALTER TABLE users ADD COLUMN lockout_until DATETIME NULL"],
      ["last_failed_login",     "ALTER TABLE users ADD COLUMN last_failed_login DATETIME NULL"],
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

    console.log("Account lockout migration complete.");
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

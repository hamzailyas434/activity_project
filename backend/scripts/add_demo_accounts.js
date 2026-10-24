// Demo accounts: users.is_demo + reset/claim timestamps. Safe to run twice.
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    const cols = [
      ["is_demo", "TINYINT(1) NOT NULL DEFAULT 0"],
      ["demo_reset_at", "DATETIME(3) NULL"],
      ["demo_claimed_at", "DATETIME(3) NULL"],
    ];
    for (const [name, def] of cols) {
      const [has] = await c.query("SHOW COLUMNS FROM users LIKE ?", [name]);
      if (has.length) { console.log(`users.${name} already exists`); continue; }
      await c.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
      console.log(`✅ Added users.${name}`);
    }
  } finally {
    await c.end();
  }
}

run().catch(e => { console.error("Migration error:", e); process.exit(1); });

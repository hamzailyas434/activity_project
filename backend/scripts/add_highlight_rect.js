// Area highlights for scanned PDFs: book_highlights.rect = "x,y,w,h" as fractions of the page. Safe to run twice.
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    const [has] = await c.query("SHOW COLUMNS FROM book_highlights LIKE 'rect'");
    if (has.length) console.log("book_highlights.rect already exists");
    else { await c.query("ALTER TABLE book_highlights ADD COLUMN rect VARCHAR(64) NULL"); console.log("✅ Added book_highlights.rect"); }
  } finally {
    await c.end();
  }
}

run().catch(e => { console.error("Migration error:", e); process.exit(1); });

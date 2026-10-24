// v3: nullable activities.`group` (Prayers / Dhikr / Study / Health) seeded from names, plus the day_journal table.
const mysql = require('mysql2/promise');
require('dotenv').config();

const RULES = [
  ['Prayers', /fajr|fajar|zohr|zuhr|dhuhr|asr|asar|magh?rib|isha|namaz|salah|salat|tahajjud|witr/i],
  ['Dhikr', /tasbeeh|tasbih|dhikr|zikr|hadees|hadith|kisa|dua|durood|darood|ziyarat|ziarat/i],
  ['Study', /quran|tajweed|tafseer|tafsir|nahj|study|read|book|course|salesforce|german|lesson|learn|kafi/i],
  ['Health', /vitamin|walk|run|gym|exercise|workout|water|sleep|yoga|diet|steps|health/i],
];

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    const [cols] = await c.query("SHOW COLUMNS FROM activities LIKE 'group'");
    if (!cols.length) {
      await c.query("ALTER TABLE activities ADD COLUMN `group` VARCHAR(20) NULL DEFAULT NULL");
      console.log('✅ Added activities.group');
    } else console.log('activities.group already exists');

    const [acts] = await c.query('SELECT id, name FROM activities WHERE `group` IS NULL');
    let n = 0;
    for (const a of acts) {
      const hit = RULES.find(([, re]) => re.test(a.name || ''));
      if (hit) { await c.query('UPDATE activities SET `group` = ? WHERE id = ?', [hit[0], a.id]); n++; }
    }
    console.log(`✅ Seeded group for ${n} of ${acts.length} activities`);

    await c.query(`CREATE TABLE IF NOT EXISTS day_journal (
      user_id INT NOT NULL,
      journal_date DATE NOT NULL,
      text TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, journal_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    console.log('✅ day_journal table ready');
  } finally {
    await c.end();
  }
}

run().catch(e => { console.error('Migration error:', e); process.exit(1); });

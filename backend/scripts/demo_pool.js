/*
  Demo account pool (run add_demo_accounts.js first).
    node scripts/demo_pool.js            make sure 5 demo accounts exist
    node scripts/demo_pool.js 10         make sure 10 exist
    node scripts/demo_pool.js --reset    reset every demo account to the demo data now
*/
require("dotenv").config({ quiet: true });
const db = require("../config/database");
const { createDemoUser, resetDemoUser } = require("../utils/demoSeed");

async function run() {
  const reset = process.argv.includes("--reset");
  const want = parseInt(process.argv.find(a => /^\d+$/.test(a)) || "5", 10);
  const [rows] = await db.query("SELECT id, username FROM users WHERE is_demo = 1 ORDER BY id");
  if (reset) for (const r of rows) { await resetDemoUser(r.id); console.log(`Reset ${r.username}`); }
  for (let i = rows.length; i < want; i++) { const u = await createDemoUser(); console.log(`Created ${u.username}`); }
  const [all] = await db.query("SELECT COUNT(*) n FROM users WHERE is_demo = 1");
  console.log(`${all[0].n} demo accounts ready`);
}

run().then(() => process.exit(0)).catch(e => { console.error("Demo pool error:", e); process.exit(1); });

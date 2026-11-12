/*
  Demo accounts: a fixed student dataset (no religious content) that any demo user can be
  reset to. Dates are relative to "today", so a demo always shows the last three months.

  resetDemoUser(userId)  wipe everything the user owns and load the dataset again
  createDemoUser()       add the next demo_NN account (unusable password, Qaza tab hidden)
  resetStaleDemos()      reset demo accounts last reset more than 24 hours ago
  claimDemoUser()        hand a visitor the least recently used demo account (reset if it was used)
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/database");

const COLORS = { red: "#E5432F", gold: "#E9B44C", green: "#58B98B", blue: "#7A9BF5", violet: "#A98BF0" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* name, type, group, how often it gets done (0–1), value for number/text routines */
const ROUTINES = [
  ["Lecture review", "checkbox", "Study", 0.8],
  ["Problem set (1 hr)", "checkbox", "Study", 0.7],
  ["Read 20 pages", "checkbox", "Study", 0.65],
  ["Flashcards", "number", "Study", 0.7, r => String(20 + Math.floor(r() * 40))],
  ["German lesson", "checkbox", "Study", 0.55],
  ["Coding practice", "number", "Study", 0.6, r => String(30 + Math.floor(r() * 6) * 15)],
  ["Morning run", "checkbox", "Health", 0.5],
  ["Water 8 glasses", "checkbox", "Health", 0.75],
  ["Sleep by 11:30", "checkbox", "Health", 0.55],
  ["Plan tomorrow", "checkbox", null, 0.7],
  ["No phone after 11", "checkbox", null, 0.45],
  ["Mood", "text", null, 0.6, r => ["focused", "tired", "good", "stressed", "great", "calm", "okay"][Math.floor(r() * 7)]],
];

const CELL_NOTES = {
  "Lecture review": ["Rewatched the B-tree part twice — finally clicked", "Skipped, lab ran late", "Made a one-page summary for DBMS"],
  "Problem set (1 hr)": ["Q4 on recursion took 40 min", "Stuck on dynamic programming, ask TA", "Finished early, did extra questions"],
  "Read 20 pages": ["Clean Code ch. 3 — small functions", "Only 12 pages, too sleepy"],
  "German lesson": ["Dativ prepositions: aus, bei, mit, nach, seit, von, zu", "Duolingo streak saved at 11:58"],
  "Morning run": ["3.2 km in 21 min", "Rain — did 20 min indoor workout instead"],
  "Coding practice": ["LeetCode: two-pointer problems", "Built the login form for the group project"],
};

const NOTES = [
  ["Data Structures", "What is the time complexity of searching in a balanced BST?", ["O(log n) — every comparison halves the remaining tree. A skewed (unbalanced) tree degrades to O(n), which is why AVL and Red-Black trees rebalance."], true],
  ["Data Structures", "Stack vs Queue — when do I use which?", ["Stack = LIFO (undo, recursion, matching brackets). Queue = FIFO (BFS, task scheduling, print jobs).", "Trick: if the last thing in must be handled first, it's a stack."]],
  ["Data Structures", "How does a hash table handle collisions?", ["Chaining: each bucket holds a list. Open addressing: probe for the next free slot (linear / quadratic / double hashing). Keep load factor under ~0.7."]],
  ["Databases", "Explain 1NF, 2NF and 3NF in one line each", ["1NF: atomic values, no repeating groups.<br>2NF: 1NF + no partial dependency on part of a composite key.<br>3NF: 2NF + no transitive dependency (non-key → non-key)."], true],
  ["Databases", "INNER JOIN vs LEFT JOIN", ["INNER returns only matching rows. LEFT keeps every row of the left table and fills NULL where the right side has no match."]],
  ["Databases", "What does ACID stand for?", ["Atomicity, Consistency, Isolation, Durability — the guarantees a transaction gives."]],
  ["Physics", "Newton's second law and its units", ["F = m·a. Force in newtons (kg·m/s²). Net force, not any single force."]],
  ["Physics", "Difference between speed and velocity", ["Speed is scalar (how fast). Velocity is a vector (how fast + direction). Average velocity can be zero on a round trip while average speed isn't."]],
  ["Maths", "Derivative of sin(x)·x²", ["Product rule: cos(x)·x² + 2x·sin(x)."]],
  ["Maths", "When is a matrix invertible?", ["When its determinant ≠ 0 (full rank, columns linearly independent)."]],
  ["German", "Akkusativ vs Dativ articles", ["Akk: den / die / das / die. Dat: dem / der / dem / den (+n on plural nouns).", "Mnemonic for Dativ prepositions: aus-bei-mit-nach-seit-von-zu."], true],
  ["German", "How do I say 'I have been studying for two hours'?", ["Ich lerne seit zwei Stunden. (German uses present tense with seit.)"]],
  ["Exam prep", "Pomodoro setup that works for me", ["50 min focus / 10 min break, phone in another room. After 3 rounds take a 30 min walk."]],
  ["Exam prep", "Checklist the night before an exam", ["Student ID, two pens, calculator with fresh battery, water bottle. Sleep by 11. No new topics after 9 pm."]],
  ["Career", "Elevator pitch for internship fairs", ["I'm a junior CS major who builds small full-stack apps — most recently a habit tracker with React and Node. I'm looking for a summer internship where I can ship real features."]],
];

const STICKIES = [["DBMS quiz on Thursday — revise joins + normalisation", "gold"], ["Return library book by the 30th", "red"], ["Group project standup: Mon & Thu 6 pm", "blue"], ["Gym bag in the car 🏃", "green"]];

/* [day of month or null, text]; done = the day has passed (undated: fixed) */
const GOALS_NOW = [[8, "Submit OOP assignment"], [15, "Physics lab report"], [28, "DBMS mid-term"], [30, "Apply to 3 internships"], [null, "Finish Clean Code book", 0], [null, "Run 50 km this month", 0]];
const GOALS_PREV = [[null, "Set up study timetable", 1], [20, "German A1 test"], [null, "Read 4 chapters of Clean Code", 1], [null, "Open a savings account", 0]];
const GOALS_NEXT = [[5, "Final project proposal"], [null, "Start CV + LinkedIn", 0]];

const JOURNAL = [
  [1, "New month. Goal: be consistent, not perfect. Timetable is pinned above my desk."],
  [3, "Long lab day. Barely got anything else done but the lab report draft is ready."],
  [7, "Morning run felt great. Studied in the library till 6 — very productive."],
  [12, "Bad sleep, skipped the run. Still did the problem set. Small wins."],
  [15, "Submitted the physics report. Grabbed pizza with Jake to celebrate."],
  [18, "Weekend. Mostly rested, did German and flashcards in the evening."],
  [21, "Mock DBMS quiz: 7/10. Need to revise transactions and isolation levels."],
  [24, "Group project meeting went well — I'm doing the login and dashboard screens."],
];

const EXPENSES = [ // name, category, amount (USD), day, note
  ["Apartment rent (shared)", "home_bills", 750, 1, "Venmo to landlord"], ["Internet (shared)", "home_bills", 25, 5, ""], ["Phone plan", "home_bills", 35, 3, ""],
  ["Groceries", "other", 280, 2, "Trader Joe's + Costco run"], ["Textbooks & printing", "other", 90, 9, "DBMS textbook rental"], ["Transport", "other", 65, 4, "Bus pass + a few Ubers"],
  ["Coffee with friends", "other", 45, 14, ""], ["Gym membership", "other", 30, 6, ""], ["Family phone plan", "home_person", 40, 10, "My share on Mom's plan"],
];
const INCOME = [1350, 1400, 1480]; // campus job, two months ago → this month

const PEOPLE = [
  { name: "Mom", relation: "Parent", color: "red", bday: "1974-03-12", shoe: "7.5 US", dress: "Burgundy", notes: "Loves chai lattes and hand-written cards.", prefs: [["Perfume", "Soft floral, not too strong"], ["Books", "Mary Oliver poetry"]], gifts: [[-200, "Cashmere scarf", 45, "red"], [-160, "Flowers", 25, "violet"]] },
  { name: "Dad", relation: "Parent", color: "blue", bday: "1970-11-02", shoe: "10 US", dress: "Navy", notes: "Always asks about exams first. Big Yankees fan.", prefs: [["Gadgets", "Wants a fitness band"], ["Clothes", "Flannel shirts, size L"]], gifts: [[8, "Fitness band", 0, "blue", "saving up for it"]] },
  { name: "Lily", relation: "Sibling", color: "violet", bday: "2009-10-22", shoe: "6.5 US", dress: "Lavender", notes: "Sophomore in high school, into sketching.", prefs: [["Books", "Graphic novels"], ["Gadgets", "Drawing tablet someday"]], gifts: [[-3, "Sketchbook + pens", 30, "violet"]] },
  { name: "Jake", relation: "Friend", color: "green", bday: "2005-01-19", shoe: "11 US", dress: "Black", notes: "Roommate. Study partner for DBMS.", prefs: [["Books", "Sci-fi"]], gifts: [] },
  { name: "Prof. Sarah Mitchell", relation: "Colleague", color: "gold", bday: null, shoe: "", dress: "", notes: "Project advisor. Office hours Tue 2–4 pm.", prefs: [], gifts: [] },
];

const BOOK_PAGES = [
  { title: "Study Smarter: A Student Handbook", lines: ["A short guide to learning well at university.", "", "Contents", "1. Active recall", "2. Spaced repetition", "3. Deep work blocks", "4. Taking good notes", "5. Sleep and memory", "6. Exam week", "7. Working in groups", "8. Avoiding burnout", "9. Planning a semester", "10. Habits that stick"] },
  { title: "1. Active recall", lines: ["Re-reading feels productive but builds little memory.", "Close the book and try to explain the idea from scratch.", "Every time you pull a fact out of memory, it gets stronger.", "Turn headings into questions and answer them aloud."] },
  { title: "2. Spaced repetition", lines: ["Review just before you would forget: 1 day, 3 days, 1 week, 1 month.", "Flashcards work best when you write them yourself.", "Short daily sessions beat one long weekly session."] },
  { title: "3. Deep work blocks", lines: ["Pick one task. Phone in another room.", "Work 50 minutes, break 10. Three rounds, then a long break.", "Protect the same time every day so it becomes automatic."] },
  { title: "4. Taking good notes", lines: ["Write less, think more: summarise in your own words.", "Cornell layout: cues on the left, notes on the right,", "a three-line summary at the bottom of each page."] },
  { title: "5. Sleep and memory", lines: ["Memories consolidate while you sleep.", "An all-nighter trades tomorrow's recall for tonight's hours.", "7-8 hours before an exam is part of revision, not a break from it."] },
  { title: "6. Exam week", lines: ["No new topics in the last 24 hours.", "Do past papers under timed conditions.", "Prepare the bag the night before: ID, pens, calculator, water."] },
  { title: "7. Working in groups", lines: ["Agree on roles and a weekly check-in on day one.", "Keep a shared task list with owners and dates.", "Teaching a teammate is one of the best ways to learn."] },
  { title: "8. Avoiding burnout", lines: ["Schedule rest like you schedule lectures.", "Move every day, even a 20 minute walk.", "Notice early signs: dread, poor sleep, constant tiredness."] },
  { title: "9. Planning a semester", lines: ["Put every deadline from every course in one calendar.", "Work backwards: split big projects into weekly milestones.", "Review the plan every Sunday for 15 minutes."] },
  { title: "10. Habits that stick", lines: ["Make it obvious, make it small, make it daily.", "Track it, but don't break yourself over a missed day.", "Never miss twice."] },
  { title: "Notes", lines: ["Use this page for your own reflections."] },
];

/* A small, valid multi-page PDF (Helvetica text) */
function makePdf(pages) {
  const esc = s => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pagesId = objs.length + 1 + pages.length * 2;
  const kids = [];
  pages.forEach((p, i) => {
    let y = 760, ops = `BT /F2 20 Tf 60 ${y} Td (${esc(p.title)}) Tj ET\n`;
    y -= 36;
    for (const line of p.lines) { ops += `BT /F1 12 Tf 60 ${y} Td (${esc(line)}) Tj ET\n`; y -= 20; }
    ops += `BT /F1 9 Tf 290 40 Td (${i + 1}) Tj ET\n`;
    const content = add(`<< /Length ${Buffer.byteLength(ops)} >>\nstream\n${ops}endstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`));
  });
  add(`<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${kids.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let out = "%PDF-1.4\n";
  const offs = objs.map((o, i) => { const at = Buffer.byteLength(out); out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

// Every table a user's data lives in (children before parents)
const USER_TABLES = ["book_favourite_pages", "book_highlights", "book_page_notes", "book_progress", "books", "reading_goals",
  "activity_completions", "month_routines", "day_journal", "activities", "note_answers", "note_attachments", "notes",
  "sticky_notes", "monthly_todos", "expenses", "expense_budgets", "person_ledger", "favourite_profile_notes", "favourite_profile_records",
  "favourite_profile_categories", "favourite_profiles", "user_settings", "refresh_tokens", "qaza_namaz"];

async function wipeUserData(c, uid) {
  const [books] = await c.query("SELECT file_path FROM books WHERE user_id = ?", [uid]);
  for (const t of USER_TABLES) {
    try { await c.query(`DELETE FROM ${t} WHERE user_id = ?`, [uid]); }
    catch (err) { if (err.code !== "ER_NO_SUCH_TABLE" && err.code !== "ER_BAD_FIELD_ERROR") throw err; }
  }
  return books.map(b => b.file_path); // deleted from disk after commit
}

async function seedUserData(c, uid) {
  let seed = 20261025 + uid; // same data every reset of this account
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const months = [2, 1, 0].map(k => { const d = new Date(today.getFullYear(), today.getMonth() - k, 1); return [d.getFullYear(), d.getMonth() + 1]; });
  const [cy, cm] = months[2], [py, pm] = months[1];
  const nextM = new Date(cy, cm, 1);
  const q = (sql, args) => c.query(sql, args).then(([r]) => r);
  const many = async (sql, rows) => { for (let i = 0; i < rows.length; i += 400) await q(sql, [rows.slice(i, i + 400)]); };

  // routines + month lists (the first month starts without "Mood")
  const acts = [];
  for (let i = 0; i < ROUTINES.length; i++) {
    const [name, type, group] = ROUTINES[i];
    const r = await q("INSERT INTO activities (name, type, icon, color, user_id, `group`, display_order) VALUES (?, ?, '✓', '#6366f1', ?, ?, ?)", [name, type, uid, group, i]);
    acts.push({ id: r.insertId, def: ROUTINES[i] });
  }
  const mr = [];
  months.forEach(([y, m], k) => acts.filter(a => !(k === 0 && a.def[0] === "Mood")).forEach((a, i) => mr.push([uid, a.id, y, m, i])));
  await many("INSERT INTO month_routines (user_id, activity_id, year, month, display_order) VALUES ?", mr);

  // ticks, values, cell notes, colours
  const cells = [];
  months.forEach(([y, m], k) => {
    const days = new Date(y, m, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt > today) break;
      const isToday = +dt === +today, weekend = dt.getDay() === 0 || dt.getDay() === 6, dayMood = rnd() * 0.3 - 0.15;
      for (const a of acts) {
        if (k === 0 && a.def[0] === "Mood") continue;
        const [name, , group, rate, val] = a.def;
        let p = rate + dayMood + k * 0.04 - (weekend && group === "Study" ? 0.2 : 0);
        if (isToday) p = group === "Health" ? 0.9 : 0.25; // today is half done
        const done = rnd() < p;
        const note = CELL_NOTES[name] && rnd() < 0.07 ? JSON.stringify([pick(CELL_NOTES[name])]) : "";
        const color = done && rnd() < 0.05 ? pick([COLORS.green, COLORS.blue, COLORS.gold]) : "";
        if (!done && !note) continue;
        cells.push([uid, a.id, ymd(dt), done ? 1 : 0, done && val ? val(rnd) : "", color, note]);
      }
    }
  });
  await many("INSERT INTO activity_completions (user_id, activity_id, completion_date, is_completed, value, completion_color, note) VALUES ?", cells);

  const journal = JOURNAL.filter(([d]) => d <= today.getDate()).map(([d, t]) => [uid, `${cy}-${pad(cm)}-${pad(d)}`, t]);
  journal.push([uid, `${py}-${pad(pm)}-20`, "German A1 test done! Speaking part was scary but I think I passed."]);
  await many("INSERT INTO day_journal (user_id, journal_date, text) VALUES ?", journal);

  // notes with answers, spread over the last ~80 days
  for (let i = 0; i < NOTES.length; i++) {
    const [cat, question, answers, good] = NOTES[i];
    const created = addDays(today, -80 + i * 5);
    const n = await q("INSERT INTO notes (user_id, category, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [uid, cat, question, answers[0], created, created]);
    await many("INSERT INTO note_answers (note_id, user_id, answer, is_very_good, display_order) VALUES ?", answers.map((a, j) => [n.insertId, uid, a, good && j === 0 ? 1 : 0, j]));
  }

  await many("INSERT INTO sticky_notes (user_id, text, color, display_order) VALUES ?", STICKIES.map(([t, c], i) => [uid, t, COLORS[c], i]));

  const goals = [];
  const addGoals = (list, y, m, cur) => list.forEach(([d, text, fixed], i) => {
    const doneG = fixed !== undefined ? fixed : cur === "past" ? 1 : cur === "now" ? (d <= today.getDate() ? 1 : 0) : 0;
    goals.push([uid, m, y, d ? `${d} ${MON[m - 1]}: ${text}` : text, doneG, i]);
  });
  addGoals(GOALS_PREV, py, pm, "past");
  addGoals(GOALS_NOW, cy, cm, "now");
  addGoals(GOALS_NEXT, nextM.getFullYear(), nextM.getMonth() + 1, "next");
  await many("INSERT INTO monthly_todos (user_id, month, year, text, completed, sort_order) VALUES ?", goals);

  // money
  const exp = [];
  months.forEach(([y, m], k) => {
    EXPENSES.forEach(([name, cat, amount, day, note], i) => {
      if (k === 2 && day > today.getDate()) return;
      const amt = cat === "home_bills" ? amount : Math.round((amount * (0.8 + rnd() * 0.4)) / 5) * 5; // whole $5 steps
      exp.push([uid, cat, name, amt, note, m, y, i, `${y}-${pad(m)}-${pad(day)}`]);
    });
  });
  exp.push([uid, "other", "Ask Dad about laptop repair", 0, "memo", cm, cy, 99, null]);
  await many("INSERT INTO expenses (user_id, category, name, amount, note, month, year, display_order, bill_date) VALUES ?", exp);
  await many("INSERT INTO expense_budgets (user_id, month, year, total_income, remaining_sent_home) VALUES ?", months.map(([y, m], k) => [uid, m, y, INCOME[k], k === 1 ? 1 : 0]));
  await many("INSERT INTO person_ledger (user_id, person_name, month, year, amount, other_amount, note) VALUES ?",
    [[uid, "Jake", cm, cy, 60, 0, "Lent for concert tickets"], [uid, "Mom", cm, cy, 150, 50, "Holding for Lily's school trip"]]);

  // people
  for (const p of PEOPLE) {
    const r = await q("INSERT INTO favourite_profiles (user_id, name, relation, color, bday, phone, category, shoe_number, dress_color, notes) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?)",
      [uid, p.name, p.relation, p.color, p.bday, p.relation, p.shoe, p.dress, p.notes]);
    if (p.prefs.length) await many("INSERT INTO favourite_profile_categories (profile_id, user_id, category, notes, sort_order) VALUES ?", p.prefs.map(([cat, n], i) => [r.insertId, uid, cat, n, i]));
    if (p.gifts.length) await many("INSERT INTO favourite_profile_records (profile_id, user_id, month, year, gift_item, gift_date, amount, gift_color, note) VALUES ?",
      p.gifts.map(([off, item, amount, color, note]) => { const d = addDays(today, off); return [r.insertId, uid, d.getMonth() + 1, d.getFullYear(), item, ymd(d), amount, COLORS[color], note || ""]; }));
  }

  // books: a generated PDF and the bundled EPUB, each copied for this account
  const dir = path.join(__dirname, "../uploads/books");
  fs.mkdirSync(dir, { recursive: true });
  const tag = `demo-${uid}-${Date.now()}`;
  const pdfPath = `uploads/books/${tag}-study-smarter.pdf`, epubPath = `uploads/books/${tag}-tiny-habits.epub`;
  fs.writeFileSync(path.join(__dirname, "..", pdfPath), makePdf(BOOK_PAGES));
  fs.copyFileSync(path.join(__dirname, "../demo/tiny-habits.epub"), path.join(__dirname, "..", epubPath));
  const pdf = await q("INSERT INTO books (user_id, title, author, total_pages, file_path) VALUES (?, 'Study Smarter', 'Demo Press', ?, ?)", [uid, BOOK_PAGES.length, pdfPath]);
  const epub = await q("INSERT INTO books (user_id, title, author, total_pages, file_path, created_at) VALUES (?, 'Tiny Habits for Students', 'Demo Press', 0, ?, ?)", [uid, epubPath, addDays(today, -20)]);
  await many("INSERT INTO book_progress (user_id, book_id, current_page, pages_read_today, last_read_date) VALUES ?",
    [[uid, pdf.insertId, 7, 4, ymd(today)], [uid, epub.insertId, 3, 0, ymd(addDays(today, -2))]]);
  await q("INSERT INTO reading_goals (user_id, daily_pages_goal) VALUES (?, 10)", [uid]);
  await many("INSERT INTO book_page_notes (user_id, book_id, page_number, title, content, is_favourite) VALUES ?", [
    [2, "<p><strong>Try this:</strong> after each lecture, write 3 questions from memory before opening the slides.</p>", 1],
    [3, "<p>Set up Anki decks:</p><ul><li>DBMS</li><li>Physics formulas</li><li>German vocab</li></ul>", 1],
    [4, "<p>My best focus time is <strong>8–11 am</strong>. Keep that for problem sets.</p>", 0],
    [5, "<h3>Cornell notes</h3><p>Started them for Physics — the summary box is the most useful part.</p>", 0],
    [6, "<blockquote><p><em>Sleep IS revision.</em></p></blockquote><p>Stop the 2 am cramming.</p>", 1],
    [7, "<p>Past papers: DBMS 2023 + 2024 before the mid-term.</p>", 0],
  ].map(([pg, content, fav]) => [uid, pdf.insertId, pg, "", content, fav]));
  await many("INSERT INTO book_highlights (user_id, book_id, page_number, selected_text, note, color) VALUES ?",
    [[uid, pdf.insertId, 2, "Every time you pull a fact out of memory, it gets stronger.", null, COLORS.gold], [uid, pdf.insertId, 11, "Never miss twice.", null, COLORS.gold]]);
  await many("INSERT INTO book_favourite_pages (user_id, book_id, page_number) VALUES ?", [2, 6, 11].map(pg => [uid, pdf.insertId, pg]));
}

async function resetDemoUser(userId) {
  const c = await db.getConnection();
  let oldFiles = [];
  try {
    const [[u]] = await c.query("SELECT id, is_demo FROM users WHERE id = ?", [userId]);
    if (!u || !u.is_demo) throw Object.assign(new Error("Not a demo account"), { status: 400 });
    await c.beginTransaction();
    oldFiles = await wipeUserData(c, userId);
    await seedUserData(c, userId);
    await c.query("UPDATE users SET demo_reset_at = NOW(), first_name = 'Emily', last_name = 'Carter', profile_picture = NULL, hidden_tabs = ?, totp_enabled = 0, totp_secret = NULL, failed_login_attempts = 0, lockout_until = NULL WHERE id = ?",
      [JSON.stringify(["qaza-namaz"]), userId]);
    await c.commit();
  } catch (err) {
    try { await c.rollback(); } catch { /* not in a transaction */ }
    throw err;
  } finally {
    c.release();
  }
  for (const f of oldFiles) { try { fs.unlinkSync(path.join(__dirname, "..", f)); } catch { /* already gone */ } }
}

async function createDemoUser() {
  const [rows] = await db.query("SELECT username FROM users WHERE username LIKE 'demo\\_%'");
  const taken = new Set(rows.map(r => r.username));
  let n = 1;
  while (taken.has(`demo_${pad(n)}`)) n++;
  const username = `demo_${pad(n)}`;
  // nobody knows this password: demo accounts only open through /api/users/demo-login
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const r = await db.query(
    "INSERT INTO users (username, email, password_hash, first_name, last_name, role, hidden_tabs, is_demo) VALUES (?, ?, ?, 'Emily', 'Carter', 'user', ?, 1)",
    [username, `${username}@demo.rhythm.test`, hash, JSON.stringify(["qaza-namaz"])]
  );
  const id = r[0].insertId;
  await resetDemoUser(id);
  return { id, username };
}

async function resetStaleDemos() {
  const [rows] = await db.query("SELECT id FROM users WHERE is_demo = 1 AND (demo_reset_at IS NULL OR demo_reset_at < NOW() - INTERVAL 24 HOUR)");
  for (const r of rows) await resetDemoUser(r.id);
  return rows.length;
}

/* Least recently handed-out demo account; reset first if someone used it since its last reset.
   The conditional UPDATE makes two simultaneous visitors pick different accounts. */
async function claimDemoUser() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const [rows] = await db.query(
      `SELECT id, username, email, role, hidden_tabs, demo_reset_at, demo_claimed_at FROM users
       WHERE is_demo = 1 ORDER BY demo_claimed_at IS NOT NULL, demo_claimed_at, id LIMIT 1`
    );
    if (!rows.length) return null;
    const u = rows[0];
    const [upd] = await db.query("UPDATE users SET demo_claimed_at = NOW(3) WHERE id = ? AND demo_claimed_at <=> ?", [u.id, u.demo_claimed_at]);
    if (!upd.affectedRows) continue;
    if (u.demo_claimed_at && (!u.demo_reset_at || u.demo_claimed_at > u.demo_reset_at)) {
      await resetDemoUser(u.id);
      await db.query("UPDATE users SET demo_claimed_at = NOW(3) WHERE id = ?", [u.id]); // stay newer than the reset
    }
    return u;
  }
  return null;
}

module.exports = { resetDemoUser, createDemoUser, resetStaleDemos, claimDemoUser };

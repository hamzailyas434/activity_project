const db = require("../config/database");

const missing = err => err.code === "ER_NO_SUCH_TABLE";

// GET /api/day-journal?year=&month=  → [{ date: "YYYY-MM-DD", text }]
exports.getMonth = async (req, res) => {
  const y = parseInt(req.query.year, 10), m = parseInt(req.query.month, 10);
  if (!y || !m) return res.status(400).json({ error: "Year and month are required" });
  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(journal_date, '%Y-%m-%d') AS date, text FROM day_journal
       WHERE user_id = ? AND YEAR(journal_date) = ? AND MONTH(journal_date) = ?`,
      [req.user.id, y, m]
    );
    res.json(rows);
  } catch (err) {
    if (missing(err)) return res.json([]);
    console.error("dayJournal.getMonth error:", err);
    res.status(500).json({ error: "Failed to fetch journal" });
  }
};

// PUT /api/day-journal/:date  { text } — empty text deletes the entry
exports.save = async (req, res) => {
  const { date } = req.params;
  const text = String(req.body.text ?? "").trim();
  try {
    if (!text) {
      await db.query("DELETE FROM day_journal WHERE user_id = ? AND journal_date = ?", [req.user.id, date]);
    } else {
      await db.query(
        `INSERT INTO day_journal (user_id, journal_date, text) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE text = VALUES(text)`,
        [req.user.id, date, text]
      );
    }
    res.json({ date, text });
  } catch (err) {
    if (missing(err)) return res.status(503).json({ error: "Journal not set up yet — run scripts/add_activity_group_and_journal.js" });
    console.error("dayJournal.save error:", err);
    res.status(500).json({ error: "Failed to save journal" });
  }
};

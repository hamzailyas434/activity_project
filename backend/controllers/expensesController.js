const db = require("../config/database");

/** Ensures migration for remaining_sent_home (avoids 500 if manual migration was not run). */
let ensureBudgetColumnPromise = null;
function ensureExpenseBudgetRemainingColumn() {
  if (!ensureBudgetColumnPromise) {
    ensureBudgetColumnPromise = (async () => {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expense_budgets' AND COLUMN_NAME = 'remaining_sent_home'`
      );
      if (Number(rows[0].c) > 0) return;
      try {
        await db.query(
          `ALTER TABLE expense_budgets ADD COLUMN remaining_sent_home TINYINT(1) NOT NULL DEFAULT 0`
        );
      } catch (e) {
        if (e.errno !== 1060) throw e;
      }
    })().catch((err) => {
      ensureBudgetColumnPromise = null;
      throw err;
    });
  }
  return ensureBudgetColumnPromise;
}

// GET /api/expenses/budget?month=&year=
exports.getBudget = async (req, res) => {
  try {
    await ensureExpenseBudgetRemainingColumn();
    const userId = req.user.id;
    const { month, year } = req.query;

    const [rows] = await db.query(
      "SELECT * FROM expense_budgets WHERE user_id = ? AND month = ? AND year = ?",
      [userId, month, year]
    );
    const row = rows[0];
    if (!row) {
      return res.json({ total_income: 0, remaining_sent_home: false });
    }
    res.json({
      ...row,
      remaining_sent_home: Boolean(row.remaining_sent_home),
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
};

// POST /api/expenses/budget
exports.upsertBudget = async (req, res) => {
  try {
    await ensureExpenseBudgetRemainingColumn();
    const userId = req.user.id;
    const { month, year, total_income } = req.body;
    const rawFlag = req.body.remaining_sent_home;
    const remainingSentHome =
      rawFlag === true || rawFlag === 1 || rawFlag === "1" || rawFlag === "true" ? 1 : 0;

    await db.query(
      `INSERT INTO expense_budgets (user_id, month, year, total_income, remaining_sent_home)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_income = ?, remaining_sent_home = ?`,
      [userId, month, year, total_income, remainingSentHome, total_income, remainingSentHome]
    );

    const [rows] = await db.query(
      "SELECT * FROM expense_budgets WHERE user_id = ? AND month = ? AND year = ?",
      [userId, month, year]
    );
    const row = rows[0];
    res.json({
      ...row,
      remaining_sent_home: Boolean(row.remaining_sent_home),
    });
  } catch (error) {
    console.error("Error upserting budget:", error);
    res.status(500).json({ error: "Failed to save budget" });
  }
};

// GET /api/expenses?month=&year=
exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const [rows] = await db.query(
      `SELECT * FROM expenses
       WHERE user_id = ? AND month = ? AND year = ?
       ORDER BY category ASC, display_order ASC, created_at ASC`,
      [userId, month, year]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, name, amount = 0, note = "", month, year, display_order = 0, bill_date = null } = req.body;

    const [result] = await db.query(
      `INSERT INTO expenses (user_id, category, name, amount, note, month, year, display_order, bill_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, category, name, amount, note, month, year, display_order, bill_date || null]
    );

    const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, amount, note, bill_date } = req.body;

    const [result] = await db.query(
      "UPDATE expenses SET name = ?, amount = ?, note = ?, bill_date = ? WHERE id = ? AND user_id = ?",
      [name, amount, note ?? "", bill_date || null, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};

// ── Person ledger (person_ledger: amount = held, other_amount = pending) ──────
const ledgerMissing = e => e.code === "ER_NO_SUCH_TABLE";
const num = v => (v === "" || v == null || isNaN(Number(v)) ? 0 : Number(v));

// GET /api/expenses/ledger?month=&year=
exports.getLedger = async (req, res) => {
  try {
    // Latest entry per person up to the selected month (the ledger is a running balance)
    const m = parseInt(req.query.month, 10), y = parseInt(req.query.year, 10);
    if (!m || !y) return res.status(400).json({ error: "Month and year are required" });
    const [rows] = await db.query(
      `SELECT * FROM person_ledger WHERE user_id = ? AND (year * 12 + month) <= ?
       ORDER BY year DESC, month DESC`,
      [req.user.id, y * 12 + m]
    );
    const seen = new Set();
    const latest = rows.filter(r => { const k = r.person_name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(r => ({ ...r, carried: r.month !== m || r.year !== y }))
      .sort((a, b) => a.person_name.localeCompare(b.person_name));
    res.json(latest);
  } catch (error) {
    if (ledgerMissing(error)) return res.json([]);
    console.error("Error fetching ledger:", error);
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
};

// POST /api/expenses/ledger { person_name, amount, other_amount, note, month, year } — upserts per person + month
exports.upsertLedger = async (req, res) => {
  try {
    const { person_name, amount, other_amount, note = "", month, year } = req.body;
    const name = String(person_name || "").trim();
    if (!name) return res.status(400).json({ error: "Person is required" });
    if (!month || !year) return res.status(400).json({ error: "Month and year are required" });
    await db.query(
      `INSERT INTO person_ledger (user_id, person_name, month, year, amount, other_amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), other_amount = VALUES(other_amount), note = VALUES(note)`,
      [req.user.id, name.slice(0, 200), month, year, num(amount), num(other_amount), note]
    );
    const [rows] = await db.query(
      "SELECT * FROM person_ledger WHERE user_id = ? AND person_name = ? AND month = ? AND year = ?",
      [req.user.id, name.slice(0, 200), month, year]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (ledgerMissing(error)) return res.status(503).json({ error: "Ledger not set up — run scripts/add_ledger_profiles_tables.js" });
    console.error("Error saving ledger:", error);
    res.status(500).json({ error: "Failed to save ledger entry" });
  }
};

// PUT /api/expenses/ledger/:id
exports.updateLedger = async (req, res) => {
  try {
    const { person_name, amount, other_amount, note = "" } = req.body;
    const name = String(person_name || "").trim();
    if (!name) return res.status(400).json({ error: "Person is required" });
    const [r] = await db.query(
      "UPDATE person_ledger SET person_name = ?, amount = ?, other_amount = ?, note = ? WHERE id = ? AND user_id = ?",
      [name.slice(0, 200), num(amount), num(other_amount), note, req.params.id, req.user.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: "Ledger entry not found" });
    const [rows] = await db.query("SELECT * FROM person_ledger WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "That person already has an entry this month" });
    console.error("Error updating ledger:", error);
    res.status(500).json({ error: "Failed to update ledger entry" });
  }
};

// DELETE /api/expenses/ledger/:id
exports.deleteLedger = async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM person_ledger WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Ledger entry not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting ledger:", error);
    res.status(500).json({ error: "Failed to delete ledger entry" });
  }
};

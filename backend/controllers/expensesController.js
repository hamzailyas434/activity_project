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

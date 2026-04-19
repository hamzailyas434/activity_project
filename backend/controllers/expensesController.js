const db = require("../config/database");

// GET /api/expenses/budget?month=&year=
exports.getBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const [rows] = await db.query(
      "SELECT * FROM expense_budgets WHERE user_id = ? AND month = ? AND year = ?",
      [userId, month, year]
    );
    res.json(rows[0] || { total_income: 0 });
  } catch (error) {
    console.error("Error fetching budget:", error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
};

// POST /api/expenses/budget
exports.upsertBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, total_income } = req.body;

    await db.query(
      `INSERT INTO expense_budgets (user_id, month, year, total_income)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_income = ?`,
      [userId, month, year, total_income, total_income]
    );

    const [rows] = await db.query(
      "SELECT * FROM expense_budgets WHERE user_id = ? AND month = ? AND year = ?",
      [userId, month, year]
    );
    res.json(rows[0]);
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

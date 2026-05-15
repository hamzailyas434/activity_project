const db = require("../config/database");

async function getAll(req, res) {
  try {
    const { month, year } = req.query;
    const [rows] = await db.query(
      `SELECT id, text, completed, sort_order
       FROM monthly_todos
       WHERE user_id = ? AND month = ? AND year = ?
       ORDER BY sort_order ASC, id ASC`,
      [req.user.id, month, year]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
}

async function create(req, res) {
  try {
    const { text, month, year, sort_order = 0 } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Text is required" });

    const [result] = await db.query(
      `INSERT INTO monthly_todos (user_id, month, year, text, completed, sort_order)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [req.user.id, month, year, text.trim(), sort_order]
    );
    res.status(201).json({ id: result.insertId, text: text.trim(), completed: 0, sort_order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create todo" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;

    const fields = [];
    const vals = [];

    if (text !== undefined) { fields.push("text = ?"); vals.push(text.trim()); }
    if (completed !== undefined) { fields.push("completed = ?"); vals.push(completed ? 1 : 0); }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    vals.push(req.user.id, id);
    await db.query(
      `UPDATE monthly_todos SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`,
      vals
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update todo" });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await db.query(
      `DELETE FROM monthly_todos WHERE user_id = ? AND id = ?`,
      [req.user.id, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete todo" });
  }
}

async function reorder(req, res) {
  try {
    const { orderedIds } = req.body; // array of ids in new order
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds required" });
    await Promise.all(
      orderedIds.map((id, index) =>
        db.query(
          "UPDATE monthly_todos SET sort_order = ? WHERE id = ? AND user_id = ?",
          [index, id, req.user.id]
        )
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder todos" });
  }
}

module.exports = { getAll, create, update, remove, reorder };

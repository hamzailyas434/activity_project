const db = require("../config/database");

// GET /api/sticky-notes
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const [notes] = await db.query(
      "SELECT * FROM sticky_notes WHERE user_id = ? ORDER BY display_order ASC, created_at ASC",
      [userId]
    );
    res.json(notes);
  } catch (error) {
    console.error("Error fetching sticky notes:", error);
    res.status(500).json({ error: "Failed to fetch sticky notes" });
  }
};

// POST /api/sticky-notes
exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { text = "", color = "#fef08a", display_order = 0 } = req.body;

    const [result] = await db.query(
      "INSERT INTO sticky_notes (user_id, text, color, display_order) VALUES (?, ?, ?, ?)",
      [userId, text, color, display_order]
    );

    const [rows] = await db.query(
      "SELECT * FROM sticky_notes WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating sticky note:", error);
    res.status(500).json({ error: "Failed to create sticky note" });
  }
};

// PUT /api/sticky-notes/:id
exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { text, color } = req.body;

    const [result] = await db.query(
      "UPDATE sticky_notes SET text = ?, color = ? WHERE id = ? AND user_id = ?",
      [text, color, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Sticky note not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM sticky_notes WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating sticky note:", error);
    res.status(500).json({ error: "Failed to update sticky note" });
  }
};

// DELETE /api/sticky-notes/:id
exports.remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM sticky_notes WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Sticky note not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting sticky note:", error);
    res.status(500).json({ error: "Failed to delete sticky note" });
  }
};

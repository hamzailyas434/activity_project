const db = require("../config/database");

// ── Profiles ─────────────────────────────────────────────────────────────────

exports.getProfiles = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT fp.*,
        (SELECT COUNT(*) FROM favourite_profile_categories fpc WHERE fpc.profile_id = fp.id) AS prefs_count,
        (SELECT COUNT(*) FROM favourite_profile_records fpr WHERE fpr.profile_id = fp.id) AS gifts_count
       FROM favourite_profiles fp
       WHERE fp.user_id = ?
       ORDER BY fp.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, relation = "", color = "iris", bday = null, phone = "", notes = "", shoe_number = "", dress_color = "" } = req.body;

    let insertId;
    try {
      // New schema (post-migration)
      const [result] = await db.query(
        `INSERT INTO favourite_profiles (user_id, name, relation, color, bday, phone, notes, category, shoe_number, dress_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, relation, color, bday || null, phone, notes, relation, shoe_number, dress_color]
      );
      insertId = result.insertId;
    } catch {
      // Old schema fallback (pre-migration)
      const [result] = await db.query(
        `INSERT INTO favourite_profiles (user_id, name, category, notes)
         VALUES (?, ?, ?, ?)`,
        [userId, name, relation, notes]
      );
      insertId = result.insertId;
    }

    const [rows] = await db.query(
      "SELECT *, 0 AS prefs_count, 0 AS gifts_count FROM favourite_profiles WHERE id = ?",
      [insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, relation = "", color = "iris", bday = null, phone = "", notes = "", shoe_number, dress_color } = req.body;

    let result;
    try {
      // New schema (post-migration). Shoe size / dress colour are only touched when sent.
      [result] = await db.query(
        `UPDATE favourite_profiles
         SET name = ?, relation = ?, color = ?, bday = ?, phone = ?, notes = ?, category = ?,
             shoe_number = COALESCE(?, shoe_number), dress_color = COALESCE(?, dress_color)
         WHERE id = ? AND user_id = ?`,
        [name, relation, color, bday || null, phone, notes, relation, shoe_number ?? null, dress_color ?? null, id, userId]
      );
    } catch {
      // Old schema fallback (pre-migration)
      [result] = await db.query(
        `UPDATE favourite_profiles SET name = ?, category = ?, notes = ?
         WHERE id = ? AND user_id = ?`,
        [name, relation, notes, id, userId]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const [rows] = await db.query(
      `SELECT fp.*,
        (SELECT COUNT(*) FROM favourite_profile_categories fpc WHERE fpc.profile_id = fp.id) AS prefs_count,
        (SELECT COUNT(*) FROM favourite_profile_records fpr WHERE fpr.profile_id = fp.id) AS gifts_count
       FROM favourite_profiles fp WHERE fp.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM favourite_profiles WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ error: "Failed to delete profile" });
  }
};

// ── Categories (Preferences) ──────────────────────────────────────────────────

// Every category name this user has used on anyone, most used first (custom chips in the UI)
exports.getPrefCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT category, COUNT(*) AS n FROM favourite_profile_categories
       WHERE user_id = ? AND category <> '' GROUP BY category ORDER BY n DESC, category ASC`,
      [req.user.id]
    );
    res.json(rows.map(r => r.category));
  } catch (error) {
    console.error("Error fetching preference categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_categories
       WHERE profile_id = ? AND user_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [id, userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    const { category = "", notes = "", sort_order = 0 } = req.body;

    const [result] = await db.query(
      `INSERT INTO favourite_profile_categories (profile_id, user_id, category, notes, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [profileId, userId, category, notes, sort_order]
    );

    const [rows] = await db.query(
      "SELECT * FROM favourite_profile_categories WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, notes } = req.body;

    const [result] = await db.query(
      `UPDATE favourite_profile_categories SET category = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [category ?? "", notes ?? "", id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    const [rows] = await db.query(
      "SELECT * FROM favourite_profile_categories WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM favourite_profile_categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

// ── Records (Gifts) ───────────────────────────────────────────────────────────

exports.getRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_records
       WHERE profile_id = ? AND user_id = ?
       ORDER BY id DESC`,
      [id, userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
};

exports.upsertRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    const { gift_item = "", gift_date = null, amount = 0, note = "" } = req.body;

    const dateObj = gift_date ? new Date(gift_date) : new Date();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    // ON DUPLICATE KEY UPDATE handles the unique constraint on (profile_id, year, month)
    // Once the user drops that constraint via phpMyAdmin, each gift becomes its own row
    const [result] = await db.query(
      `INSERT INTO favourite_profile_records
         (profile_id, user_id, month, year, gift_item, gift_date, amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         gift_item = VALUES(gift_item),
         gift_date = VALUES(gift_date),
         amount    = VALUES(amount),
         note      = VALUES(note)`,
      [profileId, userId, month, year, gift_item, gift_date || null, Number(amount), note]
    );

    let insertId = result.insertId;
    // ON DUPLICATE KEY returns insertId = 0 when it updates; fetch by month/year instead
    if (!insertId) {
      const [existing] = await db.query(
        `SELECT id FROM favourite_profile_records
         WHERE profile_id = ? AND user_id = ? AND month = ? AND year = ?`,
        [profileId, userId, month, year]
      );
      insertId = existing[0]?.id;
    }

    const [rows] = await db.query(
      "SELECT * FROM favourite_profile_records WHERE id = ?",
      [insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating record:", error);
    res.status(500).json({ error: "Failed to save record" });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM favourite_profile_records WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting record:", error);
    res.status(500).json({ error: "Failed to delete record" });
  }
};

// ── Notes (long markdown text per person) ────────────────────────────────────

exports.getNotes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_notes WHERE profile_id = ? AND user_id = ? ORDER BY updated_at DESC, id DESC`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return res.json([]);
    console.error("Error fetching person notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

exports.createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const [own] = await db.query("SELECT id FROM favourite_profiles WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    if (!own.length) return res.status(404).json({ error: "Profile not found" });
    const { title = "", body = "" } = req.body;
    const [result] = await db.query(
      "INSERT INTO favourite_profile_notes (profile_id, user_id, title, body) VALUES (?, ?, ?, ?)",
      [req.params.id, userId, title.trim(), body]
    );
    const [rows] = await db.query("SELECT * FROM favourite_profile_notes WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating person note:", error);
    res.status(500).json({ error: "Failed to save note" });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { title = "", body = "" } = req.body;
    const [result] = await db.query(
      "UPDATE favourite_profile_notes SET title = ?, body = ? WHERE id = ? AND user_id = ?",
      [title.trim(), body, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Note not found" });
    const [rows] = await db.query("SELECT * FROM favourite_profile_notes WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating person note:", error);
    res.status(500).json({ error: "Failed to save note" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM favourite_profile_notes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Note not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting person note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

const db = require("../config/database");

// ── Profiles ────────────────────────────────────────────────────────────────

// GET /api/favourite-profiles
exports.getProfiles = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE user_id = ? ORDER BY created_at ASC",
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

// POST /api/favourite-profiles
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, category = "", notes = "" } = req.body;

    const [result] = await db.query(
      `INSERT INTO favourite_profiles (user_id, name, category, notes)
       VALUES (?, ?, ?, ?)`,
      [userId, name, category, notes]
    );

    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};

// PUT /api/favourite-profiles/:id
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, category, notes } = req.body;

    const [result] = await db.query(
      `UPDATE favourite_profiles
       SET name = ?, category = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [name, category ?? "", notes ?? "", id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// DELETE /api/favourite-profiles/:id
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

// ── Profile Category Rows ────────────────────────────────────────────────────

// GET /api/favourite-profiles/:id/categories
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

// POST /api/favourite-profiles/:id/categories
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
    console.error("Error creating category row:", error);
    res.status(500).json({ error: "Failed to create category row" });
  }
};

// PUT /api/favourite-profiles/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, notes } = req.body;

    const [result] = await db.query(
      `UPDATE favourite_profile_categories
       SET category = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [category ?? "", notes ?? "", id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category row not found" });
    }
    const [rows] = await db.query(
      "SELECT * FROM favourite_profile_categories WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating category row:", error);
    res.status(500).json({ error: "Failed to update category row" });
  }
};

// DELETE /api/favourite-profiles/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM favourite_profile_categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category row not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting category row:", error);
    res.status(500).json({ error: "Failed to delete category row" });
  }
};

// ── Monthly Records ──────────────────────────────────────────────────────────

// GET /api/favourite-profiles/:id/records
exports.getRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_records
       WHERE profile_id = ? AND user_id = ?
       ORDER BY year DESC, month DESC`,
      [id, userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
};

// POST /api/favourite-profiles/:id/records
exports.upsertRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    const { month, year, gift_item = "", gift_color = "", note = "" } = req.body;

    await db.query(
      `INSERT INTO favourite_profile_records
         (profile_id, user_id, month, year, gift_item, gift_color, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE gift_item = ?, gift_color = ?, note = ?`,
      [profileId, userId, month, year, gift_item, gift_color, note,
       gift_item, gift_color, note]
    );

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_records
       WHERE profile_id = ? AND user_id = ? AND month = ? AND year = ?`,
      [profileId, userId, month, year]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error upserting record:", error);
    res.status(500).json({ error: "Failed to save record" });
  }
};

// DELETE /api/favourite-profiles/records/:id
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


// GET /api/favourite-profiles
exports.getProfiles = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE user_id = ? ORDER BY created_at ASC",
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

// POST /api/favourite-profiles
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, shoe_number = "", dress_color = "", notes = "" } = req.body;

    const [result] = await db.query(
      `INSERT INTO favourite_profiles (user_id, name, shoe_number, dress_color, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, shoe_number, dress_color, notes]
    );

    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};

// PUT /api/favourite-profiles/:id
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, shoe_number, dress_color, notes } = req.body;

    const [result] = await db.query(
      `UPDATE favourite_profiles
       SET name = ?, shoe_number = ?, dress_color = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [name, shoe_number ?? "", dress_color ?? "", notes ?? "", id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const [rows] = await db.query(
      "SELECT * FROM favourite_profiles WHERE id = ?",
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// DELETE /api/favourite-profiles/:id
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

// ── Monthly Records ──────────────────────────────────────────────────────────

// GET /api/favourite-profiles/:id/records
exports.getRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_records
       WHERE profile_id = ? AND user_id = ?
       ORDER BY year DESC, month DESC`,
      [id, userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
};

// POST /api/favourite-profiles/:id/records
exports.upsertRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    const { month, year, gift_item = "", gift_color = "", note = "" } = req.body;

    await db.query(
      `INSERT INTO favourite_profile_records
         (profile_id, user_id, month, year, gift_item, gift_color, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE gift_item = ?, gift_color = ?, note = ?`,
      [profileId, userId, month, year, gift_item, gift_color, note,
       gift_item, gift_color, note]
    );

    const [rows] = await db.query(
      `SELECT * FROM favourite_profile_records
       WHERE profile_id = ? AND user_id = ? AND month = ? AND year = ?`,
      [profileId, userId, month, year]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error upserting record:", error);
    res.status(500).json({ error: "Failed to save record" });
  }
};

// DELETE /api/favourite-profiles/records/:id
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

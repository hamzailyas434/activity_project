const db = require("../config/database");

// Get activities (optionally for a specific month's routine)
exports.getAllActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;

    if (year && month) {
      try {
        const [rows] = await db.query(
          `SELECT a.* FROM activities a
           INNER JOIN month_routines mr ON a.id = mr.activity_id AND mr.user_id = ?
           WHERE mr.user_id = ? AND mr.year = ? AND mr.month = ?
           ORDER BY mr.display_order, a.id`,
          [userId, userId, parseInt(year, 10), parseInt(month, 10)]
        );
        if (rows.length > 0) return res.json(rows);
      } catch (err) {
        if (err.code !== "ER_NO_SUCH_TABLE" || !err.message.includes("month_routines")) throw err;
      }
      const [all] = await db.query(
        "SELECT * FROM activities WHERE user_id = ? ORDER BY display_order, id",
        [userId]
      );
      return res.json(all);
    }

    const [activities] = await db.query(
      "SELECT * FROM activities WHERE user_id = ? ORDER BY display_order, id",
      [userId]
    );
    res.json(activities);
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE" && error.message.includes("month_routines")) {
      const userId = req.user.id;
      const [activities] = await db.query(
        "SELECT * FROM activities WHERE user_id = ? ORDER BY display_order, id",
        [userId]
      );
      return res.json(activities);
    }
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

// Create new activity (and add to current month's routine if year/month provided)
exports.createActivity = async (req, res) => {
  const { name, type = "checkbox", icon = "✓", color = "#6366f1", year, month } = req.body;
  const userId = req.user.id;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Activity name is required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO activities (name, type, icon, color, user_id) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), type, icon, color, userId]
    );

    const [newActivity] = await db.query(
      "SELECT * FROM activities WHERE id = ? AND user_id = ?",
      [result.insertId, userId]
    );

    if (year != null && month != null) {
      try {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const [maxOrder] = await db.query(
          "SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM month_routines WHERE user_id = ? AND year = ? AND month = ?",
          [userId, y, m]
        );
        const order = maxOrder[0]?.next_order ?? 0;
        await db.query(
          "INSERT INTO month_routines (user_id, activity_id, year, month, display_order) VALUES (?, ?, ?, ?, ?)",
          [userId, result.insertId, y, m, order]
        );
      } catch (err) {
        if (err.code !== "ER_NO_SUCH_TABLE") throw err;
      }
    }

    res.status(201).json(newActivity[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Activity name already exists" });
    }
    console.error("Error creating activity:", error);
    res.status(500).json({ error: "Failed to create activity" });
  }
};

// Update activity
exports.updateActivity = async (req, res) => {
  const { id } = req.params;
  const { name, display_order, icon, color } = req.body;
  const userId = req.user.id;

  try {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (display_order !== undefined) {
      updates.push("display_order = ?");
      values.push(display_order);
    }

    if (icon !== undefined) {
      updates.push("icon = ?");
      values.push(icon);
    }

    if (color !== undefined) {
      updates.push("color = ?");
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id, userId);

    await db.query(
      `UPDATE activities SET ${updates.join(
        ", "
      )} WHERE id = ? AND user_id = ?`,
      values
    );

    const [updated] = await db.query(
      "SELECT * FROM activities WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Activity name already exists" });
    }
    console.error("Error updating activity:", error);
    res.status(500).json({ error: "Failed to update activity" });
  }
};

// Delete activity: if year/month provided, remove only from that month's routine; else delete globally
exports.deleteActivity = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { year, month, permanent } = req.query;

  try {
    if (year && month && permanent !== "1") {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const activityIdNum = parseInt(id, 10);

      const connection = await db.getConnection();
      try {
        const [result] = await connection.query(
          "DELETE FROM month_routines WHERE activity_id = ? AND user_id = ? AND year = ? AND month = ?",
          [id, userId, y, m]
        );

        // If nothing was deleted, month either has no rows (fallback "all activities") or this activity wasn't in it.
        // Materialize this month's routine without this activity so the DB reflects "removed from this month".
        if (result.affectedRows === 0) {
          const [existing] = await connection.query(
            "SELECT 1 FROM month_routines WHERE user_id = ? AND year = ? AND month = ? LIMIT 1",
            [userId, y, m]
          );
          if (existing.length === 0) {
            await connection.beginTransaction();
            try {
              const [allActivities] = await connection.query(
                "SELECT id, display_order FROM activities WHERE user_id = ? ORDER BY display_order, id",
                [userId]
              );
              const toInsert = allActivities.filter(a => Number(a.id) !== activityIdNum);
              for (let i = 0; i < toInsert.length; i++) {
                await connection.query(
                  "INSERT INTO month_routines (user_id, activity_id, year, month, display_order) VALUES (?, ?, ?, ?, ?)",
                  [userId, toInsert[i].id, y, m, i]
                );
              }
              await connection.commit();
            } catch (err) {
              await connection.rollback();
              throw err;
            }
          }
        }
      } finally {
        connection.release();
      }
      return res.json({ message: "Activity removed from this month" });
    }

    const [result] = await db.query(
      "DELETE FROM activities WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE" && error.message.includes("month_routines")) {
      const [result] = await db.query(
        "DELETE FROM activities WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: "Activity not found" });
      return res.json({ message: "Activity deleted successfully" });
    }
    console.error("Error deleting activity:", error);
    res.status(500).json({ error: "Failed to delete activity" });
  }
};

// Reorder activities (for a month's routine if year/month provided)
exports.reorderActivities = async (req, res) => {
  const { orderedIds, year, month } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds must be an array" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    if (year != null && month != null) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      for (let i = 0; i < orderedIds.length; i++) {
        await connection.query(
          "UPDATE month_routines SET display_order = ? WHERE activity_id = ? AND user_id = ? AND year = ? AND month = ?",
          [i, orderedIds[i], userId, y, m]
        );
      }
    } else {
      for (let i = 0; i < orderedIds.length; i++) {
        await connection.query(
          "UPDATE activities SET display_order = ? WHERE id = ? AND user_id = ?",
          [i, orderedIds[i], userId]
        );
      }
    }

    await connection.commit();
    res.json({ message: "Activities reordered successfully" });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_NO_SUCH_TABLE" && error.message.includes("month_routines")) {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.query(
          "UPDATE activities SET display_order = ? WHERE id = ? AND user_id = ?",
          [i, orderedIds[i], userId]
        );
      }
      return res.json({ message: "Activities reordered successfully" });
    }
    console.error("Error reordering activities:", error);
    res.status(500).json({ error: "Failed to reorder activities" });
  } finally {
    connection.release();
  }
};

// Import previous month's routines into current month
exports.importPreviousMonth = async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.body;

  if (year == null || month == null) {
    return res.status(400).json({ error: "Year and month are required" });
  }

  const y = parseInt(year, 10);
  let m = parseInt(month, 10);
  let prevMonth = m - 1;
  let prevYear = y;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = y - 1;
  }

  try {
    const [rows] = await db.query(
      "SELECT activity_id, display_order FROM month_routines WHERE user_id = ? AND year = ? AND month = ? ORDER BY display_order, activity_id",
      [userId, prevYear, prevMonth]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "No routines to import from previous month" });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const row of rows) {
        await connection.query(
          `INSERT IGNORE INTO month_routines (user_id, activity_id, year, month, display_order)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, row.activity_id, y, m, row.display_order]
        );
      }
      await connection.commit();
    } finally {
      connection.release();
    }

    res.json({ message: "Previous month's routines imported", count: rows.length });
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE" && error.message.includes("month_routines")) {
      return res.status(400).json({ error: "Routines feature not available" });
    }
    console.error("Error importing routines:", error);
    res.status(500).json({ error: "Failed to import routines" });
  }
};

// Check if previous month has routines (for showing Import button)
exports.getPreviousMonthHasRoutines = async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: "Year and month are required" });
  }

  let m = parseInt(month, 10);
  let prevMonth = m - 1;
  let prevYear = parseInt(year, 10);
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  try {
    const [rows] = await db.query(
      "SELECT 1 FROM month_routines WHERE user_id = ? AND year = ? AND month = ? LIMIT 1",
      [userId, prevYear, prevMonth]
    );
    res.json({ hasRoutines: rows.length > 0 });
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      return res.json({ hasRoutines: false });
    }
    console.error("Error checking previous month:", error);
    res.status(500).json({ error: "Failed to check" });
  }
};

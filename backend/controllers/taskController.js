const db = require("../config/database");

// Get tasks for a specific date
exports.getTasksByDate = async (req, res) => {
  const { date } = req.query;
  const userId = req.user.id;

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const [tasks] = await db.query(
      "SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ? ORDER BY id",
      [userId, date]
    );
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

// Add a new task
exports.addTask = async (req, res) => {
  const { date, description, type = "checkbox" } = req.body;
  const userId = req.user.id;

  if (!date || !description) {
    return res.status(400).json({ error: "Date and description are required" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO daily_tasks (user_id, task_date, description, type) VALUES (?, ?, ?, ?)",
      [userId, date, description, type]
    );

    const [newTask] = await db.query(
      "SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?",
      [result.insertId, userId]
    );

    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Failed to add task" });
  }
};

// Update task (toggle or value update)
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { is_completed, value } = req.body;
  const userId = req.user.id;

  try {
    if (is_completed !== undefined) {
      await db.query(
        "UPDATE daily_tasks SET is_completed = ? WHERE id = ? AND user_id = ?",
        [is_completed, id, userId]
      );
    }

    if (value !== undefined) {
      await db.query(
        "UPDATE daily_tasks SET value = ? WHERE id = ? AND user_id = ?",
        [value, id, userId]
      );
    }

    const [updated] = await db.query(
      "SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      "DELETE FROM daily_tasks WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

const db = require("../config/database");

// Get completions for a specific month
exports.getMonthlyCompletions = async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.id;

  if (!year || !month) {
    return res.status(400).json({ error: "Year and month are required" });
  }

  try {
    // Get activities for this month's routine (or all if month_routines not used)
    let activities;
    try {
      const [routineActivities] = await db.query(
        `SELECT a.* FROM activities a
         INNER JOIN month_routines mr ON a.id = mr.activity_id AND mr.user_id = ?
         WHERE mr.user_id = ? AND mr.year = ? AND mr.month = ?
         ORDER BY mr.display_order, a.id`,
        [userId, userId, parseInt(year, 10), parseInt(month, 10)]
      );
      activities = routineActivities.length > 0 ? routineActivities : null;
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE") throw err;
      activities = null;
    }
    if (!activities) {
      const [all] = await db.query(
        "SELECT * FROM activities WHERE user_id = ? ORDER BY display_order, id",
        [userId]
      );
      activities = all;
    }

    // Get completions for the specified month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const [completions] = await db.query(
      `SELECT activity_id, DAY(completion_date) as day, is_completed, note, value, completion_color
       FROM activity_completions 
       WHERE user_id = ? AND completion_date BETWEEN ? AND ?`,
      [userId, startDate, endDate]
    );

    // Organize data by date and activity
    const result = {
      activities,
      completions: {},
    };

    completions.forEach(comp => {
      // Normalize so frontend key lookup always matches (day and activity_id can be number or string from DB)
      const key = `${Number(comp.day)}-${Number(comp.activity_id)}`;
      result.completions[key] = {
        isCompleted: comp.is_completed === 1,
        note: comp.note || "",
        value: comp.value || "",
        completionColor: comp.completion_color || "",
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching monthly completions:", error);
    res.status(500).json({ error: "Failed to fetch completions" });
  }
};

// Update completion status and/or note and/or value and/or completionColor
exports.updateCompletion = async (req, res) => {
  const { activityId, date, isCompleted, note, value, completionColor } = req.body;
  const userId = req.user.id;

  if (!activityId || !date) {
    return res.status(400).json({ error: "Activity ID and date are required" });
  }

  // Verify activity belongs to user
  const [activityCheck] = await db.query(
    "SELECT id FROM activities WHERE id = ? AND user_id = ?",
    [activityId, userId]
  );

  if (activityCheck.length === 0) {
    return res.status(404).json({ error: "Activity not found" });
  }

  try {
    // Check if record exists
    const [existing] = await db.query(
      "SELECT * FROM activity_completions WHERE user_id = ? AND activity_id = ? AND completion_date = ?",
      [userId, activityId, date]
    );

    let newIsCompleted;
    let newNote;
    let newValue;
    let newColor;

    if (existing.length > 0) {
      // Update existing record
      newIsCompleted =
        isCompleted !== undefined ? isCompleted : existing[0].is_completed;
      newNote = note !== undefined ? note : existing[0].note;
      newValue = value !== undefined ? value : existing[0].value;
      newColor = completionColor !== undefined ? completionColor : existing[0].completion_color;

      await db.query(
        "UPDATE activity_completions SET is_completed = ?, note = ?, value = ?, completion_color = ? WHERE user_id = ? AND activity_id = ? AND completion_date = ?",
        [newIsCompleted, newNote, newValue, newColor, userId, activityId, date]
      );
    } else {
      // Create new record
      newIsCompleted = isCompleted !== undefined ? isCompleted : true; // Default to true if creating via toggle
      newNote = note || "";
      newValue = value || "";
      newColor = completionColor || null;

      await db.query(
        "INSERT INTO activity_completions (user_id, activity_id, completion_date, is_completed, note, value, completion_color) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, activityId, date, newIsCompleted, newNote, newValue, newColor]
      );
    }

    res.json({
      activityId,
      date,
      isCompleted: newIsCompleted,
      note: newNote,
      value: newValue,
      completionColor: newColor || "",
    });
  } catch (error) {
    console.error("Error updating completion:", error);
    res.status(500).json({ error: "Failed to update completion" });
  }
};

// Get statistics for a month
exports.getMonthlyStatistics = async (req, res) => {
  const { year, month } = req.query;
  const userId = req.user.id;

  if (!year || !month) {
    return res.status(400).json({ error: "Year and month are required" });
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const [stats] = await db.query(
      `SELECT 
        a.id,
        a.name,
        COUNT(CASE WHEN ac.is_completed = 1 THEN 1 END) as completed_count,
        COUNT(ac.id) as total_days,
        MAX(ac.completion_date) as last_completed
       FROM activities a
       LEFT JOIN activity_completions ac ON a.id = ac.activity_id 
         AND ac.user_id = ? 
         AND ac.completion_date BETWEEN ? AND ?
       WHERE a.user_id = ?
       GROUP BY a.id, a.name
       ORDER BY a.display_order, a.id`,
      [userId, startDate, endDate, userId]
    );

    res.json(stats);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

// Get streak information
exports.getStreaks = async (req, res) => {
  const { activityId } = req.params;
  const userId = req.user.id;

  // Verify activity belongs to user
  const [activityCheck] = await db.query(
    "SELECT id FROM activities WHERE id = ? AND user_id = ?",
    [activityId, userId]
  );

  if (activityCheck.length === 0) {
    return res.status(404).json({ error: "Activity not found" });
  }

  try {
    const [completions] = await db.query(
      `SELECT completion_date, is_completed 
       FROM activity_completions 
       WHERE user_id = ? AND activity_id = ? AND is_completed = 1
       ORDER BY completion_date DESC`,
      [userId, activityId]
    );

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let lastDate = null;

    completions.forEach((comp, index) => {
      const currentDate = new Date(comp.completion_date);

      if (index === 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
          (today - currentDate) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      }

      if (lastDate) {
        const diff = Math.floor(
          (lastDate - currentDate) / (1000 * 60 * 60 * 24)
        );

        if (diff === 1) {
          tempStreak++;
          if (index === 0 || currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          tempStreak = 1;
        }

        maxStreak = Math.max(maxStreak, tempStreak);
      }

      lastDate = currentDate;
    });

    maxStreak = Math.max(maxStreak, currentStreak);

    res.json({
      activityId: parseInt(activityId),
      currentStreak,
      maxStreak,
      totalCompletions: completions.length,
    });
  } catch (error) {
    console.error("Error fetching streaks:", error);
    res.status(500).json({ error: "Failed to fetch streaks" });
  }
};

// Get dashboard summary (Daily progress & best streaks)
exports.getDashboardSummary = async (req, res) => {
  const { date } = req.query; // Expect client date YYYY-MM-DD
  const userId = req.user.id;

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    // 1. Get Today's Progress
    const [activities] = await db.query(
      "SELECT COUNT(*) as count FROM activities WHERE user_id = ?",
      [userId]
    );
    const totalActivities = activities[0].count;

    const [todayCompleted] = await db.query(
      `SELECT COUNT(*) as count 
       FROM activity_completions 
       WHERE user_id = ? AND completion_date = ? AND is_completed = 1`,
      [userId, date]
    );
    const completedCount = todayCompleted[0].count;

    // 2. Calculate Streaks for ALL activities (simplified loop)
    const [allActivities] = await db.query(
      "SELECT id, name FROM activities WHERE user_id = ?",
      [userId]
    );
    const streaks = [];

    // We'll process each activity to find its current streak
    // Ideally this would be a single complex SQL query, but loop is fine for small N
    for (const activity of allActivities) {
      const [completions] = await db.query(
        `SELECT completion_date 
             FROM activity_completions 
             WHERE user_id = ? AND activity_id = ? AND is_completed = 1 AND completion_date <= ?
             ORDER BY completion_date DESC
             LIMIT 100`, // Limit lookback to optimized check
        [userId, activity.id, date]
      );

      let currentStreak = 0;
      let lastDate = new Date(date);

      // Normalize time to midnight
      lastDate.setHours(0, 0, 0, 0);

      // Check if completed today
      const completedToday = completions.some(c => {
        const d = new Date(c.completion_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === lastDate.getTime();
      });

      // Loop back
      for (let i = 0; i < completions.length; i++) {
        const compDate = new Date(completions[i].completion_date);
        compDate.setHours(0, 0, 0, 0);

        // Expected date for the streak (either today or yesterday or day before...)
        // Actually, simplified logic:
        // streak = consecutive days counting backwards from today (or yesterday if missed today)

        // If we are at index 0
        if (i === 0) {
          const diffTime = Math.abs(lastDate - compDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            currentStreak = 1; // Completed today
          } else if (diffDays === 1) {
            currentStreak = 1; // Completed yesterday, today pending
          } else {
            break; // Streak broken
          }
          lastDate = compDate;
        } else {
          const diffTime = Math.abs(lastDate - compDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
            lastDate = compDate;
          } else {
            break;
          }
        }
      }

      if (currentStreak > 0) {
        streaks.push({
          id: activity.id,
          name: activity.name,
          streak: currentStreak,
          completedToday,
        });
      }
    }

    // Sort streaks highest first
    streaks.sort((a, b) => b.streak - a.streak);

    res.json({
      daily: {
        total: totalActivities,
        completed: completedCount,
        percentage:
          totalActivities > 0
            ? Math.round((completedCount / totalActivities) * 100)
            : 0,
      },
      streaks: streaks.slice(0, 5), // Top 5 streaks
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

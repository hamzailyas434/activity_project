const db = require("../config/database");

/*
  Make sure a month has its own routine list. A month with no month_routines rows
  copies the latest earlier month that has one, so a new month starts with last
  month's routines (and only those) and can then be edited on its own.
  Returns true when the month has rows afterwards; false means there is nothing to
  carry over (or the table is missing) and callers keep their old fallback.
*/
async function ensureMonthRoutine(userId, year, month) {
  const y = parseInt(year, 10), m = parseInt(month, 10);
  try {
    const [has] = await db.query(
      "SELECT 1 FROM month_routines WHERE user_id = ? AND year = ? AND month = ? LIMIT 1",
      [userId, y, m]
    );
    if (has.length) return true;

    const [src] = await db.query(
      `SELECT year, month FROM month_routines
       WHERE user_id = ? AND (year < ? OR (year = ? AND month < ?))
       ORDER BY year DESC, month DESC LIMIT 1`,
      [userId, y, y, m]
    );
    if (!src.length) return false;

    // INSERT IGNORE: two parallel loads of the same new month must not fail on the unique key
    const [res] = await db.query(
      `INSERT IGNORE INTO month_routines (user_id, activity_id, year, month, display_order)
       SELECT mr.user_id, mr.activity_id, ?, ?, mr.display_order
       FROM month_routines mr JOIN activities a ON a.id = mr.activity_id
       WHERE mr.user_id = ? AND mr.year = ? AND mr.month = ?`,
      [y, m, userId, src[0].year, src[0].month]
    );
    return res.affectedRows > 0;
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return false;
    throw err;
  }
}

module.exports = { ensureMonthRoutine };

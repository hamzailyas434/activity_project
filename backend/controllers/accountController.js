// v3 Profile: active sessions (refresh_tokens), reminder settings (user_settings) and CSV export.
const db = require("../config/database");

const missing = e => e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR";

// GET /api/users/sessions — active refresh tokens. "current" = newest one from this IP + browser.
exports.listSessions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, ip_address, user_agent, created_at, expires_at FROM refresh_tokens
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const ua = String(req.headers["user-agent"] || "").substring(0, 512);
    const cur = rows.find(r => r.user_agent === ua && r.ip_address === req.ip) || rows.find(r => r.user_agent === ua);
    res.json(rows.map(r => ({ ...r, current: !!cur && r.id === cur.id })));
  } catch (err) {
    if (missing(err)) return res.json([]);
    console.error("listSessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// POST /api/users/sessions/:id/revoke
exports.revokeSession = async (req, res) => {
  try {
    const [r] = await db.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
      [req.params.id, req.user.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: "Session not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("revokeSession error:", err);
    res.status(500).json({ error: "Failed to sign out session" });
  }
};

// GET /api/users/settings → { notifications_enabled, notification_time: "HH:MM" }
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT notifications_enabled, notification_time FROM user_settings WHERE user_id = ?", [req.user.id]);
    const r = rows[0];
    res.json({ notifications_enabled: !!r?.notifications_enabled, notification_time: String(r?.notification_time || "21:30").slice(0, 5) });
  } catch (err) {
    if (missing(err)) return res.json({ notifications_enabled: false, notification_time: "21:30" });
    console.error("getSettings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// PUT /api/users/settings { notifications_enabled?, notification_time? }
exports.updateSettings = async (req, res) => {
  try {
    const on = req.body.notifications_enabled;
    const time = req.body.notification_time;
    if (time !== undefined && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(time))) return res.status(400).json({ error: "Invalid time" });
    await db.query(
      `INSERT INTO user_settings (user_id, notifications_enabled, notification_time) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE notifications_enabled = COALESCE(?, notifications_enabled), notification_time = COALESCE(?, notification_time)`,
      [req.user.id, on ? 1 : 0, time || "21:30", on === undefined ? null : on ? 1 : 0, time ?? null]
    );
    return exports.getSettings(req, res);
  } catch (err) {
    if (missing(err)) return res.status(503).json({ error: "Settings not set up — run scripts/add_engagement_features.js" });
    console.error("updateSettings error:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
};

const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// GET /api/users/export.csv — every completion row for the user
exports.exportCsv = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(ac.completion_date, '%Y-%m-%d') AS date, a.name AS routine, a.type,
              ac.is_completed AS done, ac.value, ac.note
       FROM activity_completions ac JOIN activities a ON a.id = ac.activity_id
       WHERE ac.user_id = ? ORDER BY ac.completion_date ASC, a.display_order ASC, a.id ASC`,
      [req.user.id]
    );
    const lines = [["date", "routine", "type", "done", "value", "note"].join(",")]
      .concat(rows.map(r => [r.date, r.routine, r.type, r.done ? 1 : 0, r.value, r.note].map(csvCell).join(",")));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rhythm-activity.csv"`);
    res.send("﻿" + lines.join("\n"));
  } catch (err) {
    console.error("exportCsv error:", err);
    res.status(500).json({ error: "Failed to export" });
  }
};

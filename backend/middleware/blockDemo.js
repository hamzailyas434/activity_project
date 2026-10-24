const db = require("../config/database");

/* Demo accounts are shared: keep visitors from changing the login, 2FA or profile identity. */
module.exports = async function blockDemo(req, res, next) {
  try {
    const [[u]] = await db.query("SELECT is_demo FROM users WHERE id = ?", [req.user.id]);
    if (u?.is_demo) return res.status(403).json({ error: "This is a demo account — sign up to change account settings" });
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") return next(err); // before the demo migration nobody is a demo user
  }
  next();
};

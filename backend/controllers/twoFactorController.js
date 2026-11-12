const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const { auditLog } = require("../utils/logger");
const { revokeAll } = require("./tokenController");

// Step 1: Generate TOTP secret and return QR code (does not enable 2FA yet)
exports.setup = async (req, res) => {
  try {
    const [[u]] = await db.query("SELECT totp_secret, totp_enabled FROM users WHERE id = ?", [req.user.id]);
    if (u?.totp_enabled) return res.status(400).json({ error: "2FA is already on" });

    // Reuse a pending (not yet enabled) secret, so a repeated setup call — React StrictMode, reopening
    // the dialog — doesn't silently invalidate the code already scanned into the authenticator app.
    // Only fill an empty slot and then read back what's stored: two setup calls arriving together
    // (StrictMode fires both at once) must both answer with the one secret that won.
    if (!u?.totp_secret) {
      await db.query("UPDATE users SET totp_secret = ? WHERE id = ? AND totp_secret IS NULL AND totp_enabled = 0",
        [speakeasy.generateSecret({ length: 20 }).base32, req.user.id]);
    }
    const [[{ totp_secret: base32 }]] = await db.query("SELECT totp_secret FROM users WHERE id = ?", [req.user.id]);
    const url = speakeasy.otpauthURL({ secret: base32, encoding: "base32", label: `ActivityTracker (${req.user.username})` });

    const qrDataUrl = await qrcode.toDataURL(url);

    res.json({ qr_code_data_url: qrDataUrl, secret: base32 });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "Failed to set up 2FA" });
  }
};

// Step 2: Verify first TOTP code to activate 2FA
exports.enable = async (req, res) => {
  const { token } = req.body;
  try {
    const [users] = await db.query(
      "SELECT totp_secret FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!users.length || !users[0].totp_secret) {
      return res.status(400).json({ error: "Run 2FA setup first" });
    }

    const valid = speakeasy.totp.verify({
      secret: users[0].totp_secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!valid) return res.status(400).json({ error: "Invalid 2FA code" });

    await db.query("UPDATE users SET totp_enabled = 1 WHERE id = ?", [req.user.id]);

    await auditLog({
      userId: req.user.id,
      action: "2FA_ENABLED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      statusCode: 200,
    });

    res.json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
};

// Disable 2FA — requires current password confirmation
exports.disable = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Current password is required" });

  try {
    const [users] = await db.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    await db.query(
      "UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?",
      [req.user.id]
    );
    await revokeAll(req.user.id);

    await auditLog({
      userId: req.user.id,
      action: "2FA_DISABLED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      statusCode: 200,
    });

    res.json({ success: true, message: "2FA disabled. All sessions revoked." });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
};

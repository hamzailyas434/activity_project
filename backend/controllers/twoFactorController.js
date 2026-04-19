const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const { auditLog } = require("../utils/logger");
const { revokeAll } = require("./tokenController");

// Step 1: Generate TOTP secret and return QR code (does not enable 2FA yet)
exports.setup = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `ActivityTracker (${req.user.username})`,
      length: 20,
    });

    await db.query(
      "UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?",
      [secret.base32, req.user.id]
    );

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ qr_code_data_url: qrDataUrl, secret: secret.base32 });
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

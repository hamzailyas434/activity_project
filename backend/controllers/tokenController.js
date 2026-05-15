const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { JWT_SECRET } = require("../middleware/auth");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Issues access JWT + refresh token, sets both httpOnly cookies, returns body
async function issueTokens(user, res, ip, userAgent) {
  // Access token — short-lived
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  // Refresh token — long-lived, stored as hash in DB
  const rawRefresh = crypto.randomBytes(40).toString("hex");
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, tokenHash, expiresAt, ip || null, userAgent ? userAgent.substring(0, 512) : null]
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("authToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", rawRefresh, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: "/api/users/refresh",
  });

  res.json({
    message: "Login successful",
    token: accessToken,
    user: { id: user.id, username: user.username, email: user.email, role: user.role || 'user', hidden_tabs: user.hidden_tabs || [] },
  });
}

// Refresh endpoint — rotate refresh token (atomic to prevent race conditions)
exports.refresh = async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) return res.status(401).json({ error: "No refresh token" });

  const tokenHash = hashToken(rawToken);
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // SELECT … FOR UPDATE locks the row so concurrent requests can't both pass this check
    const [rows] = await conn.query(
      `SELECT rt.*, u.id as userId, u.username, u.email, u.role, u.hidden_tabs
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      conn = null;
      res.clearCookie("refreshToken", { path: "/api/users/refresh" });
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const row = rows[0];

    // Revoke old token (rotation) — inside the same transaction
    await conn.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?",
      [tokenHash]
    );

    await conn.commit();
    conn.release();
    conn = null;

    // Parse hidden_tabs from the DB row (may be Buffer, string, or array)
    let ht = row.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    ht = Array.isArray(ht) ? ht : [];

    // Issue new tokens (separate connection — doesn't need to be in the transaction)
    await issueTokens(
      { id: row.userId, username: row.username, email: row.email, role: row.role, hidden_tabs: ht },
      res,
      req.ip,
      req.headers["user-agent"]
    );
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
    }
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Failed to refresh session" });
  }
};

// Revoke all refresh tokens for a user (called on password change, 2FA disable)
exports.revokeAll = async (userId) => {
  await db.query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL",
    [userId]
  );
};

exports.issueTokens = issueTokens;

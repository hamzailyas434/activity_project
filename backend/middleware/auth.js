const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}

// Middleware to verify JWT token (accepts httpOnly cookie or Bearer token)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token =
      req.cookies?.authToken ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists
    const [users] = await db.query(
      "SELECT id, username, email, role, hidden_tabs, last_active FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = users[0];

    // Parse hidden_tabs (may come from MySQL as Buffer, string, or already-parsed array)
    let ht = req.user.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    req.user.hidden_tabs = Array.isArray(ht) ? ht : [];

    // Fire-and-forget last_active update
    db.query("UPDATE users SET last_active = NOW() WHERE id = ?", [users[0].id]).catch(() => {});

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = { authenticateToken, JWT_SECRET };

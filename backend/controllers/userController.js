const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const db = require("../config/database");
const { JWT_SECRET } = require("../middleware/auth");
const { issueTokens } = require("./tokenController");
const { isStrongPassword, msg: pwMsg } = require("../utils/passwordPolicy");

// Register new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  if (username.length < 3) {
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: pwMsg });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username.trim(), email.trim().toLowerCase(), passwordHash]
    );

    // Check if this is the first user ever → owner, else → user with books hidden
    const [countRows] = await db.query("SELECT COUNT(*) as cnt FROM users");
    const isFirst = countRows[0].cnt === 1;
    const role = isFirst ? 'owner' : 'user';
    const hidden_tabs = isFirst ? JSON.stringify([]) : JSON.stringify(['books']);
    await db.query("UPDATE users SET role=?, hidden_tabs=? WHERE id=?", [role, hidden_tabs, result.insertId]);

    // Generate JWT token
    const token = jwt.sign({ userId: result.insertId, username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return user info (without password)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: result.insertId,
        username,
        email: email.trim().toLowerCase(),
        role,
        hidden_tabs: JSON.parse(hidden_tabs),
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: "Failed to register user. Please try again." });
  }
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;

  try {
    // Find user by username or email (include lockout fields)
    const [users] = await db.query(
      `SELECT id, username, email, password_hash,
              failed_login_attempts, lockout_until, totp_enabled, totp_secret, role, hidden_tabs
       FROM users WHERE username = ? OR email = ?`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Check account lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remainingMin = Math.ceil((new Date(user.lockout_until) - Date.now()) / 60000);
      return res.status(429).json({
        error: `Account locked. Try again in ${remainingMin} minute(s).`,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MS);
        await db.query(
          "UPDATE users SET failed_login_attempts = ?, lockout_until = ?, last_failed_login = NOW() WHERE id = ?",
          [attempts, lockUntil, user.id]
        );
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for 15 minutes.`,
        });
      }
      await db.query(
        "UPDATE users SET failed_login_attempts = ?, last_failed_login = NOW() WHERE id = ?",
        [attempts, user.id]
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset lockout on successful login
    await db.query(
      "UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, last_failed_login = NULL WHERE id = ?",
      [user.id]
    );

    // Check 2FA
    if (user.totp_enabled) {
      const tempToken = jwt.sign(
        { userId: user.id, scope: "2fa_pending" },
        JWT_SECRET,
        { expiresIn: "5m" }
      );
      return res.json({ requires2FA: true, tempToken });
    }

    // Parse hidden_tabs (may be Buffer, string, or already-parsed array)
    let ht = user.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    user.hidden_tabs = Array.isArray(ht) ? ht : [];

    // Issue tokens via shared helper
    const { issueTokens } = require("./tokenController");
    await issueTokens(user, res, req.ip, req.headers["user-agent"]);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

// Verify 2FA token and complete login
exports.loginVerify2FA = async (req, res) => {
  const { tempToken, totpToken } = req.body;
  if (!tempToken || !totpToken) {
    return res.status(400).json({ error: "Temp token and 2FA code required" });
  }
  try {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired 2FA session" });
    }
    if (decoded.scope !== "2fa_pending") {
      return res.status(401).json({ error: "Invalid token scope" });
    }

    const [users] = await db.query(
      "SELECT id, username, email, totp_secret, totp_enabled, role, hidden_tabs FROM users WHERE id = ?",
      [decoded.userId]
    );
    if (users.length === 0) return res.status(401).json({ error: "User not found" });
    const user = users[0];

    if (!user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ error: "2FA is not configured for this account" });
    }

    const speakeasy = require("speakeasy");
    const valid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: "base32",
      token: totpToken,
      window: 1,
    });
    if (!valid) return res.status(401).json({ error: "Invalid 2FA code" });

    // Parse hidden_tabs (may be Buffer, string, or already-parsed array)
    let ht = user.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    ht = Array.isArray(ht) ? ht : [];

    // Use safe projection — never pass the full DB row
    const safeUser = { id: user.id, username: user.username, email: user.email, role: user.role, hidden_tabs: ht };
    await issueTokens(safeUser, res, req.ip, req.headers["user-agent"]);
  } catch (error) {
    console.error("2FA verify error:", error);
    res.status(500).json({ error: "2FA verification failed" });
  }
};

// Logout — revokes refresh token and clears cookies
exports.logout = async (req, res) => {
  const rawRefresh = req.cookies?.refreshToken;
  if (rawRefresh) {
    const hash = require("crypto").createHash("sha256").update(rawRefresh).digest("hex");
    try {
      await db.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL",
        [hash]
      );
    } catch (err) {
      console.error("Failed to revoke refresh token on logout:", err.message);
    }
  }
  res.clearCookie("authToken",     { httpOnly: true, sameSite: "strict" });
  res.clearCookie("refreshToken",  { httpOnly: true, sameSite: "strict", path: "/api/users/refresh" });
  res.json({ message: "Logged out successfully" });
};

// Get current user (requires authentication)
exports.getCurrentUser = async (req, res) => {
  try {
    // Fetch full user data from database
    const [users] = await db.query(
      "SELECT id, username, first_name, last_name, email, profile_picture, created_at, role, hidden_tabs FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = users[0];

    // Parse hidden_tabs (may be Buffer, string, or already-parsed array)
    let ht = currentUser.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    currentUser.hidden_tabs = Array.isArray(ht) ? ht : [];

    res.json(currentUser);
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { username, first_name, last_name, email, profile_picture } = req.body;

  console.log("Update profile request:", { userId, username, first_name, last_name, email, hasPicture: !!profile_picture });
  console.log("Request body:", req.body);
  console.log("first_name type:", typeof first_name, "value:", first_name, "undefined?:", first_name === undefined);

  try {
    const updates = [];
    const values = [];

    if (username !== undefined) {
      if (username.length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be at least 3 characters" });
      }
      // Check if username is already taken by another user
      const [existingUsername] = await db.query(
        "SELECT id, username FROM users WHERE username = ? AND id != ?",
        [username.trim(), userId]
      );
      if (existingUsername.length > 0) {
        return res.status(400).json({ 
          error: "Username already in use",
          details: `The username '${username.trim()}' is already taken by another user`
        });
      }
      updates.push("username = ?");
      values.push(username.trim());
    }

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      values.push(first_name && typeof first_name === 'string' ? first_name.trim() || null : null);
    }

    if (last_name !== undefined) {
      updates.push("last_name = ?");
      values.push(last_name && typeof last_name === 'string' ? last_name.trim() || null : null);
    }

    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      // Check if email is already taken by another user
      const [existing] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email.trim().toLowerCase(), userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
      updates.push("email = ?");
      values.push(email.trim().toLowerCase());
    }

    if (profile_picture !== undefined && profile_picture !== null && profile_picture !== "") {
      // Limit base64 image size (max 2MB = ~2.6MB base64)
      if (profile_picture.length > 2800000) {
        return res.status(400).json({ error: "Profile picture is too large (max 2MB)" });
      }
      updates.push("profile_picture = ?");
      values.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(userId);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    console.log("Executing query:", query);
    console.log("With values:", values);

    const [result] = await db.query(query, values);
    console.log("Update result:", result);
    console.log("Rows affected:", result.affectedRows);

    // Fetch updated user
    const [updated] = await db.query(
      "SELECT id, username, first_name, last_name, email, profile_picture, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating profile:", error);
    console.error("Error code:", error.code);
    console.error("Error errno:", error.errno);
    console.error("Error message:", error.message);
    console.error("Error SQL state:", error.sqlState);
    
    // Handle specific database errors
    if (error.code === "ER_BAD_FIELD_ERROR" || error.code === "42S22") {
      if (error.message && (error.message.includes("first_name") || error.message.includes("last_name"))) {
        return res.status(400).json({ 
          error: "Database columns not found",
          details: "Please run the migration script: node scripts/add_user_name_fields.js"
        });
      }
    }
    
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      if (error.message && (error.message.includes("username") || error.message.includes("'username'"))) {
        return res.status(400).json({ error: "Username already in use" });
      }
      if (error.message && (error.message.includes("email") || error.message.includes("'email'"))) {
        return res.status(400).json({ error: "Email already in use" });
      }
      return res.status(400).json({ error: "This value is already taken by another user" });
    }
    
    res.status(500).json({ error: "Failed to update profile. Please try again." });
  }
};

// Activity log — recent completions + security events
exports.getActivityLog = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  try {
    // Recent completed activities (last 60 days)
    const [completions] = await db.query(
      `SELECT ac.completion_date, ac.created_at, a.name AS activity_name, a.type,
              ac.value, ac.note, ac.is_completed
       FROM activity_completions ac
       JOIN activities a ON ac.activity_id = a.id
       WHERE ac.user_id = ? AND ac.is_completed = 1
         AND ac.completion_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
       ORDER BY ac.completion_date DESC, ac.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    // Recent security events from audit_log
    const [securityEvents] = await db.query(
      `SELECT action, resource, status_code, created_at, ip_address
       FROM audit_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    ).catch(() => [[]]);  // graceful if audit_log doesn't exist yet

    res.json({ completions, securityEvents });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current password and new password are required" });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: pwMsg });
  }

  try {
    // Get current password hash
    const [users] = await db.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      newPasswordHash,
      userId,
    ]);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

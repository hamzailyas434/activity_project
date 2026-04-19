const rateLimit = require("express-rate-limit");

exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.path === "/api/health",
});

// Per-IP limit for login/register — intentionally lenient since per-user
// account lockout (5 attempts) already protects individual accounts.
// This only blocks IPs doing mass credential stuffing across many users.
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts from this IP. Please try again in 15 minutes." },
});

exports.uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many file uploads. Please wait." },
});

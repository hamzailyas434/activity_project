const { auditLog } = require("../utils/logger");

const SENSITIVE_PATHS = ["/login", "/register", "/password", "/2fa", "/logout", "/refresh"];

/**
 * Audit middleware that logs sensitive operations (login, register, password change, etc.).
 * Uses `res.on("finish")` instead of monkey-patching res.json, so it works reliably
 * regardless of the response format (JSON, redirect, streaming, etc.).
 */
module.exports = function auditMiddleware(req, res, next) {
  const isSensitive = SENSITIVE_PATHS.some((p) => req.path.includes(p));
  if (!isSensitive) return next();

  res.on("finish", () => {
    auditLog({
      userId: req.user?.id || null,
      action: `${req.method}:${req.path}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      statusCode: res.statusCode,
    }).catch((err) => {
      console.error("Audit log error:", err.message);
    });
  });

  next();
};

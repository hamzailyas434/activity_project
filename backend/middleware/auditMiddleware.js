const { auditLog } = require("../utils/logger");

const SENSITIVE_PATHS = ["/login", "/register", "/password", "/2fa", "/logout", "/refresh"];

module.exports = function auditMiddleware(req, res, next) {
  const isSensitive = SENSITIVE_PATHS.some((p) => req.path.includes(p));
  if (!isSensitive) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    auditLog({
      userId: req.user?.id || null,
      action: `${req.method}:${req.path}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      statusCode: res.statusCode,
    });
    return originalJson(body);
  };

  next();
};

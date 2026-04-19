const winston = require("winston");
const path = require("path");
const db = require("../config/database");

const logDir = path.join(__dirname, "../logs");

const appLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    ...(process.env.NODE_ENV !== "production"
      ? [new winston.transports.Console({ format: winston.format.simple() })]
      : []),
  ],
});

// Fire-and-forget DB audit write — never throws, always logs errors to file
async function auditLog({ userId, action, resource, resourceId, ip, userAgent, statusCode, metadata }) {
  try {
    await db.query(
      `INSERT INTO audit_log
         (user_id, action, resource, resource_id, ip_address, user_agent, status_code, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        resource || null,
        resourceId != null ? String(resourceId) : null,
        ip || null,
        userAgent ? userAgent.substring(0, 512) : null,
        statusCode || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    appLogger.error("Failed to write audit log entry", { message: err.message });
  }
}

module.exports = { appLogger, auditLog };

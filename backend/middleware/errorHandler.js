module.exports = function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: "An unexpected error occurred." });
};

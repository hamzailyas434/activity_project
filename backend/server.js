const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();
const {
  globalLimiter,
  authLimiter,
  uploadLimiter,
} = require("./middleware/rateLimiters");
const errorHandler = require("./middleware/errorHandler");

const activityRoutes = require("./routes/activities");
const completionRoutes = require("./routes/completions");
const userRoutes = require("./routes/users");
const { authenticateToken } = require("./middleware/auth");
const { requireOwner } = require("./middleware/admin");

const app = express();
const PORT = process.env.PORT || 5001;

// HTTPS redirect in production (relies on X-Forwarded-Proto from load balancer)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Helmet — sets secure HTTP response headers incl. HSTS
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
      },
    },
  })
);

// CORS — locked to specific origins; set CORS_ORIGIN in .env for production.
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(require("./middleware/auditMiddleware"));

// Global rate limiter (300 req / 15 min per IP, all routes)
app.use(globalLimiter);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Auth routes — tighter rate limit on login/register
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/users", userRoutes);

// File upload — tightest rate limit
app.use("/api/notes/upload", uploadLimiter);

// Protected routes (authentication required)
app.use("/api/activities", authenticateToken, activityRoutes);
app.use("/api/completions", authenticateToken, completionRoutes);
app.use("/api/tasks", authenticateToken, require("./routes/tasks"));
app.use("/api/qaza-namaz", authenticateToken, require("./routes/qazaNamaz"));
app.use("/api/notes", authenticateToken, require("./routes/notes"));
app.use(
  "/api/sticky-notes",
  authenticateToken,
  require("./routes/stickyNotes")
);
app.use("/api/expenses", authenticateToken, require("./routes/expenses"));
app.use(
  "/api/favourite-profiles",
  authenticateToken,
  require("./routes/favouriteProfiles")
);
app.use(
  "/api/monthly-todos",
  authenticateToken,
  require("./routes/monthlyTodos")
);
app.use("/api/books", authenticateToken, require("./routes/books"));
app.use(
  "/api/admin",
  authenticateToken,
  requireOwner,
  require("./routes/admin")
);
app.use("/api/2fa", require("./routes/twoFactor"));

// Serve uploaded files (PDFs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Activity Tracker API is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Centralized error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;

const { body, param, query, validationResult } = require("express-validator");

const PW_RULES = [
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/)
    .withMessage("Password must contain at least one special character"),
];

// Returns first validation error as 400, or calls next()
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
exports.registerRules = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters")
    .matches(/^[a-zA-Z0-9_.\-]+$/).withMessage("Username may only contain letters, digits, underscores, dots, hyphens"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
  ...PW_RULES,
];

exports.loginRules = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/)
    .withMessage("Password must contain at least one special character"),
];

exports.updateProfileRules = [
  body("username").optional().trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters")
    .matches(/^[a-zA-Z0-9_.\-]+$/).withMessage("Invalid username characters"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Invalid email address"),
  body("first_name").optional().trim().isLength({ max: 50 }).withMessage("First name too long"),
  body("last_name").optional().trim().isLength({ max: 50 }).withMessage("Last name too long"),
];

// ── Activities ────────────────────────────────────────────────────────────────
exports.createActivityRules = [
  body("name").trim().notEmpty().withMessage("Activity name is required")
    .isLength({ max: 100 }).withMessage("Activity name must be under 100 characters"),
  body("type").optional().isIn(["checkbox", "number", "text"]).withMessage("Invalid activity type"),
  body("icon").optional().isLength({ max: 10 }).withMessage("Icon too long"),
  body("color").optional().matches(/^#[0-9a-fA-F]{3,6}$/).withMessage("Invalid color hex code"),
];

exports.activityIdRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid activity ID"),
];

exports.monthQueryRules = [
  query("year").isInt({ min: 2000, max: 2100 }).withMessage("Invalid year"),
  query("month").isInt({ min: 1, max: 12 }).withMessage("Invalid month"),
];

// ── Completions ───────────────────────────────────────────────────────────────
exports.updateCompletionRules = [
  body("activityId").isInt({ min: 1 }).withMessage("Invalid activity ID"),
  body("date").isDate().withMessage("Invalid date format (YYYY-MM-DD required)"),
  body("isCompleted").optional().isBoolean().withMessage("isCompleted must be boolean"),
  body("note").optional().isLength({ max: 2000 }).withMessage("Note too long"),
];

// ── Notes ─────────────────────────────────────────────────────────────────────
exports.createNoteRules = [
  body("question").trim().notEmpty().withMessage("Question is required")
    .isLength({ max: 2000 }).withMessage("Question must be under 2000 characters"),
  body("category").optional().trim().isLength({ max: 100 }).withMessage("Category too long"),
];

exports.noteIdRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid note ID"),
];

// ── Tasks ─────────────────────────────────────────────────────────────────────
exports.createTaskRules = [
  body("description").trim().notEmpty().withMessage("Task description is required")
    .isLength({ max: 255 }).withMessage("Description must be under 255 characters"),
  body("date").optional().isDate().withMessage("Invalid date format"),
  body("type").optional().isIn(["checkbox", "number", "text"]).withMessage("Invalid task type"),
];

exports.taskIdRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid task ID"),
];

// ── Expenses ──────────────────────────────────────────────────────────────────
exports.createExpenseRules = [
  body("name").trim().notEmpty().withMessage("Expense name is required")
    .isLength({ max: 200 }).withMessage("Name must be under 200 characters"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be a non-negative number"),
  body("category").isIn(["home_bills", "home_person", "other"]).withMessage("Invalid category"),
  body("month").isInt({ min: 1, max: 12 }).withMessage("Invalid month"),
  body("year").isInt({ min: 2000, max: 2100 }).withMessage("Invalid year"),
];

exports.expenseIdRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid expense ID"),
];

exports.budgetRules = [
  body("total_income").isFloat({ min: 0 }).withMessage("Income must be a non-negative number"),
  body("month").isInt({ min: 1, max: 12 }).withMessage("Invalid month"),
  body("year").isInt({ min: 2000, max: 2100 }).withMessage("Invalid year"),
];

// ── Qaza Namaz ────────────────────────────────────────────────────────────────
exports.saveQazaRules = [
  body("Fajr").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Fajr value"),
  body("Zuhr").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Zuhr value"),
  body("Asr").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Asr value"),
  body("Maghrib").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Maghrib value"),
  body("Isha").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Isha value"),
  body("Witr").optional().isFloat({ min: 0, max: 9999 }).withMessage("Invalid Witr value"),
];

// ── Sticky Notes ──────────────────────────────────────────────────────────────
exports.stickyNoteRules = [
  body("text").trim().notEmpty().withMessage("Note text is required")
    .isLength({ max: 5000 }).withMessage("Note text too long"),
  body("color").optional().matches(/^#[0-9a-fA-F]{3,6}$/).withMessage("Invalid color"),
];

exports.stickyNoteIdRules = [
  param("id").isInt({ min: 1 }).withMessage("Invalid sticky note ID"),
];

// ── 2FA ───────────────────────────────────────────────────────────────────────
exports.verify2FARules = [
  body("token").notEmpty().isLength({ min: 6, max: 6 }).isNumeric()
    .withMessage("Invalid 2FA token — must be a 6-digit code"),
];

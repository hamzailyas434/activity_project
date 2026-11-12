const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const tokenController = require("../controllers/tokenController");
const account = require("../controllers/accountController");
const blockDemo = require("../middleware/blockDemo");
const { authenticateToken } = require("../middleware/auth");
const v = require("../middleware/validators");

// Public routes
router.post("/register",  v.registerRules, v.validate, userController.register);
router.post("/login",     v.loginRules,    v.validate, userController.login);
router.post("/login/2fa", v.login2FARules, v.validate, userController.loginVerify2FA);
router.post("/logout",    userController.logout);
router.post("/refresh",   tokenController.refresh);
router.post("/demo-login", require("../controllers/demoController").demoLogin);

// Protected routes
router.get("/me",           authenticateToken, userController.getCurrentUser);
router.get("/activity-log", authenticateToken, userController.getActivityLog);
router.put("/profile",  authenticateToken, blockDemo, v.updateProfileRules, v.validate, userController.updateProfile);
router.put("/password", authenticateToken, blockDemo, v.changePasswordRules, v.validate, userController.changePassword);
router.get("/sessions",              authenticateToken, account.listSessions);
router.post("/sessions/:id/revoke",  authenticateToken, account.revokeSession);
router.get("/settings",              authenticateToken, account.getSettings);
router.put("/settings",              authenticateToken, account.updateSettings);
router.get("/export.csv",            authenticateToken, account.exportCsv);

module.exports = router;

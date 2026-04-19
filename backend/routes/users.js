const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const tokenController = require("../controllers/tokenController");
const { authenticateToken } = require("../middleware/auth");
const v = require("../middleware/validators");

// Public routes
router.post("/register",  v.registerRules, v.validate, userController.register);
router.post("/login",     v.loginRules,    v.validate, userController.login);
router.post("/login/2fa", v.verify2FARules, v.validate, userController.loginVerify2FA);
router.post("/logout",    userController.logout);
router.post("/refresh",   tokenController.refresh);

// Protected routes
router.get("/me",           authenticateToken, userController.getCurrentUser);
router.get("/activity-log", authenticateToken, userController.getActivityLog);
router.put("/profile",  authenticateToken, v.updateProfileRules, v.validate, userController.updateProfile);
router.put("/password", authenticateToken, v.changePasswordRules, v.validate, userController.changePassword);

module.exports = router;

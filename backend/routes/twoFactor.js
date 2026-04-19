const express = require("express");
const router = express.Router();
const twoFactorController = require("../controllers/twoFactorController");
const { authenticateToken } = require("../middleware/auth");
const v = require("../middleware/validators");

// All 2FA routes require authentication
router.post("/setup",   authenticateToken, twoFactorController.setup);
router.post("/enable",  authenticateToken, v.verify2FARules, v.validate, twoFactorController.enable);
router.post("/disable", authenticateToken, twoFactorController.disable);

module.exports = router;

const express = require("express");
const blockDemo = require("../middleware/blockDemo");
const router = express.Router();
const twoFactorController = require("../controllers/twoFactorController");
const { authenticateToken } = require("../middleware/auth");
const v = require("../middleware/validators");

// All 2FA routes require authentication
router.post("/setup",   authenticateToken, blockDemo, twoFactorController.setup);
router.post("/enable",  authenticateToken, blockDemo, v.verify2FARules, v.validate, twoFactorController.enable);
router.post("/disable", authenticateToken, blockDemo, twoFactorController.disable);

module.exports = router;

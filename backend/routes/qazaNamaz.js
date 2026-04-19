const express = require("express");
const router = express.Router();
const qazaNamazController = require("../controllers/qazaNamazController");
const v = require("../middleware/validators");

router.get("/",  qazaNamazController.getQazaNamaz);
router.post("/", v.saveQazaRules, v.validate, qazaNamazController.saveQazaNamaz);

module.exports = router;

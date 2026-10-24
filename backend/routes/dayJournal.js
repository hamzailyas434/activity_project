const router = require("express").Router();
const { param, body } = require("express-validator");
const c = require("../controllers/dayJournalController");
const { validate } = require("../middleware/validators");

router.get("/", c.getMonth);
router.put("/:date",
  param("date").isDate().withMessage("Invalid date (YYYY-MM-DD)"),
  body("text").optional().isLength({ max: 20000 }).withMessage("Journal too long"),
  validate, c.save);

module.exports = router;

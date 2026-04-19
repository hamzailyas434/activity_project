const express = require("express");
const router = express.Router();
const stickyNotesController = require("../controllers/stickyNotesController");
const v = require("../middleware/validators");

router.get("/",       stickyNotesController.getAll);
router.post("/",      v.stickyNoteRules, v.validate, stickyNotesController.create);
router.put("/:id",    v.stickyNoteIdRules, v.validate, stickyNotesController.update);
router.delete("/:id", v.stickyNoteIdRules, v.validate, stickyNotesController.remove);

module.exports = router;

const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notesController");
const v = require("../middleware/validators");

// Specific routes before parameterized
router.get("/categories",         notesController.getCategories);
router.get("/attachments/:id",    notesController.getAttachment);
router.post("/upload",            notesController.uploadFile);

// Answer routes
router.post("/:noteId/answers",               v.noteIdParamRules, v.createAnswerRules, v.validate, notesController.createAnswer);
router.put("/answers/:answerId",              v.answerIdRules, v.updateAnswerRules, v.validate, notesController.updateAnswer);
router.delete("/answers/:answerId",           v.answerIdRules, v.validate, notesController.deleteAnswer);
router.patch("/answers/:answerId/toggle-very-good", v.answerIdRules, v.validate, notesController.toggleVeryGood);

// Note CRUD
router.get("/",      notesController.getAllNotes);
router.get("/:id",   v.noteIdRules, v.validate, notesController.getNoteById);
router.post("/",     v.createNoteRules, v.validate, notesController.createNote);
router.put("/:id",   v.noteIdRules, v.validate, notesController.updateNote);
router.delete("/:id", v.noteIdRules, v.validate, notesController.deleteNote);

module.exports = router;

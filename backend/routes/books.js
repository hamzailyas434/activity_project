const express = require("express");
const router = express.Router();
const c = require("../controllers/booksController");
const v = require("../middleware/validators");
const { booksUploadLimiter } = require("../middleware/rateLimiters");

// Fixed routes before parameterized ones
router.get("/reading-goal",                  c.getReadingGoal);
router.put("/reading-goal",       v.readingGoalRules, v.validate, c.setReadingGoal);
router.get("/dashboard-summary",             c.dashboardSummary);
router.get("/random-page-note",              c.randomPageNote);
router.get("/notes-summary",                 c.notesSummary);
router.get("/favourite-notes",               c.getFavouriteNotes);
router.delete("/highlights/:highlightId",    v.highlightIdRules, v.validate, c.deleteHighlight);
router.put("/page-notes/:noteId",            v.updatePageNoteRules, v.validate, c.updatePageNote);
router.delete("/page-notes/:noteId",         v.pageNoteIdRules, v.validate, c.deletePageNote);
router.patch("/page-notes/:noteId/favourite", v.pageNoteIdRules, v.validate, c.toggleFavourite);

// Book CRUD
router.get("/",                              c.listBooks);
router.post("/",       booksUploadLimiter,  v.uploadBookRules, v.validate, c.uploadBook);
router.delete("/:id",  v.bookIdRules, v.validate, c.deleteBook);

// Per-book sub-resources
router.get("/:id/file",                      c.getBookFile);
router.put("/:id/progress",  v.updateProgressRules, v.validate, c.updateProgress);
router.put("/:id/cover",                     c.updateCover);
router.get("/:id/highlights",                c.getHighlights);
router.post("/:id/highlights",  v.addHighlightRules, v.validate, c.addHighlight);
router.get("/:id/favourite-pages",           c.getFavouritePages);
router.post("/:id/favourite-pages", v.toggleFavouritePageRules, v.validate, c.toggleFavouritePage);
router.get("/:id/page-notes/:page",          c.getPageNotes);
router.post("/:id/page-notes",   v.createPageNoteRules, v.validate, c.createPageNote);
router.get("/:id/page-notes-all",            c.getAllPageNotes);

module.exports = router;

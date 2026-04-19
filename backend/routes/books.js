const express = require("express");
const router = express.Router();
const c = require("../controllers/booksController");

// Fixed routes before parameterized ones
router.get("/reading-goal",       c.getReadingGoal);
router.put("/reading-goal",       c.setReadingGoal);
router.get("/dashboard-summary",  c.dashboardSummary);
router.get("/random-page-note",   c.randomPageNote);
router.get("/notes-summary",      c.notesSummary);
router.get("/favourite-notes",    c.getFavouriteNotes);
router.delete("/highlights/:highlightId", c.deleteHighlight);
router.put("/page-notes/:noteId",         c.updatePageNote);
router.delete("/page-notes/:noteId",      c.deletePageNote);
router.patch("/page-notes/:noteId/favourite", c.toggleFavourite);

// Book CRUD
router.get("/",        c.listBooks);
router.post("/",       c.uploadBook);
router.delete("/:id",  c.deleteBook);

// Per-book sub-resources
router.get("/:id/file",             c.getBookFile);
router.put("/:id/progress",         c.updateProgress);
router.put("/:id/cover",            c.updateCover);
router.get("/:id/highlights",       c.getHighlights);
router.post("/:id/highlights",      c.addHighlight);
router.get("/:id/favourite-pages",  c.getFavouritePages);
router.post("/:id/favourite-pages", c.toggleFavouritePage);
router.get("/:id/page-notes/:page", c.getPageNotes);
router.post("/:id/page-notes",      c.createPageNote);
router.get("/:id/page-notes-all",   c.getAllPageNotes);

module.exports = router;

const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const v = require("../middleware/validators");

router.get("/",                           activityController.getAllActivities);
router.get("/previous-month-has-routines", activityController.getPreviousMonthHasRoutines);
router.post("/",                          v.createActivityRules, v.validate, activityController.createActivity);
router.post("/import-previous-month",     activityController.importPreviousMonth);
router.put("/:id",                        v.activityIdRules, v.validate, activityController.updateActivity);
router.delete("/:id",                     v.activityIdRules, v.validate, activityController.deleteActivity);
router.post("/reorder",                   activityController.reorderActivities);

module.exports = router;

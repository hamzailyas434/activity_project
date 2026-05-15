const express = require('express');
const router = express.Router();
const completionController = require('../controllers/completionController');
const v = require('../middleware/validators');

// Completion routes
router.get('/monthly', completionController.getMonthlyCompletions);
router.post('/update', v.updateCompletionRules, v.validate, completionController.updateCompletion);
router.get('/statistics', completionController.getMonthlyStatistics);
router.get('/summary', completionController.getDashboardSummary);
router.get('/streaks/:activityId', completionController.getStreaks);

module.exports = router;

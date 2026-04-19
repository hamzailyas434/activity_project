const express = require('express');
const router = express.Router();
const completionController = require('../controllers/completionController');

// Completion routes
router.get('/monthly', completionController.getMonthlyCompletions);
router.post('/update', completionController.updateCompletion);
router.get('/statistics', completionController.getMonthlyStatistics);
router.get('/summary', completionController.getDashboardSummary);
router.get('/streaks/:activityId', completionController.getStreaks);

module.exports = router;

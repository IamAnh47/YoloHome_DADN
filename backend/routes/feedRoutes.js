const express = require('express');
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get feed data by date range
router.get('/:type/data', feedController.getFeedDataByDate);

// Get latest feed data
router.get('/:type/latest', feedController.getLatestFeedData);

// Get average feed data for last minute
router.get('/:type/average', feedController.getFeedAverageForLastMinute);

module.exports = router; 
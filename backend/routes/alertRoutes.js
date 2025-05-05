const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware
router.use(protect);

// Get all alerts
router.get('/', alertController.getAllAlerts);

// Get recent alerts
router.get('/recent', alertController.getRecentAlerts);

// Get specific alert
router.get('/:id', alertController.getAlertById);

// Create new alert
router.post('/', alertController.createAlert);

// Update alert status
router.put('/:id', alertController.updateAlertStatus);

// Delete alert
router.delete('/:id', alertController.deleteAlert);

module.exports = router;
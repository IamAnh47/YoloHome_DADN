const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware.protect);

// Get latest sensor readings
router.get('/readings', sensorController.getLatestReadings);

// Get sensor history
router.get('/history/:type', sensorController.getSensorHistoryByType);

// Get all sensors
router.get('/', sensorController.getAllSensors);

// Get single sensor
router.get('/:id', sensorController.getSensor);

// Create new sensor data - commented out due to missing controller method
// router.post('/data', sensorController.createSensorData);

module.exports = router; 
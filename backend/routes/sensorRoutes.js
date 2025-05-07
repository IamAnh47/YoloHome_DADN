const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware.protect);

// Get latest sensor readings
router.get('/readings', sensorController.getLatestReadings);

// Get latest reading for a specific sensor type
router.get('/readings/:type', sensorController.getLatestSensorByType);

// Get sensor history
router.get('/history/:type', sensorController.getSensorHistoryByType);

// Get temperature and humidity predictions
router.get('/predictions', sensorController.getPredictions);

// Train the ML prediction models
router.post('/train-models', sensorController.trainModels);

// Create new sensor data
router.post('/data', sensorController.createSensorData);

// Get all sensors
router.get('/', sensorController.getAllSensors);

// Get single sensor
router.get('/:id', sensorController.getSensor);

module.exports = router;
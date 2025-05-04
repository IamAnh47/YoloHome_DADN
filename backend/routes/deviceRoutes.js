const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware.protect);

// Direct device control routes
router.post('/fan/on', deviceController.turnOnFan);
router.post('/fan/off', deviceController.turnOffFan);
router.post('/light/on', deviceController.turnOnLight);
router.post('/light/off', deviceController.turnOffLight);

// Toggle devices by type
router.post('/toggle-by-type', deviceController.toggleDevicesByType);

// Device CRUD routes
router.route('/')
  .get(deviceController.getAllDevices)
  .post(deviceController.createDevice);

router.route('/stats')
  .get(deviceController.getDeviceStats);

router.route('/:id')
  .get(deviceController.getDevice)
  .put(deviceController.updateDevice)
  .delete(deviceController.deleteDevice);

router.route('/:id/control')
  .post(deviceController.controlDevice);

module.exports = router;
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

// AI mode control routes
router.post('/aimode/enable', deviceController.enableAIMode);
router.post('/aimode/disable', deviceController.disableAIMode);
router.get('/aimode/status', deviceController.getAIModeStatus);

// Toggle devices by type
router.post('/toggle-by-type', deviceController.toggleDevicesByType);

// Device CRUD routes
router.route('/')
  .get(deviceController.getAllDevices)
  .post(deviceController.createDevice);

router.route('/stats')
  .get(deviceController.getDeviceStats);

// Device scheduling routes
router.route('/:deviceType/schedules')
  .get(deviceController.getDeviceSchedules);

router.route('/:deviceType/schedule')
  .post(deviceController.scheduleDevice);

router.route('/:deviceType/schedule-range')
  .post(deviceController.scheduleDeviceRange);

router.route('/schedules/:id')
  .delete(deviceController.cancelSchedule);

router.route('/schedules/execute')
  .post(deviceController.executePendingSchedules);

// Device specific routes
router.route('/:id')
  .get(deviceController.getDevice)
  .put(deviceController.updateDevice)
  .delete(deviceController.deleteDevice);

router.route('/:id/control')
  .post(deviceController.controlDevice);

module.exports = router;
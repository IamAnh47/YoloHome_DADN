const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const authMiddleware = require('../middleware/authMiddleware');

// Bảo vệ tất cả các route
router.use(authMiddleware.protect);

// Lấy trạng thái toàn bộ hệ thống
router.get('/', statusController.getSystemStatus);

module.exports = router; 
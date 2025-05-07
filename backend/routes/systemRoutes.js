const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware.protect);

// Get system status
router.get('/status', systemController.getSystemStatus);

// Get AI mode status
router.get('/ai-mode', systemController.getAIMode);

// Update AI mode status
router.put('/ai-mode', systemController.updateAIMode);

// Test AI mode fan activation
router.post('/test-ai-fan', systemController.testAIModeFan);

module.exports = router; 
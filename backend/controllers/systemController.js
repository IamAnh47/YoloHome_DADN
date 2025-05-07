const SystemModel = require('../models/systemModel');
const mlPredictionService = require('../services/mlPredictionService');

// @desc    Get system status
// @route   GET /api/system/status
// @access  Private
exports.getSystemStatus = async (req, res, next) => {
  try {
    // Đơn giản trả về trạng thái AI mode
    const aiModeStatus = await SystemModel.getAIMode();
    
    res.status(200).json({
      success: true,
      data: {
        ai_mode: aiModeStatus,
        version: '1.0.0',
        status: 'online'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI mode status
// @route   GET /api/system/ai-mode
// @access  Private
exports.getAIMode = async (req, res, next) => {
  try {
    const status = await SystemModel.getAIMode();
    
    res.status(200).json({
      success: true,
      data: { enabled: status }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI mode status
// @route   PUT /api/system/ai-mode
// @access  Private
exports.updateAIMode = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    
    // Validate input
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide enabled status'
      });
    }
    
    const success = await SystemModel.updateAIMode(enabled);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update AI mode'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { enabled }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test AI mode fan activation
// @route   POST /api/system/test-ai-fan
// @access  Private
exports.testAIModeFan = async (req, res, next) => {
  try {
    // Kiểm tra xem AI Mode có được bật không
    const aiModeEnabled = await SystemModel.getAIMode();
    
    if (!aiModeEnabled) {
      return res.status(400).json({
        success: false,
        message: 'AI Mode is currently disabled. Please enable it first to test automatic fan control.'
      });
    }
    
    // Giả lập nhiệt độ cao (31°C) để kích hoạt quạt
    const testTemperature = 31.0;
    console.log(`Testing AI Mode fan activation with simulated temperature: ${testTemperature}°C`);
    
    // Gọi hàm kích hoạt quạt từ mlPredictionService
    const activationResult = await mlPredictionService.activateFanIfNeeded(testTemperature);
    
    res.status(200).json({
      success: true,
      message: activationResult 
        ? 'Fan activation test successful! The system has attempted to turn on the fan.' 
        : 'Fan activation test completed, but the fan was not activated. Check the logs for details.',
      data: {
        aiModeStatus: aiModeEnabled,
        testTemperature: testTemperature,
        fanActivated: activationResult
      }
    });
  } catch (error) {
    console.error('Error in AI Mode fan test:', error);
    next(error);
  }
}; 
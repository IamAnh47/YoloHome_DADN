const SystemModel = require('../models/systemModel');

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
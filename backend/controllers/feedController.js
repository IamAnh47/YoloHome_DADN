const adafruitService = require('../services/adafruitService');

// @desc    Get feed data from Adafruit IO by date
// @route   GET /api/feeds/:type/data
// @access  Private
exports.getFeedDataByDate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    // Validate feed type
    if (!type || !['temperature', 'humidity', 'motion', 'fan', 'light'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feed type'
      });
    }
    
    // Get data from Adafruit IO
    const feedData = await adafruitService.getFeedDataByDate(
      type, 
      startDate || null, 
      endDate || null, 
      limit ? parseInt(limit) : 50
    );
    
    // Format the data for charts
    const formattedData = feedData.map(item => {
      let value;
      
      // Convert value based on feed type
      if (type === 'motion' || type === 'fan' || type === 'light') {
        value = parseInt(item.value) > 0;
      } else {
        value = parseFloat(item.value);
      }
      
      return {
        id: item.id,
        value: value,
        timestamp: item.created_at,
        feed: type
      };
    });
    
    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error getting feed data for ${req.params.type}:`, error);
    next(error);
  }
};

// @desc    Get latest feed data from Adafruit IO
// @route   GET /api/feeds/:type/latest
// @access  Private
exports.getLatestFeedData = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    // Validate feed type
    if (!type || !['temperature', 'humidity', 'motion', 'fan', 'light'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feed type'
      });
    }
    
    // Get latest data from Adafruit IO
    const feedData = await adafruitService.getFeedData(type);
    
    if (!feedData) {
      return res.status(404).json({
        success: false,
        message: `No data found for ${type} feed`
      });
    }
    
    // Format the data for response
    let value;
    if (type === 'motion' || type === 'fan' || type === 'light') {
      value = parseInt(feedData.value) > 0;
    } else {
      value = parseFloat(feedData.value);
    }
    
    const formattedData = {
      id: feedData.id,
      value: value,
      timestamp: feedData.created_at,
      feed: type
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error getting latest feed data for ${req.params.type}:`, error);
    next(error);
  }
}; 
const adafruitService = require('../services/adafruitService');

// @desc    Get feed data from Adafruit IO by date
// @route   GET /api/feeds/:type/data
// @access  Private
exports.getFeedDataByDate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, limit, interval } = req.query;
    
    // Validate feed type
    if (!type || !['temperature', 'humidity', 'motion', 'fan', 'light'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feed type'
      });
    }
    
    // Check if interval aggregation is requested
    if (interval && interval === '30min') {
      return this.getFeedDataAggregated(req, res, next);
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

// @desc    Get feed data aggregated by 30-minute intervals
// @route   GET /api/feeds/:type/aggregated
// @access  Private
exports.getFeedDataAggregated = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate feed type
    if (!type || !['temperature', 'humidity', 'motion', 'fan', 'light'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feed type'
      });
    }
    
    // Get a larger dataset from Adafruit IO to aggregate
    // We'll get all data from the last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setHours(now.getHours() - 24);
    
    const start = startDate ? new Date(startDate) : oneDayAgo;
    const end = endDate ? new Date(endDate) : now;
    
    // Get up to 1000 data points for accurate aggregation
    const feedData = await adafruitService.getFeedDataByDate(
      type, 
      start.toISOString(), 
      end.toISOString(), 
      1000
    );
    
    // If no data, return empty array
    if (!feedData || feedData.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Group data by 30-minute intervals
    const intervalGroups = {};
    
    // Process each data point
    feedData.forEach(item => {
      const timestamp = new Date(item.created_at);
      
      // Create a timestamp for the start of the 30-minute interval
      timestamp.setMinutes(Math.floor(timestamp.getMinutes() / 30) * 30);
      timestamp.setSeconds(0);
      timestamp.setMilliseconds(0);
      
      const intervalKey = timestamp.toISOString();
      
      if (!intervalGroups[intervalKey]) {
        intervalGroups[intervalKey] = {
          sum: 0,
          count: 0,
          timestamps: []
        };
      }
      
      // For boolean values, count frequency instead of averaging
      if (type === 'motion' || type === 'fan' || type === 'light') {
        intervalGroups[intervalKey].sum += parseInt(item.value) > 0 ? 1 : 0;
      } else {
        intervalGroups[intervalKey].sum += parseFloat(item.value);
      }
      
      intervalGroups[intervalKey].count++;
      intervalGroups[intervalKey].timestamps.push(item.created_at);
    });
    
    // Convert the grouped data to array format
    const aggregatedData = Object.keys(intervalGroups).map(intervalKey => {
      const group = intervalGroups[intervalKey];
      let value;
      
      // For motion, fan, light - if more than half readings are true, report as true
      if (type === 'motion' || type === 'fan' || type === 'light') {
        value = group.sum > group.count / 2;
      } else {
        // For numeric values, calculate average
        value = group.sum / group.count;
      }
      
      return {
        value: value,
        timestamp: intervalKey,
        feed: type,
        // Use first data point's ID
        id: feedData.find(item => item.created_at === group.timestamps[0])?.id || null
      };
    });
    
    // Sort by timestamp in ascending order
    aggregatedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Return only the last 48 data points if there are more (exactly 24 hours of 30-minute intervals)
    const limitedData = aggregatedData.slice(-48);
    
    res.status(200).json({
      success: true,
      count: limitedData.length,
      data: limitedData
    });
  } catch (error) {
    console.error(`Error getting aggregated feed data for ${req.params.type}:`, error);
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
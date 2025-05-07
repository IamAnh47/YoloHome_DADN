const SensorModel = require('../models/sensorModel');
const mlPredictionService = require('../services/mlPredictionService');
const alertService = require('../services/alertService');
const adafruitService = require('../services/adafruitService');

// @desc    Get all sensors
// @route   GET /api/sensors
// @access  Private
exports.getAllSensors = async (req, res, next) => {
  try {
    const sensors = await SensorModel.getAllSensors();
    
    res.status(200).json({
      success: true,
      count: sensors.length,
      data: sensors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sensor
// @route   GET /api/sensors/:id
// @access  Private
exports.getSensor = async (req, res, next) => {
  try {
    const sensor = await SensorModel.getSensorById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: 'Sensor not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: sensor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new sensor
// @route   POST /api/sensors
// @access  Private
exports.createSensor = async (req, res, next) => {
  try {
    const { type, model, unit, description } = req.body;
    
    // Validate input
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type for the sensor'
      });
    }
    
    // Create sensor
    const sensor = await SensorModel.createSensor({
      type,
      model,
      unit,
      description
    });
    
    res.status(201).json({
      success: true,
      data: sensor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sensor
// @route   PUT /api/sensors/:id
// @access  Private
exports.updateSensor = async (req, res, next) => {
  try {
    const { type, model, unit, description } = req.body;
    
    const updateData = {};
    if (type) updateData.type = type;
    if (model) updateData.model = model;
    if (unit) updateData.unit = unit;
    if (description) updateData.description = description;
    
    // Update sensor
    const sensor = await SensorModel.updateSensor(req.params.id, updateData);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: 'Sensor not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: sensor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete sensor
// @route   DELETE /api/sensors/:id
// @access  Private
exports.deleteSensor = async (req, res, next) => {
  try {
    const success = await SensorModel.deleteSensor(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Sensor not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sensor data
// @route   GET /api/sensors/:id/data
// @access  Private
exports.getSensorData = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    
    const data = await SensorModel.getSensorData(req.params.id, limit);
    
    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest sensor reading
// @route   GET /api/sensors/:id/latest
// @access  Private
exports.getLatestSensorData = async (req, res, next) => {
  try {
    const data = await SensorModel.getLatestSensorData(req.params.id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'No data found for this sensor'
      });
    }
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add sensor data
// @route   POST /api/sensors/:id/data
// @access  Private
exports.addSensorData = async (req, res, next) => {
  try {
    const { value, timestamp } = req.body;
    
    // Validate input
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide value for the sensor data'
      });
    }
    
    // Add sensor data
    const data = await SensorModel.insertSensorData(req.params.id, value, timestamp);
    
    // Get sensor information
    const sensor = await SensorModel.getSensorById(req.params.id);
    
    // Update sensor cache in ML prediction service
    if (sensor) {
      mlPredictionService.updateSensorCache({
        sensor_type: sensor.sensor_type,
        value: parseFloat(value),
        timestamp: timestamp || new Date().toISOString()
      });
      
      // If this is temperature or humidity data, check for alerts
      if (sensor.sensor_type === 'temperature' || sensor.sensor_type === 'humidity') {
        await alertService.checkSensorAlert(sensor.sensor_id, sensor.sensor_type, value);
      }
    }
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all latest sensor readings
// @route   GET /api/sensors/readings
// @access  Private
exports.getAllLatestReadings = async (req, res, next) => {
  try {
    // Get latest reading for each sensor type
    const temperatureSensor = await SensorModel.getSensorByType('temperature');
    const humiditySensor = await SensorModel.getSensorByType('humidity');
    const motionSensor = await SensorModel.getSensorByType('motion');
    
    // Get latest data for each sensor
    const temperatureData = temperatureSensor ? 
      await SensorModel.getLatestSensorData(temperatureSensor.sensor_id) : null;
    const humidityData = humiditySensor ? 
      await SensorModel.getLatestSensorData(humiditySensor.sensor_id) : null;
    const motionData = motionSensor ? 
      await SensorModel.getLatestSensorData(motionSensor.sensor_id) : null;
    
    // Prepare response data
    const responseData = {
      temperature: temperatureData ? parseFloat(temperatureData.svalue) : 0.0,
      humidity: humidityData ? parseFloat(humidityData.svalue) : 0.0,
      motion: motionData ? motionData.svalue > 0 : false,
      timestamp: new Date().toISOString()
    };
    
    // Check alert thresholds
    await alertService.checkThresholds(responseData);
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting all latest readings:', error);
    next(error);
  }
};

// @desc    Get latest readings
// @route   GET /api/sensors/readings/latest
// @access  Private
exports.getLatestReadings = async (req, res, next) => {
  try {
    // Lấy dữ liệu từ các cảm biến temperature, humidity, motion
    const temperatureSensor = await SensorModel.getSensorByType('temperature');
    const humiditySensor = await SensorModel.getSensorByType('humidity');
    const motionSensor = await SensorModel.getSensorByType('motion');
    
    // Kiểm tra xem các cảm biến có tồn tại không
    if (!temperatureSensor || !humiditySensor || !motionSensor) {
      return res.status(404).json({
        success: false,
        message: 'Required sensors not found'
      });
    }
    
    // Lấy dữ liệu mới nhất từ mỗi cảm biến
    const latestTemperature = await SensorModel.getLatestSensorData(temperatureSensor.sensor_id);
    const latestHumidity = await SensorModel.getLatestSensorData(humiditySensor.sensor_id);
    const latestMotion = await SensorModel.getLatestSensorData(motionSensor.sensor_id);
    
    // Cấu trúc dữ liệu để trả về
    const sensorData = {
      temperature: latestTemperature ? parseFloat(latestTemperature.svalue).toFixed(1) : '0.0',
      humidity: latestHumidity ? parseFloat(latestHumidity.svalue).toFixed(1) : '0.0',
      motion: latestMotion ? latestMotion.svalue > 0 : false,
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      data: sensorData
    });
  } catch (error) {
    console.error('Error in getLatestReadings:', error);
    next(error);
  }
};

// @desc    Get sensor history by type
// @route   GET /api/sensors/history/:type
// @access  Private
exports.getSensorHistoryByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const timeRange = req.query.timeRange || 'day';
    
    // Validate sensor type
    if (!type || !['temperature', 'humidity', 'motion'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sensor type'
      });
    }
    
    // Validate time range
    if (!['day', 'week'].includes(timeRange)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Use "day" or "week"'
      });
    }
    
    // Get sensor ID by type
    const sensor = await SensorModel.getSensorByType(type);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: `${type} sensor not found`
      });
    }
    
    // Get the historical data (limit is handled inside the model based on timeRange)
    const limit = req.query.limit ? parseInt(req.query.limit) : (timeRange === 'day' ? 20 : 7);
    const historyData = await SensorModel.getSensorHistory(sensor.sensor_id, limit, timeRange);
    
    // Format the data for UI
    const formattedData = historyData.map(item => {
      let formattedValue = type === 'motion' ? (item.svalue > 0) : parseFloat(item.svalue);
      
      // Ensure numeric value is valid
      if (isNaN(formattedValue) && type !== 'motion') {
        formattedValue = 0;
      }
      
      return {
        timestamp: timeRange === 'week' ? item.day : item.recorded_time,
        value: formattedValue
      };
    });
    
    res.status(200).json({
      success: true,
      count: formattedData.length,
      timeRange: timeRange,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error getting ${req.params.type} history:`, error);
    next(error);
  }
};

// @desc    Create new sensor data
// @route   POST /api/sensors/data
// @access  Private
exports.createSensorData = async (req, res, next) => {
  try {
    const { sensor_id, value, timestamp } = req.body;
    
    // Validate input
    if (!sensor_id || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide sensor_id and value for the sensor data'
      });
    }
    
    // Add sensor data
    const data = await SensorModel.insertSensorData(sensor_id, value, timestamp);
    
    // If this is temperature data, run the prediction
    const sensor = await SensorModel.getSensorById(sensor_id);
    if (sensor && sensor.sensor_type === 'temperature') {
      // Run temperature prediction if available
      try {
        const prediction = await mlPredictionService.predictTemperature(value);
        // Include prediction in response
        data.prediction = prediction;
      } catch (predictionError) {
        console.error('Error running temperature prediction:', predictionError);
      }
    }
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error creating sensor data:', error);
    next(error);
  }
};

// @desc    Get latest reading for a specific sensor type
// @route   GET /api/sensors/readings/:type
// @access  Private
exports.getLatestSensorByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    // Validate sensor type
    if (!type || !['temperature', 'humidity', 'motion'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sensor type'
      });
    }
    
    // Get sensor by type
    const sensor = await SensorModel.getSensorByType(type);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        message: `${type} sensor not found`
      });
    }
    
    // Get latest data for the specific sensor
    const latestData = await SensorModel.getLatestSensorData(sensor.sensor_id);
    
    // Prepare response data with only the requested sensor type
    const responseData = {
      temperature: type === 'temperature' ? 
        (latestData ? parseFloat(latestData.svalue) : 0.0) : undefined,
      humidity: type === 'humidity' ? 
        (latestData ? parseFloat(latestData.svalue) : 0.0) : undefined,
      motion: type === 'motion' ? 
        (latestData ? latestData.svalue > 0 : false) : undefined,
      timestamp: new Date().toISOString()
    };
    
    // Remove undefined properties
    Object.keys(responseData).forEach(key => 
      responseData[key] === undefined && delete responseData[key]
    );
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error(`Error getting latest ${req.params.type} data:`, error);
    next(error);
  }
};

// @desc    Get feed data from Adafruit IO by date
// @route   GET /api/sensors/feeds/:type/data
// @access  Private
exports.getFeedDataByDate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    // Validate sensor type
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

// @desc    Get temperature and humidity predictions
// @route   GET /api/sensors/predictions
// @access  Private
exports.getPredictions = async (req, res, next) => {
  try {
    const predictions = await mlPredictionService.predict();
    
    if (!predictions.success) {
      return res.status(400).json({
        success: false,
        message: predictions.message || 'Failed to make predictions'
      });
    }
    
    res.status(200).json({
      success: true,
      data: predictions.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Train the ML prediction models
// @route   POST /api/sensors/train-models
// @access  Private
exports.trainModels = async (req, res, next) => {
  try {
    const result = await mlPredictionService.trainModels();
    
    res.status(200).json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};
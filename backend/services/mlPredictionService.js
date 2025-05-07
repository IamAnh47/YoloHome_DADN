const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const SensorModel = require('../models/sensorModel');
const DeviceModel = require('../models/deviceModel');
const SystemModel = require('../models/systemModel');
const deviceController = require('../controllers/deviceController');

class MLPredictionService {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.predictionScriptPath = path.join(__dirname, '../../ml/prediction_service.py');
    this.modelTrainingScriptPath = path.join(__dirname, '../../ml/decision_tree_model.py');
    
    // Initialize cache for recent sensor values
    this.sensorCache = {
      temperature: {
        current: null,
        previous: null,
        timestamp: null
      },
      humidity: {
        current: null,
        previous: null,
        timestamp: null
      }
    };
    
    // Check if ML directory and scripts exist
    this.checkSetup();
  }
  
  /**
   * Check if ML scripts and directories exist
   */
  async checkSetup() {
    const fs = require('fs').promises;
    
    try {
      // Check if prediction script exists
      await fs.access(this.predictionScriptPath);
      logger.info('ML prediction script found');
      
      // Check if training script exists
      await fs.access(this.modelTrainingScriptPath);
      logger.info('ML training script found');
      
      // Check if models directory exists
      const modelsDir = path.join(__dirname, '../../ml/models');
      try {
        await fs.access(modelsDir);
        logger.info('ML models directory found');
        
        // Check if models exist
        const tempModelPath = path.join(modelsDir, 'temperature_model.pkl');
        const humidModelPath = path.join(modelsDir, 'humidity_model.pkl');
        
        try {
          await fs.access(tempModelPath);
          await fs.access(humidModelPath);
          logger.info('ML models found');
        } catch (e) {
          logger.warn('ML models not found, you may need to train them first');
        }
      } catch (e) {
        logger.warn('ML models directory not found, creating it');
        await fs.mkdir(modelsDir, { recursive: true });
      }
    } catch (e) {
      logger.error(`ML setup check failed: ${e.message}`);
    }
  }
  
  /**
   * Train the prediction models
   */
  async trainModels() {
    return new Promise((resolve, reject) => {
      logger.info('Starting ML model training');
      
      const process = spawn(this.pythonPath, [this.modelTrainingScriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.info(`ML Training: ${data.toString().trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.error(`ML Training Error: ${data.toString().trim()}`);
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error(`ML training process exited with code ${code}`);
          reject(new Error(`ML training failed: ${stderr}`));
        } else {
          logger.info('ML model training completed successfully');
          resolve({ success: true, message: 'Models trained successfully' });
        }
      });
    });
  }
  
  /**
   * Update the sensor cache with new readings
   * @param {Object} sensorData - Sensor reading data
   */
  updateSensorCache(sensorData) {
    const { sensor_type, value, timestamp } = sensorData;
    
    if (sensor_type === 'temperature' || sensor_type === 'humidity') {
      // Move current value to previous
      this.sensorCache[sensor_type].previous = this.sensorCache[sensor_type].current;
      
      // Update current value
      this.sensorCache[sensor_type].current = value;
      this.sensorCache[sensor_type].timestamp = timestamp || new Date().toISOString();
      
      logger.debug(`Updated ${sensor_type} cache: current=${value}, prev=${this.sensorCache[sensor_type].previous}`);
    }
  }
  
  /**
   * Make predictions using the trained models
   * @returns {Promise<Object>} Prediction results
   */
  async predict() {
    // Check if we have enough data for prediction
    if (!this.sensorCache.temperature.current || 
        !this.sensorCache.temperature.previous || 
        !this.sensorCache.humidity.current || 
        !this.sensorCache.humidity.previous) {
      logger.warn('Not enough cached sensor data for prediction');
      
      // Try to get recent readings from database
      await this.loadRecentSensorData();
      
      // Check again if we have enough data
      if (!this.sensorCache.temperature.current || 
          !this.sensorCache.temperature.previous || 
          !this.sensorCache.humidity.current || 
          !this.sensorCache.humidity.previous) {
        return {
          success: false,
          message: 'Not enough sensor data for prediction'
        };
      }
    }
    
    return new Promise((resolve, reject) => {
      // Prepare input data for Python script
      const inputData = {
        current_temperature: this.sensorCache.temperature.current,
        previous_temperature: this.sensorCache.temperature.previous,
        current_humidity: this.sensorCache.humidity.current,
        previous_humidity: this.sensorCache.humidity.previous
      };
      
      // Spawn Python process
      const process = spawn(this.pythonPath, [this.predictionScriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      // Send input to Python process
      process.stdin.write(JSON.stringify(inputData));
      process.stdin.end();
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.error(`ML Prediction Error: ${data.toString().trim()}`);
      });
      
      process.on('close', async (code) => {
        if (code !== 0) {
          logger.error(`ML prediction process exited with code ${code}`);
          reject(new Error(`Prediction failed: ${stderr}`));
        } else {
          try {
            const predictions = JSON.parse(stdout);
            logger.info(`Prediction completed - Temperature: ${predictions.temperature.predicted.toFixed(2)}°C, Humidity: ${predictions.humidity.predicted.toFixed(2)}%`);
            
            // Check if we should activate fan based on prediction
            if (predictions.activate_fan) {
              await this.activateFanIfNeeded(predictions.temperature.predicted);
            }
            
            resolve({
              success: true,
              data: predictions
            });
          } catch (e) {
            logger.error(`Error parsing prediction output: ${e.message}`);
            reject(new Error(`Error parsing prediction output: ${e.message}`));
          }
        }
      });
    });
  }
  
  /**
   * Load recent sensor data from database if cache is empty
   */
  async loadRecentSensorData() {
    try {
      // Get temperature sensor ID
      const tempSensor = await SensorModel.getSensorByType('temperature');
      if (!tempSensor) {
        logger.error('Temperature sensor not found');
        return;
      }
      
      // Get humidity sensor ID
      const humiditySensor = await SensorModel.getSensorByType('humidity');
      if (!humiditySensor) {
        logger.error('Humidity sensor not found');
        return;
      }
      
      // Get recent temperature readings
      const tempReadings = await SensorModel.getSensorData(tempSensor.sensor_id, 2);
      
      // Get recent humidity readings
      const humidityReadings = await SensorModel.getSensorData(humiditySensor.sensor_id, 2);
      
      // Update cache with database values
      if (tempReadings.length >= 2) {
        this.sensorCache.temperature.current = tempReadings[0].svalue;
        this.sensorCache.temperature.previous = tempReadings[1].svalue;
        this.sensorCache.temperature.timestamp = tempReadings[0].recorded_time;
        
        logger.debug(`Loaded temperature from DB: current=${tempReadings[0].svalue}, prev=${tempReadings[1].svalue}`);
      }
      
      if (humidityReadings.length >= 2) {
        this.sensorCache.humidity.current = humidityReadings[0].svalue;
        this.sensorCache.humidity.previous = humidityReadings[1].svalue;
        this.sensorCache.humidity.timestamp = humidityReadings[0].recorded_time;
        
        logger.debug(`Loaded humidity from DB: current=${humidityReadings[0].svalue}, prev=${humidityReadings[1].svalue}`);
      }
    } catch (error) {
      logger.error(`Error loading recent sensor data: ${error.message}`);
    }
  }
  
  /**
   * Activate fan if temperature exceeds threshold
   * @param {number} predictedTemperature - Predicted temperature
   */
  async activateFanIfNeeded(predictedTemperature) {
    try {
      const threshold = 30;
      
      // Check if AI Mode is enabled
      const aiModeEnabled = await SystemModel.getAIMode();
      
      if (!aiModeEnabled) {
        logger.info('AI Mode is disabled. Skipping automatic fan activation.');
        return false;
      }
      
      if (predictedTemperature > threshold) {
        logger.info(`Predicted temperature (${predictedTemperature.toFixed(2)}°C) exceeds threshold (${threshold}°C). Activating fan if needed.`);
        
        // Get fan devices
        const fans = await DeviceModel.getDevicesByType('fan');
        
        if (fans.length === 0) {
          logger.warn('No fan devices found for automatic control');
          return false;
        }
        
        // Activate fans that are currently off
        for (const fan of fans) {
          if (fan.status === 'inactive') {
            logger.info(`Activating fan ${fan.device_id} based on ML prediction`);
            
            // Use device controller to toggle device
            await deviceController.toggleDeviceAI(
              fan.device_id, 
              'ON', 
              'Temperature prediction triggered activation'
            );
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error activating fan: ${error.message}`);
      return false;
    }
  }
}

module.exports = new MLPredictionService(); 
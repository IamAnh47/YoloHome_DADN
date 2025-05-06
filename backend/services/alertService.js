const db = require('../config/db');
const AlertModel = require('../models/alertModel');
const AlertConfigModel = require('../models/alertConfigModel');
const SensorModel = require('../models/sensorModel');
const logger = require('../utils/logger');

class AlertService {
  /**
   * Kiểm tra dữ liệu cảm biến với ngưỡng và tạo cảnh báo nếu cần
   * @param {Object} sensorData - Dữ liệu cảm biến {temperature, humidity, motion}
   * @param {Number} userId - ID của người dùng để lấy cấu hình cảnh báo
   */
  static async checkThresholds(sensorData, userId = 1) {
    try {
      console.log('Checking thresholds for sensor data:', sensorData);
      
      // Lấy cấu hình cảnh báo
      const alertConfigs = await AlertConfigModel.getAlertConfig(userId);
      
      if (!alertConfigs || alertConfigs.length === 0) {
        console.log('No alert configurations found. Creating defaults.');
        await AlertConfigModel.initializeDefaultConfigs(userId);
        return;
      }
      
      // Xử lý cảnh báo nhiệt độ
      await this.processTemperatureAlert(sensorData.temperature, alertConfigs);
      
      // Xử lý cảnh báo độ ẩm
      await this.processHumidityAlert(sensorData.humidity, alertConfigs);
      
      return true;
    } catch (error) {
      console.error('Error checking thresholds:', error);
      return false;
    }
  }
  
  /**
   * Xử lý cảnh báo nhiệt độ
   * @param {Number} temperature - Giá trị nhiệt độ hiện tại
   * @param {Array} configs - Cấu hình cảnh báo
   */
  static async processTemperatureAlert(temperature, configs) {
    try {
      if (temperature === undefined || temperature === null) {
        console.log('No temperature data provided');
        return;
      }
      
      const config = configs.find(cfg => cfg.sensor_type === 'temperature' && cfg.is_active);
      
      if (!config) {
        console.log('No active temperature alert configuration found');
        return;
      }
      
      const tempValue = parseFloat(temperature);
      console.log(`Checking temperature: ${tempValue}, thresholds: min=${config.min_value}, max=${config.max_value}`);
      
      // Kiểm tra ngưỡng thấp
      if (tempValue < config.min_value) {
        const message = `Nhiệt độ hiện tại (${tempValue}°C) thấp hơn ngưỡng cảnh báo (${config.min_value}°C)`;
        await this.createAlert('Low Temperature', message, 1);
        console.log(`Created low temperature alert: ${message}`);
      }
      
      // Kiểm tra ngưỡng cao
      if (tempValue > config.max_value) {
        const message = `Nhiệt độ hiện tại (${tempValue}°C) cao hơn ngưỡng cảnh báo (${config.max_value}°C)`;
        await this.createAlert('High Temperature', message, 1);
        console.log(`Created high temperature alert: ${message}`);
      }
    } catch (error) {
      console.error('Error processing temperature alert:', error);
    }
  }
  
  /**
   * Xử lý cảnh báo độ ẩm
   * @param {Number} humidity - Giá trị độ ẩm hiện tại
   * @param {Array} configs - Cấu hình cảnh báo
   */
  static async processHumidityAlert(humidity, configs) {
    try {
      if (humidity === undefined || humidity === null) {
        console.log('No humidity data provided');
        return;
      }
      
      const config = configs.find(cfg => cfg.sensor_type === 'humidity' && cfg.is_active);
      
      if (!config) {
        console.log('No active humidity alert configuration found');
        return;
      }
      
      const humidityValue = parseFloat(humidity);
      console.log(`Checking humidity: ${humidityValue}, thresholds: min=${config.min_value}, max=${config.max_value}`);
      
      // Kiểm tra ngưỡng thấp
      if (humidityValue < config.min_value) {
        const message = `Độ ẩm hiện tại (${humidityValue}%) thấp hơn ngưỡng cảnh báo (${config.min_value}%)`;
        await this.createAlert('Low Humidity', message, 2);
        console.log(`Created low humidity alert: ${message}`);
      }
      
      // Kiểm tra ngưỡng cao
      if (humidityValue > config.max_value) {
        const message = `Độ ẩm hiện tại (${humidityValue}%) cao hơn ngưỡng cảnh báo (${config.max_value}%)`;
        await this.createAlert('High Humidity', message, 2);
        console.log(`Created high humidity alert: ${message}`);
      }
    } catch (error) {
      console.error('Error processing humidity alert:', error);
    }
  }
  
  /**
   * Tạo cảnh báo mới
   * @param {String} alertType - Loại cảnh báo
   * @param {String} message - Nội dung cảnh báo
   * @param {Number} sensorId - ID của cảm biến
   */
  static async createAlert(alertType, message, sensorId) {
    try {
      // Kiểm tra xem có cảnh báo tương tự đang hoạt động không
      const existingAlerts = await AlertModel.getAllAlerts(10, 'pending');
      const similarAlert = existingAlerts.find(alert => 
        alert.alert_type === alertType && 
        alert.amessage === message &&
        alert.sensor_id === sensorId
      );
      
      if (similarAlert) {
        console.log('Similar alert already exists, skipping creation');
        return;
      }
      
      // Xác định device_id dựa trên loại cảnh báo
      let deviceId = 1; // Default device ID
      
      if (alertType.includes('Temperature')) {
        deviceId = 1; // ID của thiết bị nhiệt độ
      } else if (alertType.includes('Humidity')) {
        deviceId = 2; // ID của thiết bị độ ẩm
      } else if (alertType.includes('Motion')) {
        deviceId = 3; // ID của thiết bị chuyển động
      }
      
      // Tạo cảnh báo mới
      const alertData = {
        device_id: deviceId,
        sensor_id: sensorId,
        alert_type: alertType,
        amessage: message,
        status: 'pending'
      };
      
      await AlertModel.createAlert(alertData);
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }
}

module.exports = AlertService; 
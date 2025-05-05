const AdafruitService = require('./adafruitService');
const AlertConfigModel = require('../models/alertConfigModel');
const alertService = require('./alertService');
const logger = require('../utils/logger');

class FeedAlertService {
  /**
   * Kiểm tra ngưỡng cảnh báo cho dữ liệu trung bình của các feeds trong 1 phút
   * @param {Number} userId - ID của người dùng để lấy cấu hình cảnh báo
   */
  static async checkFeedThresholds(userId = 1) {
    try {
      logger.info('Checking feed thresholds for average values (1 minute)');
      
      // Tính dữ liệu trung bình trong 1 phút cho nhiệt độ và độ ẩm
      const tempData = await this.getAverageValueForLastMinute('temperature');
      const humidityData = await this.getAverageValueForLastMinute('humidity');
      
      // Nếu không có dữ liệu, kết thúc kiểm tra
      if (tempData === null && humidityData === null) {
        logger.info('No feed data available for threshold check');
        return false;
      }
      
      // Lấy cấu hình cảnh báo
      const alertConfigs = await AlertConfigModel.getAlertConfig(userId);
      
      if (!alertConfigs || alertConfigs.length === 0) {
        logger.info('No alert configurations found. Creating defaults.');
        await AlertConfigModel.initializeDefaultConfigs(userId);
        return false;
      }
      
      // Kiểm tra ngưỡng cảnh báo cho nhiệt độ
      if (tempData !== null) {
        await this.checkTemperatureThreshold(tempData, alertConfigs);
      }
      
      // Kiểm tra ngưỡng cảnh báo cho độ ẩm
      if (humidityData !== null) {
        await this.checkHumidityThreshold(humidityData, alertConfigs);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error checking feed thresholds: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Lấy giá trị trung bình của feed trong 1 phút vừa qua
   * @param {String} feedType - Loại feed (temperature, humidity)
   * @returns {Number|null} - Giá trị trung bình hoặc null nếu không có dữ liệu
   */
  static async getAverageValueForLastMinute(feedType) {
    try {
      // Tính thời gian 1 phút trước
      const now = new Date();
      const oneMinuteAgo = new Date(now);
      oneMinuteAgo.setMinutes(now.getMinutes() - 1);
      
      // Lấy dữ liệu từ Adafruit IO feed
      const feedData = await AdafruitService.getFeedDataByDate(
        feedType,
        oneMinuteAgo.toISOString(),
        now.toISOString(),
        100 // Giới hạn số lượng dữ liệu
      );
      
      // Nếu không có dữ liệu, trả về null
      if (!feedData || feedData.length === 0) {
        logger.info(`No data available for ${feedType} feed in the last minute`);
        return null;
      }
      
      // Tính giá trị trung bình
      const sum = feedData.reduce((total, item) => {
        return total + parseFloat(item.value);
      }, 0);
      
      const average = sum / feedData.length;
      
      logger.info(`${feedType} average for last minute: ${average.toFixed(2)} (from ${feedData.length} readings)`);
      return average;
    } catch (error) {
      logger.error(`Error getting average value for ${feedType}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Kiểm tra ngưỡng cảnh báo cho nhiệt độ trung bình
   * @param {Number} temperature - Giá trị nhiệt độ trung bình
   * @param {Array} configs - Cấu hình cảnh báo
   */
  static async checkTemperatureThreshold(temperature, configs) {
    try {
      const config = configs.find(cfg => cfg.sensor_type === 'temperature' && cfg.is_active);
      
      if (!config) {
        logger.info('No active temperature alert configuration found');
        return;
      }
      
      const tempValue = parseFloat(temperature);
      logger.info(`Checking average temperature: ${tempValue.toFixed(2)}°C, thresholds: min=${config.min_value}, max=${config.max_value}`);
      
      // Kiểm tra ngưỡng thấp
      if (tempValue < config.min_value) {
        const message = `Nhiệt độ trung bình (${tempValue.toFixed(1)}°C) thấp hơn ngưỡng cảnh báo (${config.min_value}°C) trong 1 phút vừa qua`;
        await alertService.createAlert('Low Temperature', message, 1);
        logger.info(`Created low temperature alert: ${message}`);
      }
      
      // Kiểm tra ngưỡng cao
      if (tempValue > config.max_value) {
        const message = `Nhiệt độ trung bình (${tempValue.toFixed(1)}°C) cao hơn ngưỡng cảnh báo (${config.max_value}°C) trong 1 phút vừa qua`;
        await alertService.createAlert('High Temperature', message, 1);
        logger.info(`Created high temperature alert: ${message}`);
      }
    } catch (error) {
      logger.error(`Error checking temperature threshold: ${error.message}`);
    }
  }
  
  /**
   * Kiểm tra ngưỡng cảnh báo cho độ ẩm trung bình
   * @param {Number} humidity - Giá trị độ ẩm trung bình
   * @param {Array} configs - Cấu hình cảnh báo
   */
  static async checkHumidityThreshold(humidity, configs) {
    try {
      const config = configs.find(cfg => cfg.sensor_type === 'humidity' && cfg.is_active);
      
      if (!config) {
        logger.info('No active humidity alert configuration found');
        return;
      }
      
      const humidityValue = parseFloat(humidity);
      logger.info(`Checking average humidity: ${humidityValue.toFixed(2)}%, thresholds: min=${config.min_value}, max=${config.max_value}`);
      
      // Kiểm tra ngưỡng thấp
      if (humidityValue < config.min_value) {
        const message = `Độ ẩm trung bình (${humidityValue.toFixed(1)}%) thấp hơn ngưỡng cảnh báo (${config.min_value}%) trong 1 phút vừa qua`;
        await alertService.createAlert('Low Humidity', message, 2);
        logger.info(`Created low humidity alert: ${message}`);
      }
      
      // Kiểm tra ngưỡng cao
      if (humidityValue > config.max_value) {
        const message = `Độ ẩm trung bình (${humidityValue.toFixed(1)}%) cao hơn ngưỡng cảnh báo (${config.max_value}%) trong 1 phút vừa qua`;
        await alertService.createAlert('High Humidity', message, 2);
        logger.info(`Created high humidity alert: ${message}`);
      }
    } catch (error) {
      logger.error(`Error checking humidity threshold: ${error.message}`);
    }
  }
}

module.exports = FeedAlertService; 
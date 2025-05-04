const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Adafruit IO configuration
const ADA_USERNAME = process.env.ADA_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

// Headers for Adafruit IO API requests
const headers = {
  'X-AIO-Key': ADAFRUIT_IO_KEY,
  'Content-Type': 'application/json'
};

/**
 * Service to interact with Adafruit IO feeds
 */
class AdafruitService {
  constructor() {
    this.baseUrl = `https://io.adafruit.com/api/v2/${ADA_USERNAME}/feeds`;
    this.enabled = !!ADAFRUIT_IO_KEY;
    
    if (!this.enabled) {
      logger.warn('Adafruit IO service is disabled (missing API key)');
    } else {
      logger.info('Adafruit IO service initialized');
    }
  }
  
  /**
   * Get the latest data from a feed
   * @param {string} feedId - The ID or name of the feed
   * @returns {Promise<Object>} - The feed data
   */
  async getFeedData(feedId) {
    if (!this.enabled) {
      logger.info(`Adafruit IO get skipped (DISABLED): Feed: ${feedId}`);
      return null;
    }
    
    try {
      const url = `${this.baseUrl}/dadn.${feedId}/data?limit=1`;
      const response = await axios.get(url, { headers });
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      logger.error(`Error fetching feed data: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Send a value to a feed
   * @param {string} feedId - The ID or name of the feed
   * @param {string|number} value - The value to send
   * @returns {Promise<Object>} - The response data
   */
  async sendToFeed(feedId, value) {
    if (!this.enabled) {
      logger.info(`Adafruit IO publish skipped (DISABLED): Feed: ${feedId}, Value: ${value}`);
      return null;
    }
    
    try {
      const url = `${this.baseUrl}/dadn.${feedId}/data`;
      const payload = { value: value.toString() };
      
      logger.info(`Sending to Adafruit IO: Feed: ${feedId}, Value: ${value}`);
      const response = await axios.post(url, payload, { headers });
      
      return response.data;
    } catch (error) {
      logger.error(`Error sending to feed: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Control a device (fan or light)
   * @param {string} deviceType - The type of device ('fan' or 'light')
   * @param {boolean} turnOn - Whether to turn the device on (true) or off (false)
   * @returns {Promise<Object>} - The response data
   */
  async controlDevice(deviceType, turnOn) {
    // Validate device type
    if (deviceType !== 'fan' && deviceType !== 'light') {
      logger.error(`Invalid device type: ${deviceType}`);
      return null;
    }
    
    // Convert boolean to 1/0
    const value = turnOn ? 1 : 0;
    
    // Send command to Adafruit IO
    const result = await this.sendToFeed(deviceType, value);
    logger.info(`Device control sent to Adafruit IO: ${deviceType} = ${value}, result: ${result ? 'success' : 'failed'}`);
    
    return result;
  }
  
  /**
   * Turn on a fan
   * @returns {Promise<Object>} - The response data
   */
  async turnOnFan() {
    return this.controlDevice('fan', true);
  }
  
  /**
   * Turn off a fan
   * @returns {Promise<Object>} - The response data
   */
  async turnOffFan() {
    return this.controlDevice('fan', false);
  }
  
  /**
   * Turn on a light
   * @returns {Promise<Object>} - The response data
   */
  async turnOnLight() {
    return this.controlDevice('light', true);
  }
  
  /**
   * Turn off a light
   * @returns {Promise<Object>} - The response data
   */
  async turnOffLight() {
    return this.controlDevice('light', false);
  }

  /**
   * Synchronize device states from Adafruit IO feeds to database
   * @param {Function} updateDeviceFunc - Function to update device status in database
   */
  async syncDeviceStatesFromFeed(updateDeviceFunc) {
    if (!this.enabled) {
      logger.info('Adafruit IO sync skipped (DISABLED)');
      return;
    }
    
    try {
      logger.info('Syncing device states from Adafruit IO feeds');
      
      // Get fan state from feed
      const fanData = await this.getFeedData('fan');
      if (fanData) {
        const fanValue = parseInt(fanData.value);
        const fanStatus = fanValue === 1 ? 'active' : 'inactive';
        logger.info(`Fan feed value: ${fanValue}, status: ${fanStatus}`);
        
        // Update fan in database
        await updateDeviceFunc('fan', fanStatus);
        logger.info(`Fan status updated in database: ${fanStatus}`);
      }
      
      // Get light state from feed
      const lightData = await this.getFeedData('light');
      if (lightData) {
        const lightValue = parseInt(lightData.value);
        const lightStatus = lightValue === 1 ? 'active' : 'inactive';
        logger.info(`Light feed value: ${lightValue}, status: ${lightStatus}`);
        
        // Update light in database
        await updateDeviceFunc('light', lightStatus);
        logger.info(`Light status updated in database: ${lightStatus}`);
      }
      
      logger.info('Device sync from Adafruit IO completed');
      return {
        fan: fanData ? parseInt(fanData.value) : null,
        light: lightData ? parseInt(lightData.value) : null
      };
    } catch (error) {
      logger.error(`Error syncing device states: ${error.message}`);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new AdafruitService(); 
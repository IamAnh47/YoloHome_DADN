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
    // AI mode flag
    this.aiModeEnabled = false;
    // Temperature threshold for the fan in AI mode (in Celsius)
    this.temperatureThreshold = 18;
    // Keep track of the last AI control state to avoid unnecessary calls
    this.lastAiControlState = null;
    
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

  /**
   * Get feed data by date range
   * @param {string} feedId - The ID or name of the feed
   * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
   * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} - Array of feed data
   */
  async getFeedDataByDate(feedId, startDate = null, endDate = null, limit = 50) {
    if (!this.enabled) {
      logger.info(`Adafruit IO get by date skipped (DISABLED): Feed: ${feedId}`);
      return [];
    }
    
    try {
      let url = `${this.baseUrl}/dadn.${feedId}/data`;
      const params = [];
      
      if (limit) {
        params.push(`limit=${limit}`);
      }
      
      if (startDate) {
        const formattedStartDate = new Date(startDate).toISOString();
        params.push(`start_time=${encodeURIComponent(formattedStartDate)}`);
      }
      
      if (endDate) {
        const formattedEndDate = new Date(endDate).toISOString();
        params.push(`end_time=${encodeURIComponent(formattedEndDate)}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      logger.info(`Fetching feed data by date: ${url}`);
      const response = await axios.get(url, { headers });
      
      return response.data || [];
    } catch (error) {
      logger.error(`Error fetching feed data by date: ${error.message}`);
      return [];
    }
  }

  /**
   * Enable AI mode for fan control
   * @returns {boolean} - Success status
   */
  async enableAIMode() {
    if (!this.enabled) {
      logger.info('AI Mode enable skipped (Adafruit DISABLED)');
      return false;
    }
    
    try {
      this.aiModeEnabled = true;
      logger.info('AI Mode enabled for fan control');
      
      // When AI mode is enabled, turn on the fan first
      const result = await this.turnOnFan();
      
      return !!result;
    } catch (error) {
      logger.error(`Error enabling AI Mode: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Disable AI mode for fan control
   * @returns {boolean} - Success status
   */
  async disableAIMode() {
    if (!this.enabled) {
      logger.info('AI Mode disable skipped (Adafruit DISABLED)');
      return false;
    }
    
    try {
      this.aiModeEnabled = false;
      this.lastAiControlState = null;
      logger.info('AI Mode disabled for fan control');
      return true;
    } catch (error) {
      logger.error(`Error disabling AI Mode: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check the current AI mode status
   * @returns {boolean} - Whether AI mode is enabled
   */
  isAIModeEnabled() {
    return this.aiModeEnabled;
  }
  
  /**
   * Check temperature and manage fan based on AI mode
   * @param {Function} updateDeviceFunc - Function to update device status in database
   * @returns {Promise<Object>} - Result including temperature and action taken
   */
  async checkTemperatureAndManageFan(updateDeviceFunc) {
    if (!this.enabled || !this.aiModeEnabled) {
      return { success: false, aiModeEnabled: this.aiModeEnabled };
    }
    
    try {
      // Get the latest temperature data
      const tempData = await this.getFeedData('temperature');
      
      if (!tempData) {
        logger.error('Could not get temperature data for AI control');
        return { success: false, message: 'Could not get temperature data' };
      }
      
      // Parse the temperature value
      const temperature = parseFloat(tempData.value);
      
      // Check if temperature is below threshold
      const shouldTurnOff = temperature < this.temperatureThreshold;
      
      // Only take action if different from last state
      if (this.lastAiControlState !== shouldTurnOff) {
        if (shouldTurnOff) {
          logger.info(`AI Mode: Temperature (${temperature}°C) below threshold (${this.temperatureThreshold}°C), turning fan OFF`);
          await this.turnOffFan();
          await updateDeviceFunc('fan', 'inactive');
        } else {
          logger.info(`AI Mode: Temperature (${temperature}°C) above threshold (${this.temperatureThreshold}°C), turning fan ON`);
          await this.turnOnFan();
          await updateDeviceFunc('fan', 'active');
        }
        
        // Update last state
        this.lastAiControlState = shouldTurnOff;
      }
      
      return { 
        success: true, 
        temperature: temperature,
        threshold: this.temperatureThreshold,
        action: shouldTurnOff ? 'fan_off' : 'fan_on',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error in AI temperature management: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new AdafruitService(); 
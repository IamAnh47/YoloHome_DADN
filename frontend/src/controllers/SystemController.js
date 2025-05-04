import apiService from '../services/apiService';

class SystemController {
  // Cache storage for system data
  static cache = {
    systemStatus: null
  };
  
  // Store last fetched timestamp to check data freshness
  static lastFetchTime = 0;
  static cacheTTL = 5000; // 5 seconds TTL for cache
  
  /**
   * Checks if the cached data is still fresh
   * @returns {boolean} True if cache is valid, false if we need fresh data
   */
  static isDataFresh() {
    const now = Date.now();
    return (now - this.lastFetchTime) < this.cacheTTL;
  }
  
  /**
   * Updates the last fetch timestamp
   */
  static updateFetchTime() {
    this.lastFetchTime = Date.now();
  }

  /**
   * Get system status (devices and sensors)
   * @param {boolean} [forceFresh=false] Force refresh data from server
   * @returns {Promise<Object>} All devices and sensor data
   */
  static async getSystemStatus(forceFresh = false) {
    try {
      // If data is not fresh or force refresh is requested, fetch from API
      if (!this.isDataFresh() || forceFresh) {
        console.log('Fetching system status from API');
        
        // Add cache-busting parameter to ensure fresh data
        const cacheBuster = `?_t=${Date.now()}`;
        const response = await apiService.get('/status' + cacheBuster);
        
        if (response.data && response.data.data) {
          // Store data in cache and update fetch time
          this.cache.systemStatus = response.data.data;
          this.updateFetchTime();
          return response.data.data;
        }
        
        console.warn('Invalid API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format from API');
      } else {
        console.log('Using cached system status data');
        return this.getFromCache();
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }
  
  /**
   * Get data from cache
   * @returns {Object} Cached data
   */
  static getFromCache() {
    if (!this.cache.systemStatus) {
      throw new Error('No cached system status data');
    }
    return this.cache.systemStatus;
  }
  
  /**
   * Control the fan
   * @param {boolean} turnOn - true to turn on, false to turn off
   * @returns {Promise<Object>} Control result
   */
  static async controlFan(turnOn) {
    try {
      const action = turnOn ? 'on' : 'off';
      const response = await apiService.post(`/devices/fan/${action}`);
      
      // Force refresh system status after a control action
      await this.getSystemStatus(true);
      
      return response.data;
    } catch (error) {
      console.error(`Error controlling fan (${turnOn ? 'ON' : 'OFF'}):`, error);
      throw error;
    }
  }
  
  /**
   * Control the light
   * @param {boolean} turnOn - true to turn on, false to turn off
   * @returns {Promise<Object>} Control result
   */
  static async controlLight(turnOn) {
    try {
      const action = turnOn ? 'on' : 'off';
      const response = await apiService.post(`/devices/light/${action}`);
      
      // Force refresh system status after a control action
      await this.getSystemStatus(true);
      
      return response.data;
    } catch (error) {
      console.error(`Error controlling light (${turnOn ? 'ON' : 'OFF'}):`, error);
      throw error;
    }
  }
}

export default SystemController; 
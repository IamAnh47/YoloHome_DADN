import apiService from '../services/apiService';

class SensorController {
  // Cached data timestamps
  static sensorDataTimestamps = {
    readings: 0,
    history: {},
    alerts: 0
  };
  
  // Cache TTL values in milliseconds
  static cacheTTL = {
    readings: 5000,  // 5 seconds for current readings
    history: 5000,   // 5 seconds for history data
    alerts: 5000     // 5 seconds for alerts
  };
  
  /**
   * Check if data is fresh for a specific data type
   * @param {string} dataType - Type of data (readings, history, alerts)
   * @param {string} [subType] - Subtype for history data (temperature, humidity, etc.)
   * @returns {boolean} True if data is fresh, false otherwise
   */
  static isDataFresh(dataType, subType = null) {
    const now = Date.now();
    
    if (dataType === 'history' && subType) {
      // For history data with subtype (like temperature or humidity)
      if (!this.sensorDataTimestamps.history[subType]) return false;
      return (now - this.sensorDataTimestamps.history[subType]) < this.cacheTTL.history;
    }
    
    // For other data types
    return (now - this.sensorDataTimestamps[dataType]) < this.cacheTTL[dataType];
  }
  
  /**
   * Update timestamp for a specific data type
   * @param {string} dataType - Type of data (readings, history, alerts)
   * @param {string} [subType] - Subtype for history data (temperature, humidity, etc.)
   */
  static updateTimestamp(dataType, subType = null) {
    const now = Date.now();
    
    if (dataType === 'history' && subType) {
      if (!this.sensorDataTimestamps.history[subType]) {
        this.sensorDataTimestamps.history[subType] = now;
      } else {
        this.sensorDataTimestamps.history[subType] = now;
      }
    } else {
      this.sensorDataTimestamps[dataType] = now;
    }
  }

  /**
   * Get latest sensor readings with automatic cache management
   * @param {boolean} [forceFresh=false] - Force fetching fresh data
   * @param {string} [specificSensor=null] - Optional specific sensor type to refresh ('temperature', 'humidity', 'motion')
   * @returns {Promise<Object>} Latest sensor reading data
   */
  static async getLatestReadings(forceFresh = false, specificSensor = null) {
    try {
      if (!this.isDataFresh('readings') || forceFresh) {
        console.log(`Fetching latest ${specificSensor || 'all'} sensor readings from API`);
        
        // Add cache buster to prevent caching
        const cacheBuster = `?_t=${Date.now()}`;
        let endpoint = '/sensors/readings';
        
        // If a specific sensor is requested, use a more targeted endpoint
        if (specificSensor && ['temperature', 'humidity', 'motion'].includes(specificSensor)) {
          endpoint = `/sensors/readings/${specificSensor}`;
        }
        
        const response = await apiService.get(endpoint + cacheBuster);
        
        if (response.data && response.data.data) {
          const data = response.data.data;
          console.log('API response data:', data);
          
          // Update timestamp for this data type
          this.updateTimestamp('readings');
          
          return {
            // Ensure values are numbers before formatting
            temperature: (typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature || 0)).toFixed(1),
            humidity: (typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity || 0)).toFixed(1),
            motion: Boolean(data.motion)
          };
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log('Using cached sensor readings');
        return this.getFromCache('readings');
      }
    } catch (error) {
      console.error('Error fetching sensor readings:', error);
      throw error;
    }
  }
  
  /**
   * Get sensor history data with cache management
   * @param {string} sensorType - Type of sensor (temperature, humidity, motion)
   * @param {string} timeRange - Time range for the history data (day, week)
   * @param {boolean} [forceFresh=false] - Force fetching fresh data
   * @returns {Promise<Array>} Sensor history data
   */
  static async getSensorHistory(sensorType, timeRange = 'day', forceFresh = false) {
    try {
      if (!this.isDataFresh('history', sensorType) || forceFresh) {
        console.log(`Fetching ${sensorType} ${timeRange} history data from API`);
        
        // Get data from API with the specific timeRange
        const limit = timeRange === 'day' ? 30 : 7; 
        const cacheBuster = `?timeRange=${timeRange}&limit=${limit}&_t=${Date.now()}`;
        const response = await apiService.get(`/sensors/history/${sensorType}${cacheBuster}`);
        
        if (response.data && response.data.data) {
          // Update timestamp for this history subtype
          this.updateTimestamp('history', sensorType);
          
          // Additional logging to debug
          console.log(`Received ${sensorType} ${timeRange} data:`, response.data);
          
          // Ensure data is properly formatted for charts
          const formattedData = response.data.data.map(item => ({
            timestamp: item.timestamp,
            value: typeof item.value === 'number' ? item.value : parseFloat(item.value || 0)
          }));
          
          return formattedData;
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log(`Using cached ${sensorType} history data for ${timeRange}`);
        return this.getFromCache('history', sensorType);
      }
    } catch (error) {
      console.error(`Error fetching ${sensorType} history:`, error);
      throw error;
    }
  }
  
  /**
   * Get recent alerts with cache management
   * @param {boolean} [forceFresh=false] - Force fetching fresh data
   * @returns {Promise<Array>} Recent alerts
   */
  static async getRecentAlerts(forceFresh = false) {
    try {
      if (!this.isDataFresh('alerts') || forceFresh) {
        // Fetch real alerts from API with cache buster
        const cacheBuster = `?_t=${Date.now()}`;
        const response = await apiService.get('/alerts/recent' + cacheBuster);
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Update timestamp for alerts
          this.updateTimestamp('alerts');
          
          return response.data.data.map(alert => ({
            id: alert.alert_id,
            type: alert.alert_type.toLowerCase(),
            message: alert.amessage,
            timestamp: alert.alerted_time,
            status: alert.status
          }));
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log('Using cached alerts data');
        return this.getFromCache('alerts');
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }
  
  /**
   * Get data from cache (placeholder for future implementation)
   * @param {string} dataType - Type of data (readings, history, alerts)
   * @param {string} [subType] - Subtype for history data
   * @returns {Object|Array} Cached data
   */
  static getFromCache(dataType, subType = null) {
    // This would be implemented with actual cache storage
    // For now, we'll just throw an error to force fresh data fetch
    throw new Error('Cache data unavailable');
  }
}

export default SensorController;
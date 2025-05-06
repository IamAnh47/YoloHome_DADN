import apiService from '../services/apiService';

class SensorController {
  // Cache storage for different data types
  static cache = {
    readings: null,
    history: {},
    alerts: [],
    lastAlertCheck: null
  };
  
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
        
          // Format data consistently
          const formattedData = {
            // Ensure values are numbers before formatting
          temperature: (typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature || 0)).toFixed(1),
          humidity: (typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity || 0)).toFixed(1),
          motion: Boolean(data.motion)
        };
          
          // Update cache and timestamp
          this.cache.readings = formattedData;
          this.updateTimestamp('readings');
          
          return formattedData;
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
          // Ensure data is properly formatted for charts
          const formattedData = response.data.data.map(item => ({
            timestamp: item.timestamp,
            value: typeof item.value === 'number' ? item.value : parseFloat(item.value || 0)
          }));
          
          // Store data in cache with the key that includes timeRange
          const cacheKey = `${sensorType}_${timeRange}`;
          if (!this.cache.history[cacheKey]) {
            this.cache.history[cacheKey] = [];
          }
          this.cache.history[cacheKey] = formattedData;
          
          // Update timestamp for this history subtype
          this.updateTimestamp('history', sensorType);
          
          // Additional logging to debug
          console.log(`Received ${sensorType} ${timeRange} data:`, response.data);
          
          return formattedData;
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log(`Using cached ${sensorType} history data for ${timeRange}`);
        return this.getFromCache('history', sensorType, timeRange);
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
        const cacheBuster = `?limit=3&_t=${Date.now()}`;
        const response = await apiService.get('/alerts/recent' + cacheBuster);
      
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const alertsData = response.data.data.map(alert => ({
            id: alert.alert_id,
            type: alert.alert_type.toLowerCase(),
            message: alert.amessage,
            timestamp: alert.alerted_time,
            status: alert.status
          }));
          
          // Update cache and timestamp
          this.cache.alerts = alertsData;
          this.updateTimestamp('alerts');
          
          return alertsData;
        } else {
          // If API returns invalid format or empty data, set empty array
          this.cache.alerts = [];
          this.updateTimestamp('alerts');
          return [];
        }
      } else {
        console.log('Using cached alerts data');
        return this.getFromCache('alerts');
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Return empty array instead of throwing error
      this.cache.alerts = [];
      this.updateTimestamp('alerts');
      return [];
    }
  }
  
  /**
   * Get data from cache
   * @param {string} dataType - Type of data (readings, history, alerts)
   * @param {string} [subType] - Subtype for history data (e.g., 'temperature')
   * @param {string} [timeRange] - Time range for history data (e.g., 'day', 'week')
   * @returns {Object|Array} Cached data
   */
  static getFromCache(dataType, subType = null, timeRange = 'day') {
    // Return from appropriate cache based on data type
    if (dataType === 'history' && subType) {
      const cacheKey = `${subType}_${timeRange}`;
      if (!this.cache.history[cacheKey]) {
        console.log(`No cached data for ${subType} ${timeRange}, returning empty array`);
        return [];
      }
      return this.cache.history[cacheKey];
    } else if (dataType === 'readings') {
      if (!this.cache.readings) {
        return {
          temperature: '0.0',
          humidity: '0.0',
          motion: false
        };
      }
      return this.cache.readings;
    } else if (dataType === 'alerts') {
      if (!this.cache.alerts || this.cache.alerts.length === 0) {
        return [];
      }
      return this.cache.alerts;
    }
    
    console.log(`Unknown cache type: ${dataType}, returning empty array`);
    return [];
  }

  /**
   * Get feed data from Adafruit IO by date
   * @param {string} feedType - Type of feed (temperature, humidity, motion, fan, light)
   * @param {string} [startDate=null] - Start date in YYYY-MM-DD format
   * @param {string} [endDate=null] - End date in YYYY-MM-DD format
   * @param {number} [limit=50] - Maximum number of records to return
   * @param {boolean} [forceFresh=false] - Force fetching fresh data
   * @param {string} [timeRange='day'] - Time range (day, week, month)
   * @returns {Promise<Array>} Feed data with timestamps
   */
  static async getFeedDataByDate(feedType, startDate = null, endDate = null, limit = 50, forceFresh = false, timeRange = 'day') {
    try {
      console.log(`Fetching ${feedType} feed data by date range for ${timeRange}`);
      
      // Build query params
      let params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (limit) params.push(`limit=${limit}`);
      
      // Add interval parameter for week view (24-hour history)
      // This triggers the 30-minute data aggregation on the backend
      if (timeRange === 'week') {
        params.push('interval=30min');
      }
      
      // Add cache buster to prevent caching
      params.push(`_t=${Date.now()}`);
      
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const response = await apiService.get(`/feeds/${feedType}/data${queryString}`);
      
      if (response.data && response.data.data) {
        // Format the data for charts
        const formattedData = response.data.data.map(item => ({
          id: item.id,
          timestamp: item.timestamp,
          value: item.value,
          feed: item.feed
        }));
        
        return formattedData;
      }
      
      console.warn('Invalid data format received from API');
      return [];
    } catch (error) {
      console.error(`Error fetching ${feedType} feed data:`, error);
      return [];
    }
  }

  /**
   * Get average feed data for the last minute
   * @param {string} feedType - Type of feed (temperature, humidity)
   * @returns {Promise<Object>} - Average feed data with count
   */
  static async getFeedAverageForLastMinute(feedType) {
    try {
      console.log(`Fetching ${feedType} average for last minute`);
      
      // Add cache buster
      const cacheBuster = `?_t=${Date.now()}`;
      const response = await apiService.get(`/feeds/${feedType}/average${cacheBuster}`);
      
      if (response.data && response.data.data) {
        return {
          average: response.data.data.average,
          count: response.data.data.count,
          fromTimestamp: response.data.data.fromTimestamp,
          toTimestamp: response.data.data.toTimestamp
        };
      }
      
      return {
        average: null,
        count: 0,
        fromTimestamp: null,
        toTimestamp: null
      };
    } catch (error) {
      console.error(`Error fetching ${feedType} average:`, error);
      return {
        average: null,
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Kiểm tra cảnh báo mới, phương thức này được gọi định kỳ
   * @returns {Promise<Array>} - Danh sách thông báo mới
   */
  static async checkNewAlerts() {
    try {
      this.cache.lastAlertCheck = Date.now();
      
      // Tìm các cảnh báo mới từ 1 phút trước
      const oneMinuteAgo = new Date();
      oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
      
      // Lấy cảnh báo gần đây nhất
      const alerts = await this.getRecentAlerts(true);
      
      // Lọc ra các cảnh báo mới trong 1 phút vừa qua
      const newAlerts = alerts.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime > oneMinuteAgo;
      });
      
      return newAlerts;
    } catch (error) {
      console.error('Error checking new alerts:', error);
      return [];
    }
  }
}

export default SensorController;
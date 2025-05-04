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
    history: 6000,  // 1 minute for history data
    alerts: 6000    // 30 seconds for alerts
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
   * @returns {Promise<Object>} Latest sensor reading data
   */
  static async getLatestReadings(forceFresh = false) {
    try {
      if (!this.isDataFresh('readings') || forceFresh) {
        console.log('Fetching latest sensor readings from API');
        
        // Add cache buster to prevent caching
        const cacheBuster = `?_t=${Date.now()}`;
        const response = await apiService.get('/sensors/readings' + cacheBuster);
        
        if (response.data && response.data.data) {
          const data = response.data.data;
          console.log('API response data:', data);
          
          // Update timestamp for this data type
          this.updateTimestamp('readings');
          
          return {
            // Đảm bảo là số trước khi định dạng
            temperature: (typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature || 0)).toFixed(1),
            humidity: (typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity || 0)).toFixed(1),
            motion: Boolean(data.motion)
          };
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log('Using cached sensor readings');
      }
      
      // Fallback to mock data
      return {
        temperature: '25.0',
        humidity: '60.0',
        motion: false
      };
    } catch (error) {
      console.error('Error fetching sensor readings:', error);
      // Fallback to mock data
      return {
        temperature: '25.0',
        humidity: '60.0',
        motion: false
      };
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
        // Lấy dữ liệu từ API
        const limit = timeRange === 'day' ? 24 : 168; // 24 hours or 7 days (168 hours)
        const cacheBuster = `?limit=${limit}&_t=${Date.now()}`;
        const response = await apiService.get(`/sensors/history/${sensorType}${cacheBuster}`);
        
        if (response.data && response.data.data) {
          // Update timestamp for this history subtype
          this.updateTimestamp('history', sensorType);
          return response.data.data;
        }
        
        console.warn('API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format received from API');
      } else {
        console.log(`Using cached ${sensorType} history data`);
      }
      
      // Fallback to mock data
      const now = new Date();
      const data = [];
      
      // Generate mock data points
      if (timeRange === 'day') {
        // 24 hours, one point per hour
        for (let i = 23; i >= 0; i--) {
          const timestamp = new Date(now);
          timestamp.setHours(now.getHours() - i);
          
          let value;
          if (sensorType === 'temperature') {
            value = (Math.random() * 5 + 25).toFixed(1); // 25-30 degrees
          } else if (sensorType === 'humidity') {
            value = (Math.random() * 10 + 60).toFixed(1); // 60-70%
          } else {
            value = Math.random() > 0.8 ? 1 : 0; // Motion detected randomly
          }
          
          data.push({
            timestamp: timestamp.toISOString(),
            value: parseFloat(value)
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${sensorType} history:`, error);
      return this.generateMockHistoryData(sensorType, timeRange);
    }
  }
  
  /**
   * Generate mock history data for testing
   * @param {string} sensorType - Type of sensor
   * @param {string} timeRange - Time range
   * @returns {Array} Generated mock data
   */
  static generateMockHistoryData(sensorType, timeRange = 'day') {
    const now = new Date();
    const data = [];
    const points = timeRange === 'day' ? 24 : 7;
    const interval = timeRange === 'day' ? 1 : 24; // hours
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      if (timeRange === 'day') {
        timestamp.setHours(now.getHours() - i);
      } else {
        timestamp.setDate(now.getDate() - i);
      }
      
      let value;
      if (sensorType === 'temperature') {
        // Create a realistic temperature pattern
        const baseTemp = 25;
        const timeOfDay = timeRange === 'day' ? (24 - i) % 24 : 12;
        const dayCycle = Math.sin((timeOfDay - 6) * Math.PI / 12) * 3; // Peak at noon
        value = (baseTemp + dayCycle + (Math.random() * 1.5 - 0.75)).toFixed(1);
      } else if (sensorType === 'humidity') {
        // Inverse relationship with temperature
        const timeOfDay = timeRange === 'day' ? (24 - i) % 24 : 12;
        const dayCycle = -Math.sin((timeOfDay - 6) * Math.PI / 12) * 10;
        value = (60 + dayCycle + (Math.random() * 5 - 2.5)).toFixed(1);
      } else {
        // Motion typically during day hours
        const hour = timestamp.getHours();
        const isActiveHour = hour >= 7 && hour <= 22;
        value = isActiveHour && Math.random() > 0.6 ? 1 : 0;
      }
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: sensorType === 'motion' ? value : parseFloat(value)
      });
    }
    
    return data;
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
        
        // Fallback to mock data if API fails or returns unexpected format
        return this.getMockAlerts();
      } else {
        console.log('Using cached alerts data');
        return this.getMockAlerts();
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Fallback to mock data
      return this.getMockAlerts();
    }
  }
  
  static getMockAlerts() {
    return [
      {
        id: 1,
        type: 'temperature',
        message: 'Temperature exceeded 30°C',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        status: 'active'
      },
      {
        id: 2,
        type: 'motion',
        message: 'Motion detected in living room',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        status: 'active'
      },
      {
        id: 3,
        type: 'humidity',
        message: 'Humidity level below 30%',
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        status: 'resolved'
      }
    ];
  }
}

export default SensorController;
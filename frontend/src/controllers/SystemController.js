import apiService from '../services/apiService';

class SystemController {
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
   * Lấy trạng thái toàn bộ hệ thống (thiết bị và cảm biến)
   * @param {boolean} [forceFresh=false] Force refresh data from server
   * @returns {Promise<Object>} Dữ liệu tất cả thiết bị và cảm biến
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
          // Update fetch time
          this.updateFetchTime();
          return response.data.data;
        }
        
        console.warn('Invalid API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid data format from API');
      } else {
        console.log('Using cached system status data');
      }
      
      // Fallback to sample data when disconnected
      return {
        devices: {
          fan: {
            status: false,
            device_id: 2,
            name: 'Smart Fan',
            location: 'Bedroom'
          },
          light: {
            status: false,
            device_id: 1,
            name: 'Smart Light',
            location: 'Living Room'
          }
        },
        sensors: {
          temperature: '25.0',
          humidity: '60.0',
          motion: false
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching system status:', error);
      
      // Trả về dữ liệu mẫu khi không kết nối được API
      return {
        devices: {
          fan: {
            status: false,
            device_id: 2,
            name: 'Smart Fan',
            location: 'Bedroom'
          },
          light: {
            status: false,
            device_id: 1,
            name: 'Smart Light',
            location: 'Living Room'
          }
        },
        sensors: {
          temperature: '25.0',
          humidity: '60.0',
          motion: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Điều khiển quạt
   * @param {boolean} turnOn - true để bật, false để tắt
   * @returns {Promise<Object>} Kết quả điều khiển
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
   * Điều khiển đèn
   * @param {boolean} turnOn - true để bật, false để tắt
   * @returns {Promise<Object>} Kết quả điều khiển
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
import apiService from '../services/apiService';

class SystemController {
  /**
   * Lấy trạng thái toàn bộ hệ thống (thiết bị và cảm biến)
   * @returns {Promise<Object>} Dữ liệu tất cả thiết bị và cảm biến
   */
  static async getSystemStatus() {
    try {
      console.log('Fetching system status from API');
      const response = await apiService.get('/status');
      
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      console.warn('Invalid API response structure:', JSON.stringify(response.data));
      throw new Error('Invalid data format from API');
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
      return response.data;
    } catch (error) {
      console.error(`Error controlling light (${turnOn ? 'ON' : 'OFF'}):`, error);
      throw error;
    }
  }
}

export default SystemController; 
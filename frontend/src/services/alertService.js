import apiService from './apiService';
import notificationService from './notificationService';

// Lớp dịch vụ quản lý cảnh báo
class AlertService {
  // Biến lưu thời gian kiểm tra cảnh báo cuối cùng
  lastAlertCheck = null;
  
  // Cache cho cảnh báo gần đây nhất
  latestAlertId = null;
  
  /**
   * Lấy danh sách cảnh báo gần đây nhất
   * @param {number} limit - Số lượng cảnh báo trả về
   * @returns {Promise<Array>} - Danh sách cảnh báo
   */
  async getRecentAlerts(limit = 10) {
    try {
      // Thêm cache buster để tránh caching
      const cacheBuster = `?_t=${Date.now()}&limit=${limit}`;
      const response = await apiService.get(`/alerts/recent${cacheBuster}`);
      
      if (response.data && response.data.data) {
        const alerts = response.data.data.map(alert => ({
          id: alert.alert_id,
          deviceId: alert.device_id,
          sensorId: alert.sensor_id,
          type: alert.alert_type,
          message: alert.amessage,
          timestamp: alert.alerted_time,
          status: alert.status
        }));
        
        return alerts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      return [];
    }
  }
  
  /**
   * Kiểm tra cảnh báo mới
   * @returns {Promise<Array>} - Danh sách cảnh báo mới
   */
  async checkNewAlerts() {
    try {
      // Nếu chưa có thời gian kiểm tra, lấy thời gian hiện tại trừ đi 1 phút
      if (!this.lastAlertCheck) {
        const oneMinuteAgo = new Date();
        oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
        this.lastAlertCheck = oneMinuteAgo;
      }
      
      // Lấy cảnh báo gần đây nhất
      const alerts = await this.getRecentAlerts(5);
      
      // Nếu không có cảnh báo
      if (!alerts.length) {
        this.lastAlertCheck = new Date();
        return [];
      }
      
      // Lọc ra cảnh báo mới (sau thời gian kiểm tra cuối cùng)
      const newAlerts = alerts.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return alertTime > this.lastAlertCheck;
      });
      
      // Cập nhật thời gian kiểm tra
      this.lastAlertCheck = new Date();
      
      return newAlerts;
    } catch (error) {
      console.error('Error checking new alerts:', error);
      this.lastAlertCheck = new Date();
      return [];
    }
  }
  
  /**
   * Hiển thị thông báo cho cảnh báo
   * @param {Object} alert - Thông tin cảnh báo
   */
  showAlertNotification(alert) {
    // Xác định loại thông báo dựa vào loại cảnh báo
    let type = 'info';
    if (alert.type.includes('High')) {
      type = 'warning';
    } else if (alert.type.includes('Low')) {
      type = 'info';
    }
    
    // Hiển thị thông báo
    notificationService.showAlert(alert.message, type);
  }
  
  /**
   * Kiểm tra và hiển thị cảnh báo mới
   * Phương thức này được gọi định kỳ
   */
  async checkAndNotifyNewAlerts() {
    try {
      const newAlerts = await this.checkNewAlerts();
      
      // Hiển thị thông báo cho mỗi cảnh báo mới
      newAlerts.forEach(alert => {
        this.showAlertNotification(alert);
      });
      
      return newAlerts;
    } catch (error) {
      console.error('Error checking and notifying new alerts:', error);
      return [];
    }
  }
}

// Singleton instance
const alertService = new AlertService();
export default alertService; 
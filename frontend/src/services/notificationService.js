import { Subject } from 'rxjs';

// Lớp dịch vụ quản lý thông báo
class NotificationService {
  // Subject để phát tín hiệu thông báo mới
  notifications = new Subject();
  
  // Phát một thông báo mới
  showNotification(notification) {
    this.notifications.next(notification);
  }
  
  // Theo dõi thông báo mới
  onNotification(callback) {
    return this.notifications.subscribe(callback);
  }
  
  // Hiển thị thông báo cảnh báo
  showAlert(message, type = 'info', duration = 10000) {
    this.showNotification({
      type,
      message,
      duration,
      timestamp: new Date()
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService; 
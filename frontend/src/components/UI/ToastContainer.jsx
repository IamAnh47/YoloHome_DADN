import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import notificationService from '../../services/notificationService';

const ToastContainer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Đăng ký sự kiện lắng nghe thông báo mới
    const subscription = notificationService.onNotification(notification => {
      // Thêm id cho mỗi thông báo để dễ quản lý
      const newNotification = {
        ...notification,
        id: Date.now()
      };
      
      // Thêm thông báo mới vào danh sách
      setNotifications(prev => [...prev, newNotification]);
    });

    // Hủy đăng ký khi component unmount
    return () => subscription.unsubscribe();
  }, []);

  // Xóa thông báo khỏi danh sách
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <Toast 
          key={notification.id} 
          notification={notification} 
          onClose={() => removeNotification(notification.id)} 
        />
      ))}
    </div>
  );
};

export default ToastContainer; 
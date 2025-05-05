import React, { useState, useEffect } from 'react';
import './Toast.css';

const Toast = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Tự động đóng thông báo sau khoảng thời gian nhất định
    const timer = setTimeout(() => {
      setVisible(false);
      
      // Đợi hiệu ứng fade-out kết thúc rồi gọi onClose
      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    }, notification.duration || 10000);
    
    return () => clearTimeout(timer);
  }, [notification, onClose]);
  
  // Xác định biểu tượng dựa vào loại thông báo
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <i className="fas fa-check-circle"></i>;
      case 'error':
      case 'danger':
        return <i className="fas fa-exclamation-circle"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle"></i>;
      case 'info':
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };
  
  // Xử lý đóng thông báo khi nhấp vào nút đóng
  const handleClose = () => {
    setVisible(false);
    
    // Đợi hiệu ứng fade-out kết thúc rồi gọi onClose
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };
  
  return (
    <div className={`toast toast-${notification.type} ${visible ? 'show' : 'hide'}`}>
      <div className="toast-icon">
        {getIcon()}
      </div>
      <div className="toast-content">
        <p>{notification.message}</p>
      </div>
      <button className="toast-close" onClick={handleClose}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Toast; 
import React, { useState, useEffect } from 'react';
import DeviceController from '../../controllers/DeviceController';
import './DeviceScheduleDisplay.css';

const DeviceScheduleDisplay = () => {
  const [schedules, setSchedules] = useState({
    fan: [],
    light: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true);
      try {
        // Lấy lịch trình từ cả quạt và đèn
        const [fanSchedules, lightSchedules] = await Promise.all([
          DeviceController.getDeviceSchedules('fan'),
          DeviceController.getDeviceSchedules('light')
        ]);
        
        setSchedules({
          fan: fanSchedules || [],
          light: lightSchedules || []
        });
      } catch (error) {
        console.error('Error loading device schedules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSchedules();
    
    // Cập nhật định kỳ mỗi 30 giây
    const interval = setInterval(loadSchedules, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format thời gian từ ISO string
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Kiểm tra xem lịch trình có hoạt động không
  const isScheduleActive = (schedule) => {
    if (schedule.type === 'countdown') {
      return true;
    }
    
    if (schedule.status === 'completed' || schedule.status === 'canceled' || schedule.executed === true) {
      return false;
    }
    
    if (schedule.type === 'single' || schedule.schedule_type === 'once') {
      const time = schedule.scheduledTime || schedule.start_time;
      return new Date(time) > new Date();
    } else {
      const endTime = schedule.endTime || schedule.end_time;
      return new Date(endTime) > new Date();
    }
  };

  // Format trạng thái lịch trình
  const getScheduleStatusText = (schedule) => {
    if (schedule.type === 'countdown') {
      return 'Đếm ngược';
    }
    
    if (schedule.status === 'completed' || schedule.executed === true) return 'Đã hoàn thành';
    if (schedule.status === 'canceled') return 'Đã hủy';
    
    if (schedule.type === 'single' || schedule.schedule_type === 'once') {
      const time = schedule.scheduledTime || schedule.start_time;
      return new Date(time) > new Date() ? 'Chờ thực hiện' : 'Đã hết hạn';
    } else {
      const startTime = schedule.startTime || schedule.start_time;
      const endTime = schedule.endTime || schedule.end_time;
      
      if (new Date(endTime) < new Date()) {
        return 'Đã hết hạn';
      } else if (new Date(startTime) > new Date()) {
        return 'Chờ thực hiện';
      } else {
        return 'Đang hoạt động';
      }
    }
  };

  // Filter các lịch trình chỉ lấy lịch trình đang hoạt động
  const getActiveSchedules = (deviceSchedules) => {
    return deviceSchedules.filter(isScheduleActive);
  };

  // Lấy tất cả lịch trình đang hoạt động
  const allActiveSchedules = [
    ...getActiveSchedules(schedules.fan).map(s => ({ ...s, deviceType: 'fan' })),
    ...getActiveSchedules(schedules.light).map(s => ({ ...s, deviceType: 'light' }))
  ];

  // Sort theo thời gian gần nhất
  allActiveSchedules.sort((a, b) => {
    const timeA = new Date(a.start_time || a.scheduledTime);
    const timeB = new Date(b.start_time || b.scheduledTime);
    return timeA - timeB;
  });
  
  // Lấy thời gian hiển thị từ lịch trình
  const getScheduleTimeDisplay = (schedule) => {
    if (schedule.type === 'countdown') {
      return `Bắt đầu: ${formatTime(schedule.startTime)}, Kết thúc: ${formatTime(schedule.scheduledTime)}`;
    }
    
    if (schedule.type === 'single' || schedule.schedule_type === 'once') {
      const time = schedule.scheduledTime || schedule.start_time;
      return formatTime(time);
    } else {
      const startTime = schedule.startTime || schedule.start_time;
      const endTime = schedule.endTime || schedule.end_time;
      return `Bắt đầu: ${formatTime(startTime)}, Kết thúc: ${formatTime(endTime)}`;
    }
  };

  // Lấy tên thiết bị từ loại
  const getDeviceName = (deviceType) => {
    return deviceType === 'fan' ? 'Quạt' : 'Đèn';
  };

  // Lấy action hiển thị
  const getActionText = (schedule) => {
    if (schedule.type === 'range' || schedule.schedule_type === 'range') {
      return 'Bật và tắt';
    }
    return schedule.action === 'on' ? 'Bật' : 'Tắt';
  };
  
  if (loading) {
    return <div className="loading">Đang tải lịch trình...</div>;
  }

  return (
    <div className="device-schedule-display">
      <h2>Lịch trình thiết bị đang hoạt động</h2>
      
      {allActiveSchedules.length === 0 ? (
        <p className="no-schedules">Không có lịch trình nào đang hoạt động</p>
      ) : (
        <ul className="schedule-list">
          {allActiveSchedules.slice(0, 5).map((schedule, index) => (
            <li key={index} className="schedule-item">
              <div className="schedule-device-icon">
                <i className={`fas ${schedule.deviceType === 'fan' ? 'fa-fan' : 'fa-lightbulb'}`}></i>
              </div>
              <div className="schedule-details">
                <div className="schedule-title">
                  {getDeviceName(schedule.deviceType)} - {getActionText(schedule)}
                </div>
                <div className="schedule-time">
                  {getScheduleTimeDisplay(schedule)}
                </div>
                <div className={`schedule-status ${getScheduleStatusText(schedule).replace(/\s+/g, '-').toLowerCase()}`}>
                  {getScheduleStatusText(schedule)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="schedule-footer">
        <a href="/devices" className="view-all-schedules">Xem tất cả lịch trình</a>
      </div>
    </div>
  );
};

export default DeviceScheduleDisplay; 
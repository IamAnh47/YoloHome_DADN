import React, { useState, useEffect } from 'react';
import DeviceController from '../../controllers/DeviceController';
import notificationService from '../../services/notificationService';
import './DeviceScheduling.css';

const DeviceScheduling = ({ deviceType, deviceName }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState('single'); // 'single' or 'range'
  const [singleSchedule, setSingleSchedule] = useState({
    action: 'on',
    time: ''
  });
  const [rangeSchedule, setRangeSchedule] = useState({
    startTime: '',
    endTime: ''
  });
  
  // Format datetime-local value to ISO string for API
  const formatDateTimeForApi = (dateTimeValue) => {
    return new Date(dateTimeValue).toISOString();
  };
  
  // Format ISO string from API to datetime-local value
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  };

  // Format datetime for display
  const formatDateTimeForDisplay = (isoString) => {
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
  
  // Load schedules when component mounts
  useEffect(() => {
    loadSchedules();
  }, [deviceType]);
  
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const deviceSchedules = await DeviceController.getDeviceSchedules(deviceType);
      setSchedules(deviceSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      notificationService.showAlert(`Không thể tải lịch trình cho ${deviceName}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSingleScheduleChange = (e) => {
    const { name, value } = e.target;
    setSingleSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleRangeScheduleChange = (e) => {
    const { name, value } = e.target;
    setRangeSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateSchedule = () => {
    if (scheduleType === 'single') {
      if (!singleSchedule.time) {
        notificationService.showAlert('Vui lòng chọn thời gian hẹn giờ', 'warning');
        return false;
      }
      
      // Check if time is in the past
      if (new Date(singleSchedule.time) <= new Date()) {
        notificationService.showAlert('Thời gian hẹn giờ phải ở tương lai', 'warning');
        return false;
      }
    } else {
      if (!rangeSchedule.startTime || !rangeSchedule.endTime) {
        notificationService.showAlert('Vui lòng chọn thời gian bắt đầu và kết thúc', 'warning');
        return false;
      }
      
      // Check if start time is after end time
      if (new Date(rangeSchedule.startTime) >= new Date(rangeSchedule.endTime)) {
        notificationService.showAlert('Thời gian bắt đầu phải trước thời gian kết thúc', 'warning');
        return false;
      }
      
      // Check if start time is in the past
      if (new Date(rangeSchedule.startTime) <= new Date()) {
        notificationService.showAlert('Thời gian bắt đầu phải ở tương lai', 'warning');
        return false;
      }
    }
    
    return true;
  };
  
  const handleCreateSchedule = async () => {
    if (!validateSchedule()) return;
    
    setLoading(true);
    try {
      if (scheduleType === 'single') {
        await DeviceController.scheduleDevice(
          deviceType,
          singleSchedule.action,
          formatDateTimeForApi(singleSchedule.time)
        );
        notificationService.showAlert(
          `Đã hẹn giờ ${singleSchedule.action === 'on' ? 'bật' : 'tắt'} ${deviceName} vào ${formatDateTimeForDisplay(singleSchedule.time)}`,
          'success'
        );
        // Reset form
        setSingleSchedule({ action: 'on', time: '' });
      } else {
        await DeviceController.scheduleDeviceRange(
          deviceType,
          formatDateTimeForApi(rangeSchedule.startTime),
          formatDateTimeForApi(rangeSchedule.endTime)
        );
        notificationService.showAlert(
          `Đã hẹn giờ ${deviceName} hoạt động từ ${formatDateTimeForDisplay(rangeSchedule.startTime)} đến ${formatDateTimeForDisplay(rangeSchedule.endTime)}`,
          'success'
        );
        // Reset form
        setRangeSchedule({ startTime: '', endTime: '' });
      }
      
      // Reload schedules
      loadSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      notificationService.showAlert(`Không thể tạo lịch trình: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelSchedule = async (scheduleId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch trình này?')) return;
    
    setLoading(true);
    try {
      await DeviceController.cancelSchedule(scheduleId);
      notificationService.showAlert('Đã hủy lịch trình thành công', 'success');
      
      // Remove from local state
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error canceling schedule:', error);
      notificationService.showAlert(`Không thể hủy lịch trình: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if a schedule is expired/completed
  const isScheduleActive = (schedule) => {
    if (schedule.status === 'completed' || schedule.status === 'canceled') {
      return false;
    }
    
    if (schedule.type === 'single') {
      return new Date(schedule.scheduledTime) > new Date();
    } else {
      return new Date(schedule.endTime) > new Date();
    }
  };
  
  // Get status text based on schedule status and times
  const getScheduleStatusText = (schedule) => {
    if (schedule.status === 'completed') return 'Đã hoàn thành';
    if (schedule.status === 'canceled') return 'Đã hủy';
    if (schedule.status === 'pending') {
      if (schedule.type === 'single') {
        return new Date(schedule.scheduledTime) > new Date() ? 'Chờ thực hiện' : 'Đã hết hạn';
      } else {
        if (new Date(schedule.endTime) < new Date()) {
          return 'Đã hết hạn';
        } else if (new Date(schedule.startTime) > new Date()) {
          return 'Chờ thực hiện';
        } else {
          return 'Đang hoạt động';
        }
      }
    }
    return schedule.status;
  };
  
  return (
    <div className="device-scheduling">
      <h3>Hẹn giờ cho {deviceName}</h3>
      
      <div className="scheduling-form">
        <div className="schedule-type-selector">
          <button 
            className={`schedule-type-btn ${scheduleType === 'single' ? 'active' : ''}`}
            onClick={() => setScheduleType('single')}
          >
            Hẹn giờ đơn lẻ
          </button>
          <button 
            className={`schedule-type-btn ${scheduleType === 'range' ? 'active' : ''}`}
            onClick={() => setScheduleType('range')}
          >
            Hẹn giờ hoạt động
          </button>
        </div>
        
        {scheduleType === 'single' ? (
          <div className="single-schedule-form">
            <div className="form-group">
              <label>Hành động:</label>
              <select 
                name="action"
                value={singleSchedule.action}
                onChange={handleSingleScheduleChange}
              >
                <option value="on">Bật</option>
                <option value="off">Tắt</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Thời gian:</label>
              <input 
                type="datetime-local"
                name="time"
                value={singleSchedule.time}
                onChange={handleSingleScheduleChange}
              />
            </div>
          </div>
        ) : (
          <div className="range-schedule-form">
            <div className="form-group">
              <label>Thời gian bắt đầu:</label>
              <input 
                type="datetime-local"
                name="startTime"
                value={rangeSchedule.startTime}
                onChange={handleRangeScheduleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Thời gian kết thúc:</label>
              <input 
                type="datetime-local"
                name="endTime"
                value={rangeSchedule.endTime}
                onChange={handleRangeScheduleChange}
              />
            </div>
          </div>
        )}
        
        <button 
          className="create-schedule-btn"
          onClick={handleCreateSchedule}
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Tạo lịch trình'}
        </button>
      </div>
      
      <div className="schedules-list">
        <h4>Danh sách lịch trình</h4>
        
        {loading && schedules.length === 0 ? (
          <p className="loading-text">Đang tải lịch trình...</p>
        ) : schedules.length === 0 ? (
          <p className="no-schedules">Không có lịch trình nào</p>
        ) : (
          <table className="schedules-table">
            <thead>
              <tr>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <tr 
                  key={schedule.id}
                  className={isScheduleActive(schedule) ? 'active-schedule' : 'inactive-schedule'}
                >
                  <td>
                    {schedule.type === 'single' 
                      ? `${schedule.action === 'on' ? 'Bật' : 'Tắt'} thiết bị` 
                      : 'Khoảng thời gian'}
                  </td>
                  <td>
                    {schedule.type === 'single' 
                      ? formatDateTimeForDisplay(schedule.scheduledTime)
                      : (
                        <>
                          <div>Bắt đầu: {formatDateTimeForDisplay(schedule.startTime)}</div>
                          <div>Kết thúc: {formatDateTimeForDisplay(schedule.endTime)}</div>
                        </>
                      )}
                  </td>
                  <td>{getScheduleStatusText(schedule)}</td>
                  <td>
                    {isScheduleActive(schedule) && (
                      <button 
                        className="cancel-schedule-btn"
                        onClick={() => handleCancelSchedule(schedule.id)}
                        disabled={loading}
                      >
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DeviceScheduling; 
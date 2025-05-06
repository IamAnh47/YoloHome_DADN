import React, { useState, useEffect, useCallback } from 'react';
import DeviceController from '../../controllers/DeviceController';
import notificationService from '../../services/notificationService';
import CountdownStatus from './CountdownStatus';
import './DeviceScheduling.css';

const DeviceScheduling = ({ deviceType, deviceName }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState('single'); // 'single', 'range', or 'countdown'
  const [singleSchedule, setSingleSchedule] = useState({
    action: 'on',
    time: ''
  });
  const [rangeSchedule, setRangeSchedule] = useState({
    startTime: '',
    endTime: ''
  });
  const [countdownSchedule, setCountdownSchedule] = useState({
    action: 'off',
    seconds: 60
  });
  const [countdownActive, setCountdownActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  // Store active countdown info
  const [activeCountdown, setActiveCountdown] = useState(null);
  
  // Format datetime-local value to ISO string for API
  const formatDateTimeForApi = (dateTimeValue) => {
    return new Date(dateTimeValue).toISOString();
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
  
  // Load schedules function wrapped in useCallback to avoid dependency issues
  const loadSchedules = useCallback(async () => {
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
  }, [deviceType, deviceName]);
  
  // Load schedules when component mounts
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);
  
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

  const handleCountdownScheduleChange = (e) => {
    const { name, value } = e.target;
    setCountdownSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const setCountdownPreset = (seconds) => {
    setCountdownSchedule(prev => ({
      ...prev,
      seconds
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
    } else if (scheduleType === 'range') {
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
    } else if (scheduleType === 'countdown') {
      if (!countdownSchedule.seconds || countdownSchedule.seconds <= 0) {
        notificationService.showAlert('Vui lòng nhập thời gian hợp lệ', 'warning');
        return false;
      }
    }
    
    return true;
  };
  
  const startCountdown = async () => {
    if (countdownSchedule.seconds <= 0) {
      notificationService.showAlert('Vui lòng nhập thời gian hợp lệ', 'warning');
      return;
    }

    setCountdownActive(true);
    setRemainingTime(countdownSchedule.seconds);

    // Create a future timestamp for the scheduled action
    const actionTime = new Date(Date.now() + countdownSchedule.seconds * 1000).toISOString();
    const startTime = new Date().toISOString();

    try {
      // Create local countdown object first
      const newCountdown = {
        id: 'countdown-' + Date.now(),
        type: 'countdown',
        action: countdownSchedule.action,
        startTime: startTime,
        scheduledTime: actionTime,
        remainingSeconds: countdownSchedule.seconds,
        device_type: deviceType
      };
      
      // Add to schedules list immediately for visual feedback
      setActiveCountdown(newCountdown);
      setSchedules(prev => [newCountdown, ...prev]);
      
      // Then send to backend
      await DeviceController.scheduleDevice(
        deviceType,
        countdownSchedule.action,
        actionTime
      );
      
      notificationService.showAlert(
        `Hẹn giờ ${countdownSchedule.action === 'on' ? 'bật' : 'tắt'} ${deviceName} sau ${countdownSchedule.seconds} giây`,
        'success'
      );
      
      // Start the countdown timer
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCountdownActive(false);
            setActiveCountdown(null);
            
            // Reload schedules to refresh the list after countdown completes
            setTimeout(() => loadSchedules(), 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup interval on component unmount
      return () => clearInterval(timer);
    } catch (error) {
      console.error('Error creating countdown:', error);
      notificationService.showAlert(`Không thể tạo hẹn giờ: ${error.message}`, 'error');
      setCountdownActive(false);
      setActiveCountdown(null);
      
      // Remove the local countdown from the list if API call fails
      setSchedules(prev => prev.filter(s => s.id !== 'countdown-' + Date.now()));
    }
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
      } else if (scheduleType === 'range') {
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
    
    // Check if it's a local countdown schedule
    if (String(scheduleId).startsWith('countdown-')) {
      setActiveCountdown(null);
      setCountdownActive(false);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      return;
    }
    
    setLoading(true);
    try {
      await DeviceController.cancelSchedule(scheduleId);
      notificationService.showAlert('Đã hủy lịch trình thành công', 'success');
      
      // Remove from local state
      setSchedules(prev => prev.filter(s => s.id !== scheduleId && s.schedule_id !== scheduleId));
    } catch (error) {
      console.error('Error canceling schedule:', error);
      notificationService.showAlert(`Không thể hủy lịch trình: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if a schedule is expired/completed
  const isScheduleActive = (schedule) => {
    // Always show countdown schedules as active
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
  
  // Get status text based on schedule status and times
  const getScheduleStatusText = (schedule) => {
    // For countdown schedules
    if (schedule.type === 'countdown') {
      return (
        <CountdownStatus 
          initialSeconds={schedule.remainingSeconds} 
          onComplete={() => {
            // Remove this countdown from the list when complete
            setSchedules(prevSchedules => 
              prevSchedules.filter(s => s.id !== schedule.id)
            );
          }} 
        />
      );
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

  // Format seconds to mm:ss
  const formatSeconds = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get scheduled time display from schedule object
  const getScheduleTimeDisplay = (schedule) => {
    // For countdown schedules
    if (schedule.type === 'countdown') {
      return (
        <>
          <div>Bắt đầu: {formatDateTimeForDisplay(schedule.startTime)}</div>
          <div>Kết thúc: {formatDateTimeForDisplay(schedule.scheduledTime)}</div>
        </>
      );
    }
    
    if (schedule.type === 'single' || schedule.schedule_type === 'once') {
      const time = schedule.scheduledTime || schedule.start_time;
      return formatDateTimeForDisplay(time);
    } else {
      const startTime = schedule.startTime || schedule.start_time;
      const endTime = schedule.endTime || schedule.end_time;
      return (
        <>
          <div>Bắt đầu: {formatDateTimeForDisplay(startTime)}</div>
          <div>Kết thúc: {formatDateTimeForDisplay(endTime)}</div>
        </>
      );
    }
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
          <button 
            className={`schedule-type-btn ${scheduleType === 'countdown' ? 'active' : ''}`}
            onClick={() => setScheduleType('countdown')}
          >
            Hẹn giờ đếm ngược
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
            
            <button 
              className="create-schedule-btn"
              onClick={handleCreateSchedule}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Tạo lịch trình'}
            </button>
          </div>
        ) : scheduleType === 'range' ? (
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
            
            <button 
              className="create-schedule-btn"
              onClick={handleCreateSchedule}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Tạo lịch trình'}
            </button>
          </div>
        ) : (
          <div className="countdown-schedule-form">
            <div className="form-group">
              <label>Hành động:</label>
              <select 
                name="action"
                value={countdownSchedule.action}
                onChange={handleCountdownScheduleChange}
              >
                <option value="on">Bật</option>
                <option value="off">Tắt</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Thời gian (giây):</label>
              <input 
                type="number"
                name="seconds"
                value={countdownSchedule.seconds}
                onChange={handleCountdownScheduleChange}
                disabled={countdownActive}
                min="1"
              />
              
              <div className="countdown-presets">
                <button 
                  onClick={() => setCountdownPreset(10)}
                  disabled={countdownActive}
                  className="preset-btn"
                >
                  10s
                </button>
                <button 
                  onClick={() => setCountdownPreset(30)}
                  disabled={countdownActive}
                  className="preset-btn"
                >
                  30s
                </button>
                <button 
                  onClick={() => setCountdownPreset(60)}
                  disabled={countdownActive}
                  className="preset-btn"
                >
                  1m
                </button>
                <button 
                  onClick={() => setCountdownPreset(300)}
                  disabled={countdownActive}
                  className="preset-btn"
                >
                  5m
                </button>
              </div>
            </div>
            
            {countdownActive ? (
              <div className="countdown-display">
                <div className="countdown-time">{formatSeconds(remainingTime)}</div>
                <div className="countdown-label">
                  {countdownSchedule.action === 'on' ? 'Bật' : 'Tắt'} sau
                </div>
              </div>
            ) : (
              <button 
                className="create-schedule-btn"
                onClick={startCountdown}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Bắt đầu đếm ngược'}
              </button>
            )}
          </div>
        )}
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
                  key={schedule.id || schedule.schedule_id}
                  className={isScheduleActive(schedule) ? 'active-schedule' : 'inactive-schedule'}
                >
                  <td>
                    {schedule.type === 'countdown' 
                      ? `Đếm ngược ${schedule.action === 'on' ? 'bật' : 'tắt'}`
                      : (schedule.type === 'single' || schedule.schedule_type === 'once')
                        ? `${schedule.action === 'on' ? 'Bật' : 'Tắt'} thiết bị` 
                        : 'Khoảng thời gian'}
                  </td>
                  <td>
                    {getScheduleTimeDisplay(schedule)}
                  </td>
                  <td>{getScheduleStatusText(schedule)}</td>
                  <td>
                    {isScheduleActive(schedule) && (
                      <button 
                        className="cancel-schedule-btn"
                        onClick={() => handleCancelSchedule(schedule.id || schedule.schedule_id)}
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
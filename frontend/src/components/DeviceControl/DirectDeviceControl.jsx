import React, { useState, useEffect } from 'react';
import SystemController from '../../controllers/SystemController';
import './DirectDeviceControl.css';

const DirectDeviceControl = () => {
  const [deviceStatus, setDeviceStatus] = useState({
    fan: { status: false },
    light: { status: false }
  });
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState({
    fan: false,
    light: false
  });

  // Lấy trạng thái thiết bị khi component được tải
  useEffect(() => {
    const loadDeviceStatus = async () => {
      try {
        const systemStatus = await SystemController.getSystemStatus();
        setDeviceStatus(systemStatus.devices);
      } catch (error) {
        console.error('Error loading device status:', error);
        showFeedback('Failed to load device status', 'error');
      }
    };
    
    loadDeviceStatus();
    
    // Cập nhật trạng thái thiết bị mỗi 10 giây
    const interval = setInterval(loadDeviceStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Hiển thị thông báo và tự động ẩn sau 3 giây
  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 3000);
  };

  // Điều khiển quạt
  const handleFanControl = async (action) => {
    setLoading(prev => ({ ...prev, fan: true }));
    try {
      const turnOn = action === 'on';
      await SystemController.controlFan(turnOn);
      
      // Cập nhật trạng thái ngay lập tức trên UI
      setDeviceStatus(prev => ({
        ...prev,
        fan: {
          ...prev.fan,
          status: turnOn
        }
      }));
      
      showFeedback(`Fan turned ${action} successfully`);
    } catch (error) {
      showFeedback(`Failed to control fan: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, fan: false }));
    }
  };

  // Điều khiển đèn
  const handleLightControl = async (action) => {
    setLoading(prev => ({ ...prev, light: true }));
    try {
      const turnOn = action === 'on';
      await SystemController.controlLight(turnOn);
      
      // Cập nhật trạng thái ngay lập tức trên UI
      setDeviceStatus(prev => ({
        ...prev,
        light: {
          ...prev.light, 
          status: turnOn
        }
      }));
      
      showFeedback(`Light turned ${action} successfully`);
    } catch (error) {
      showFeedback(`Failed to control light: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, light: false }));
    }
  };

  return (
    <div className="direct-device-control">
      <h2>Smart Control Panel</h2>
      
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      <div className="control-cards">
        {/* Fan Control Card */}
        <div className="control-card">
          <div className={`device-icon ${deviceStatus.fan.status ? 'active' : ''}`}>
            <i className="fas fa-fan"></i>
          </div>
          <h3>Fan Control</h3>
          <div className="status-indicator">
            Status: <span className={deviceStatus.fan.status ? 'status-on' : 'status-off'}>
              {deviceStatus.fan.status ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="control-buttons">
            <button 
              className={`control-button on ${deviceStatus.fan.status ? 'active' : ''}`}
              onClick={() => handleFanControl('on')}
              disabled={loading.fan || deviceStatus.fan.status}
            >
              {loading.fan ? 'Processing...' : 'Turn On'}
            </button>
            <button 
              className={`control-button off ${!deviceStatus.fan.status ? 'active' : ''}`}
              onClick={() => handleFanControl('off')}
              disabled={loading.fan || !deviceStatus.fan.status}
            >
              {loading.fan ? 'Processing...' : 'Turn Off'}
            </button>
          </div>
        </div>
        
        {/* Light Control Card */}
        <div className="control-card">
          <div className={`device-icon ${deviceStatus.light.status ? 'active' : ''}`}>
            <i className="fas fa-lightbulb"></i>
          </div>
          <h3>Light Control</h3>
          <div className="status-indicator">
            Status: <span className={deviceStatus.light.status ? 'status-on' : 'status-off'}>
              {deviceStatus.light.status ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="control-buttons">
            <button 
              className={`control-button on ${deviceStatus.light.status ? 'active' : ''}`}
              onClick={() => handleLightControl('on')}
              disabled={loading.light || deviceStatus.light.status}
            >
              {loading.light ? 'Processing...' : 'Turn On'}
            </button>
            <button 
              className={`control-button off ${!deviceStatus.light.status ? 'active' : ''}`}
              onClick={() => handleLightControl('off')}
              disabled={loading.light || !deviceStatus.light.status}
            >
              {loading.light ? 'Processing...' : 'Turn Off'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="automation-info">
        <h3>Automation Rules</h3>
        <ul className="rules-list">
          <li>
            <i className="fas fa-thermometer-half"></i>
            <span>Fan turns ON automatically when temperature exceeds 30°C</span>
          </li>
          <li>
            <i className="fas fa-lightbulb"></i>
            <span>Light turns ON automatically when motion is detected</span>
          </li>
          <li>
            <i className="fas fa-moon"></i>
            <span>Light turns OFF automatically at 11:00 PM</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DirectDeviceControl; 
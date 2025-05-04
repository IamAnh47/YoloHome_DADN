import React, { useState, useEffect } from 'react';
import SystemController from '../../controllers/SystemController';
import DeviceController from '../../controllers/DeviceController';
import './DirectDeviceControl.css';

const DirectDeviceControl = () => {
  const [deviceStatus, setDeviceStatus] = useState({
    fan: { status: false },
    light: { status: false }
  });
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Load device status and registered devices when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load system status
        const systemStatus = await SystemController.getSystemStatus();
        setDeviceStatus(systemStatus.devices);
        
        // Load registered devices
        const devices = await DeviceController.getAllDevices();
        setRegisteredDevices(devices);
      } catch (error) {
        console.error('Error loading data:', error);
        showFeedback('Failed to load device information', 'error');
      }
    };
    
    loadData();
    
    // Update device status every 5 seconds
    const interval = setInterval(loadData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Show feedback message and auto-hide after 3 seconds
  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 3000);
  };

  // Toggle device status
  const handleToggleDevice = async (deviceId, deviceType, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // Update device status through API
      await DeviceController.updateDeviceStatus(deviceId, newStatus);
      
      // Update the device in the local state
      setRegisteredDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === deviceId 
            ? { ...device, status: newStatus } 
            : device
        )
      );
      
      showFeedback(`${deviceType} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      showFeedback(`Failed to control device: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get icon based on device type
  const getDeviceIcon = (type) => {
    const icons = {
      fan: 'fas fa-fan',
      light: 'fas fa-lightbulb',
      lock: 'fas fa-lock',
      alarm: 'fas fa-bell',
      default: 'fas fa-plug'
    };
    
    return icons[type] || icons.default;
  };

  return (
    <div className="direct-device-control">
      <h2>Smart Control Panel</h2>
      
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      <div className="registered-devices-panel">
        <h3>Registered Devices</h3>
        
        {registeredDevices.length > 0 ? (
          <div className="devices-grid">
            {registeredDevices.map(device => (
              <div key={device.id} className="device-item">
                <div className={`device-icon ${device.status === 'active' ? 'active' : ''}`}>
                  <i className={getDeviceIcon(device.type)}></i>
                </div>
                <div className="device-details">
                  <h4>{device.name}</h4>
                  <div className="device-location">{device.location}</div>
                  <div className="status-indicator">
                    <span className={device.status === 'active' ? 'status-on' : 'status-off'}>
                      {device.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
                <div className="device-actions">
                  <button 
                    className={`toggle-button ${device.status === 'active' ? 'on' : 'off'}`}
                    onClick={() => handleToggleDevice(device.id, device.type, device.status)}
                    disabled={loading}
                  >
                    {device.status === 'active' ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-devices-message">
            No registered devices found.
          </div>
        )}
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
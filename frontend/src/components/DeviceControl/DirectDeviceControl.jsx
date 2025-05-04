import React, { useState, useEffect } from 'react';
import SystemController from '../../controllers/SystemController';
import DeviceController from '../../controllers/DeviceController';
import './DirectDeviceControl.css';

const DirectDeviceControl = () => {
  const [deviceStatus, setDeviceStatus] = useState({
    fan: { status: false },
    light: { status: false }
  });
  const [devices, setDevices] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState({
    fan: false,
    light: false
  });
  const [error, setError] = useState(null);

  // Load device status and registered devices when component mounts
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
    
    const loadDevices = async () => {
      try {
        const result = await DeviceController.getAllDevices();
        setDevices(result);
      } catch (err) {
        setError('Failed to load devices. Please try again.');
        console.error('Error loading devices:', err);
      }
    };
    
    loadDeviceStatus();
    loadDevices();
    
    // Update device status every 5 seconds
    const interval = setInterval(() => {
      loadDeviceStatus();
      loadDevices();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Show feedback and auto-hide after 3 seconds
  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 3000);
  };

  // Fan control
  const handleFanControl = async (action) => {
    setLoading(prev => ({ ...prev, fan: true }));
    try {
      const turnOn = action === 'on';
      await SystemController.controlFan(turnOn);
      
      // Update UI state immediately
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

  // Light control
  const handleLightControl = async (action) => {
    setLoading(prev => ({ ...prev, light: true }));
    try {
      const turnOn = action === 'on';
      await SystemController.controlLight(turnOn);
      
      // Update UI state immediately
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

  const handleToggleDevice = async (deviceId) => {
    try {
      const deviceIndex = devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) return;
      
      const device = devices[deviceIndex];
      const newStatus = device.status === 'active' ? 'inactive' : 'active';
      
      // Update UI immediately for better user experience
      const updatedDevices = [...devices];
      updatedDevices[deviceIndex] = { 
        ...device, 
        status: newStatus,
        lastUpdated: new Date().toISOString()
      };
      setDevices(updatedDevices);
      
      // Call API to update device status
      await DeviceController.updateDeviceStatus(deviceId, newStatus);
    } catch (err) {
      setError('Failed to control device. Please try again.');
      console.error('Error controlling device:', err);
    }
  };

  const deviceTypeIcons = {
    light: 'fas fa-lightbulb',
    fan: 'fas fa-fan',
    lock: 'fas fa-lock',
    alarm: 'fas fa-bell'
  };

  return (
    <div className="direct-device-control">
      <h2>Smart Control Panel</h2>
      
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
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
      
      {/* Registered Devices */}
      <div className="registered-devices">
        <h3>Registered Devices</h3>
        <div className="device-grid">
          {devices.length > 0 ? (
            devices.map(device => (
              <div key={device.id} className="device-card">
                <div className="device-header">
                  <div className="device-icon">
                    <i className={deviceTypeIcons[device.type] || 'fas fa-plug'}></i>
                  </div>
                  <div className="device-info">
                    <h3>{device.name}</h3>
                    <p>{device.location}</p>
                  </div>
                  <div className="device-status">
                    <span className={device.status}>{device.status === 'active' ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
                
                <div className="device-control-panel">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={device.status === 'active'}
                      onChange={() => handleToggleDevice(device.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <div className="no-devices">No devices found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectDeviceControl; 
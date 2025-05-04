import React, { useState, useEffect } from 'react';
import DeviceController from '../../controllers/DeviceController';
import './DeviceControl.css';

const DeviceControl = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadDevices();
    
    // Set up polling to refresh device states from the feed
    const interval = setInterval(loadDevices, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadDevices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await DeviceController.getAllDevices();
      setDevices(result);
    } catch (err) {
      setError('Failed to load devices. Please try again.');
      console.error('Error loading devices:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleDevice = async (deviceId, deviceType) => {
    try {
      const deviceIndex = devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) return;
      
      const device = devices[deviceIndex];
      const isCurrentlyActive = device.status === 'active';
      const action = isCurrentlyActive ? 'off' : 'on';
      
      // Update UI immediately for better user experience
      const updatedDevices = [...devices];
      updatedDevices[deviceIndex] = { 
        ...device, 
        status: isCurrentlyActive ? 'inactive' : 'active',
        lastUpdated: new Date().toISOString()
      };
      setDevices(updatedDevices);
      
      // Use device-specific control to send data to Adafruit feeds
      let result;
      
      if (deviceType === 'fan') {
        result = await DeviceController.controlFan(action);
      } else if (deviceType === 'light') {
        result = await DeviceController.controlLight(action);
      } else {
        // Fallback to generic device update for other device types
        result = await DeviceController.updateDeviceStatus(deviceId, isCurrentlyActive ? 'inactive' : 'active');
      }
      
      console.log(`Device ${deviceType} ${action} result:`, result);
      
      // Refresh the device list to get updated states from feeds
      setTimeout(loadDevices, 1000);
      
    } catch (err) {
      setError(`Failed to control ${deviceType}. Please try again.`);
      console.error(`Error controlling ${deviceType}:`, err);
      
      // Refresh devices to reflect actual state
      loadDevices();
    }
  };
  
  const deviceTypeIcons = {
    light: 'fas fa-lightbulb',
    fan: 'fas fa-fan',
    lock: 'fas fa-lock',
    alarm: 'fas fa-bell'
  };
  
  if (isLoading) {
    return <div className="loading-indicator">Loading devices...</div>;
  }
  
  return (
    <div className="device-control-container">
      <div className="page-header">
        <h1>Device Control</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="registered-devices">
        <h2>Registered Devices</h2>
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
                      onChange={() => handleToggleDevice(device.id, device.type)}
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

export default DeviceControl;
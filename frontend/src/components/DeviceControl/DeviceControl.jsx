import React, { useState, useEffect, useCallback } from 'react';
import DeviceController from '../../controllers/DeviceController';
import DeviceScheduling from './DeviceScheduling';
import './DeviceControl.css';

const DeviceControl = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isToggling, setIsToggling] = useState({});
  const [expandedDevice, setExpandedDevice] = useState(null);
  
  const loadDevices = useCallback(async () => {
    // Don't set loading state during refresh to avoid UI flickering
    const initialLoad = isLoading;
    if (initialLoad) setIsLoading(true);
    
    try {
      const result = await DeviceController.getAllDevices();
      
      // Update devices without affecting ones that are currently being toggled
      setDevices(prevDevices => {
        return result.map(newDevice => {
          // If device is being toggled, preserve its current UI state
          const isDeviceToggling = isToggling[newDevice.id];
          if (isDeviceToggling) {
            const existingDevice = prevDevices.find(d => d.id === newDevice.id);
            if (existingDevice) {
              return existingDevice;
            }
          }
          return newDevice;
        });
      });
    } catch (err) {
      setError('Failed to load devices. Please try again.');
      console.error('Error loading devices:', err);
    } finally {
      if (initialLoad) setIsLoading(false);
    }
  }, [isLoading, isToggling]);
  
  useEffect(() => {
    loadDevices();
    
    // Set up polling to refresh device states from the feed (every 5 seconds)
    const interval = setInterval(loadDevices, 5000);
    
    return () => clearInterval(interval);
  }, [loadDevices]);
  
  const handleToggleDevice = async (deviceId, deviceType) => {
    try {
      const deviceIndex = devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) return;
      
      const device = devices[deviceIndex];
      const isCurrentlyActive = device.status === 'active';
      const action = isCurrentlyActive ? 'off' : 'on';
      
      // Mark this device as toggling to preserve its state
      setIsToggling(prev => ({ ...prev, [deviceId]: true }));
      
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
        console.log(`Fan ${action} result:`, result);
      } else if (deviceType === 'light') {
        result = await DeviceController.controlLight(action);
        console.log(`Light ${action} result:`, result);
      } else {
        // Fallback to generic device update for other device types
        result = await DeviceController.updateDeviceStatus(deviceId, isCurrentlyActive ? 'inactive' : 'active');
        console.log(`Generic device update result:`, result);
      }
      
      // Wait for a moment to allow database updates to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After sending command, fetch the actual state from database 
      // to ensure UI reflects actual device state
      loadDevices();
      
      // Clear the toggling state after the refresh is complete
      setTimeout(() => {
        setIsToggling(prev => ({ ...prev, [deviceId]: false }));
      }, 500);
      
    } catch (err) {
      setError(`Failed to control ${deviceType}. Please try again.`);
      console.error(`Error controlling ${deviceType}:`, err);
      
      // Clear toggling state and refresh devices to reflect actual state
      setIsToggling(prev => ({ ...prev, [deviceId]: false }));
      loadDevices();
    }
  };
  
  const handleToggleSchedule = (deviceId) => {
    setExpandedDevice(expandedDevice === deviceId ? null : deviceId);
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
              <div key={device.id} className={`device-card ${expandedDevice === device.id ? 'expanded' : ''}`}>
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
                  <div className="toggle-container">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={device.status === 'active'}
                        onChange={() => handleToggleDevice(device.id, device.type)}
                        disabled={isToggling[device.id]}
                  />
                  <span className="toggle-slider"></span>
                </label>
                    {isToggling[device.id] && (
                      <span className="toggle-indicator">
                        <i className="fas fa-sync fa-spin"></i>
                      </span>
                    )}
                  </div>
                  
                  {(device.type === 'fan' || device.type === 'light') && (
                    <button 
                      className="schedule-button"
                      onClick={() => handleToggleSchedule(device.id)}
                    >
                      <i className="fas fa-clock"></i>
                      {expandedDevice === device.id ? 'Ẩn lịch hẹn giờ' : 'Hẹn giờ'}
                    </button>
                  )}
                </div>
                
                {expandedDevice === device.id && (device.type === 'fan' || device.type === 'light') && (
                  <DeviceScheduling 
                    deviceType={device.type} 
                    deviceName={device.name} 
                  />
                )}
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
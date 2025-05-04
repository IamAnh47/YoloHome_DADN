import React from 'react';
import DirectDeviceControl from './DirectDeviceControl';
import './DeviceControl.css';

const DeviceControl = () => {
  return (
    <div className="device-control-container">
      <div className="page-header">
        <h1>Device Control</h1>
      </div>
      
      {/* Direct device control panel */}
      <div className="direct-control-section">
        <DirectDeviceControl />
      </div>
    </div>
  );
};

export default DeviceControl;
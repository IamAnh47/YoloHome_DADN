import React, { useState } from 'react';
import DeviceController from '../../controllers/DeviceController';
import './DirectDeviceControl.css';

const DirectDeviceControl = () => {
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState({
    fan: false,
    light: false
  });

  // Clear feedback message after 3 seconds
  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 3000);
  };

  // Handle fan control
  const handleFanControl = async (action) => {
    setLoading(prev => ({ ...prev, fan: true }));
    try {
      const result = await DeviceController.controlFan(action);
      showFeedback(result.message || `Fan turned ${action} successfully`);
    } catch (error) {
      showFeedback(`Failed to control fan: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, fan: false }));
    }
  };

  // Handle light control
  const handleLightControl = async (action) => {
    setLoading(prev => ({ ...prev, light: true }));
    try {
      const result = await DeviceController.controlLight(action);
      showFeedback(result.message || `Light turned ${action} successfully`);
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
          <div className="device-icon">
            <i className="fas fa-fan"></i>
          </div>
          <h3>Fan Control</h3>
          <div className="control-buttons">
            <button 
              className="control-button on"
              onClick={() => handleFanControl('on')}
              disabled={loading.fan}
            >
              {loading.fan ? 'Processing...' : 'Turn On'}
            </button>
            <button 
              className="control-button off"
              onClick={() => handleFanControl('off')}
              disabled={loading.fan}
            >
              {loading.fan ? 'Processing...' : 'Turn Off'}
            </button>
          </div>
        </div>
        
        {/* Light Control Card */}
        <div className="control-card">
          <div className="device-icon">
            <i className="fas fa-lightbulb"></i>
          </div>
          <h3>Light Control</h3>
          <div className="control-buttons">
            <button 
              className="control-button on"
              onClick={() => handleLightControl('on')}
              disabled={loading.light}
            >
              {loading.light ? 'Processing...' : 'Turn On'}
            </button>
            <button 
              className="control-button off"
              onClick={() => handleLightControl('off')}
              disabled={loading.light}
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
            <span>Light turns ON automatically when light level is below 300 lux</span>
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
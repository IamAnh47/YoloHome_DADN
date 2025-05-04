import React, { useState, useEffect, useCallback } from 'react';
import SensorController from '../../controllers/SensorController';
import SensorChart from '../Dashboard/SensorChart';
import './SensorsPage.css';

const SensorsPage = () => {
  const [sensorData, setSensorData] = useState({
    temperature: '0.0',
    humidity: '0.0',
    motion: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Use useCallback to prevent recreation of this function on each render
  const loadSensorData = useCallback(async () => {
    try {
      // Only show loading state on initial load, not during auto-refresh
      const initialLoad = isLoading;
      if (initialLoad) setIsLoading(true);
      
      // Get only the sensor data without refreshing everything
      const data = await SensorController.getLatestReadings(true);
      
      if (data) {
        setSensorData({
          temperature: data.temperature,
          humidity: data.humidity,
          motion: data.motion
        });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);
  
  useEffect(() => {
    // Load sensor data when component mounts
    loadSensorData();
    
    // Set up refresh interval (consistent 5 seconds for all components)
    const interval = setInterval(loadSensorData, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [loadSensorData]);
  
  return (
    <div className="sensors-page">
      <div className="sensors-header">
        <h1>Sensors Data</h1>
        <div className="refresh-controls">
          <button onClick={loadSensorData} disabled={isLoading} className="refresh-button">
            {isLoading ? 
              <><i className="fas fa-spinner fa-spin"></i> Refreshing...</> : 
              <><i className="fas fa-sync-alt"></i> Refresh Now</>
            }
          </button>
        </div>
      </div>
      
      <div className="last-updated">
        Last updated: {lastUpdated}
      </div>
      
      <div className="sensors-grid">
        {/* Temperature Card */}
        <div className="sensor-card">
          <div className="sensor-icon">
            <i className="fas fa-thermometer-half"></i>
          </div>
          <div className="sensor-info">
            <h2>Temperature</h2>
            <div className="sensor-value">
              {sensorData.temperature}°C
            </div>
            <div className="sensor-details">
              <p>Measured from smart temperature sensor</p>
              <p>Normal range: 18-28°C</p>
            </div>
          </div>
        </div>
        
        {/* Humidity Card */}
        <div className="sensor-card">
          <div className="sensor-icon">
            <i className="fas fa-tint"></i>
          </div>
          <div className="sensor-info">
            <h2>Humidity</h2>
            <div className="sensor-value">
              {sensorData.humidity}%
            </div>
            <div className="sensor-details">
              <p>Measured from smart humidity sensor</p>
              <p>Normal range: 30-60%</p>
            </div>
          </div>
        </div>
        
        {/* Motion Card */}
        <div className="sensor-card">
          <div className={`sensor-icon ${sensorData.motion ? 'active' : ''}`}>
            <i className="fas fa-running"></i>
          </div>
          <div className="sensor-info">
            <h2>Motion</h2>
            <div className={`sensor-value ${sensorData.motion ? 'active' : ''}`}>
              {sensorData.motion ? 'Detected' : 'Not Detected'}
            </div>
            <div className="sensor-details">
              <p>Detected by motion sensor</p>
              <p>Used for security and energy efficiency</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sensor Charts Section */}
      <div className="sensor-charts-section">
        <h2>Sensor History</h2>
        <div className="charts-container">
          <SensorChart 
            sensorType="temperature" 
            title="Temperature History" 
            unit="°C" 
          />
          <SensorChart 
            sensorType="humidity" 
            title="Humidity History" 
            unit="%" 
          />
        </div>
      </div>
    </div>
  );
};

export default SensorsPage; 
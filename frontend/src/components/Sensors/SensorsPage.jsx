import React, { useState, useEffect, useCallback } from 'react';
import SensorController from '../../controllers/SensorController';
import AdafruitFeedChart from '../Dashboard/AdafruitFeedChart';
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
        <h1>Sensors</h1>
        <div className="last-updated">
          Last updated: {lastUpdated || 'Loading...'}
        </div>
      </div>
      
      <div className="sensors-grid">
        <div className="sensor-card">
          <div className="sensor-icon">
            <i className="fas fa-thermometer-half"></i>
          </div>
          <div className="sensor-info">
            <h2>Temperature</h2>
            <div className="sensor-value">{sensorData.temperature}°C</div>
            <div className="sensor-details">
              <p>Room temperature</p>
              <p>Recorded by temperature sensor</p>
            </div>
          </div>
        </div>
        
        <div className="sensor-card">
          <div className="sensor-icon">
            <i className="fas fa-tint"></i>
          </div>
          <div className="sensor-info">
            <h2>Humidity</h2>
            <div className="sensor-value">{sensorData.humidity}%</div>
            <div className="sensor-details">
              <p>Relative humidity level</p>
              <p>Recorded by humidity sensor</p>
            </div>
          </div>
        </div>
        
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
      
      {/* Adafruit Feed Charts - 10 minutes data */}
      <div className="charts-section">
        <h2>Adafruit IO Feed Data (Last 10 Minutes)</h2>
        <div className="adafruit-charts">
          <AdafruitFeedChart 
            feedType="temperature" 
            title="Temperature Feed" 
            timeRange="day"
          />
          
          <AdafruitFeedChart 
            feedType="humidity" 
            title="Humidity Feed" 
            timeRange="day"
          />
        </div>
      </div>
      
      {/* Sensor History Charts - 24 hours data */}
      <div className="charts-section">
        <h2>Sensor History (Last 24 Hours)</h2>
        <div className="adafruit-charts">
          <AdafruitFeedChart 
            feedType="temperature" 
            title="Temperature History" 
            timeRange="week"
          />
          
          <AdafruitFeedChart 
            feedType="humidity" 
            title="Humidity History" 
            timeRange="week"
          />
        </div>
      </div>
    </div>
  );
};

export default SensorsPage; 
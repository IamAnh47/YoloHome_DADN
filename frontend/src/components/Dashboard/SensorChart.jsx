import React, { useState, useEffect } from 'react';
import SensorController from '../../controllers/SensorController';
import './SensorChart.css';

const SensorChart = ({ sensorType, title, unit }) => {
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState('day');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadChartData();
  }, [sensorType, timeRange]);
  
  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const data = await SensorController.getSensorHistory(sensorType, timeRange);
      setChartData(data);
    } catch (error) {
      console.error(`Error loading ${sensorType} chart data:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return timeRange === 'day' 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };
  
  // Find min and max values for the chart scale
  const values = chartData.map(item => item.value);
  const minValue = Math.floor(Math.min(...(values.length ? values : [0])));
  const maxValue = Math.ceil(Math.max(...(values.length ? values : [100])));
  
  // Calculate chart bar heights
  const getBarHeight = (value) => {
    const range = maxValue - minValue;
    return range === 0 ? 50 : ((value - minValue) / range * 100);
  };
  
  if (isLoading) {
    return (
      <div className="sensor-chart">
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="chart-loading">Loading data...</div>
      </div>
    );
  }
  
  return (
    <div className="sensor-chart">
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-controls">
          <button 
            className={timeRange === 'day' ? 'active' : ''} 
            onClick={() => setTimeRange('day')}
          >
            Day
          </button>
          <button 
            className={timeRange === 'week' ? 'active' : ''} 
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        {chartData.length > 0 ? (
          <>
            <div className="chart-y-axis">
              <span>{maxValue}{unit}</span>
              <span>{Math.floor((maxValue + minValue) / 2)}{unit}</span>
              <span>{minValue}{unit}</span>
            </div>
            
            <div className="chart-bars">
              {chartData.map((item, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ height: `${getBarHeight(item.value)}%` }}
                  >
                    <span className="bar-value">{item.value}{unit}</span>
                  </div>
                  <div className="bar-label">{formatTime(item.timestamp)}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-data-message">No data available</div>
        )}
      </div>
    </div>
  );
};

export default SensorChart; 
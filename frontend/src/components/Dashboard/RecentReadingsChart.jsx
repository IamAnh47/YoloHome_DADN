import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SensorController from '../../controllers/SensorController';
import './SensorChart.css';

const RecentReadingsChart = ({ limit = 10 }) => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChartData();
    
    // Set up auto-refresh interval (every 5 seconds)
    const refreshInterval = setInterval(() => {
      loadChartData();
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      // Get temperature and humidity history for the day
      const tempData = await SensorController.getSensorHistory('temperature', 'day', true);
      const humidityData = await SensorController.getSensorHistory('humidity', 'day', true);
      
      // Take only the most recent readings (up to the limit)
      const recentTempData = tempData.slice(-limit);
      const recentHumidityData = humidityData.slice(-limit);
      
      // Combine the data for the chart
      const combinedData = recentTempData.map((temp, index) => {
        const humidity = recentHumidityData[index] || { value: 0 };
        return {
          timestamp: temp.timestamp,
          temperature: temp.value,
          humidity: humidity.value
        };
      });
      
      setChartData(combinedData);
    } catch (error) {
      console.error('Error loading recent readings chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading && chartData.length === 0) {
    return (
      <div className="sensor-chart">
        <div className="chart-header">
          <h3>Recent Readings</h3>
        </div>
        <div className="chart-loading">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="sensor-chart">
      <div className="chart-header">
        <h3>Recent Readings</h3>
      </div>
      
      <div className="chart-description">
        Most recent temperature and humidity readings
      </div>
      
      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="temperature" 
                orientation="left" 
                stroke="#FF5733" 
                domain={['auto', 'auto']}
                label={{ value: '°C', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="humidity" 
                orientation="right" 
                stroke="#3498DB" 
                domain={[0, 100]}
                label={{ value: '%', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                labelFormatter={formatTime}
                formatter={(value, name) => [value.toFixed(1), name === 'temperature' ? 'Temperature (°C)' : 'Humidity (%)']}
              />
              <Legend />
              <Line 
                yAxisId="temperature"
                type="monotone" 
                dataKey="temperature" 
                stroke="#FF5733" 
                activeDot={{ r: 8 }} 
                name="Temperature"
                strokeWidth={2}
              />
              <Line 
                yAxisId="humidity"
                type="monotone" 
                dataKey="humidity" 
                stroke="#3498DB" 
                name="Humidity"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">No recent data available</div>
        )}
      </div>
    </div>
  );
};

export default RecentReadingsChart; 
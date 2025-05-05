import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import SensorController from '../../controllers/SensorController';
import './SensorChart.css';

const AdafruitFeedChart = ({ feedType, title, timeRange = 'day' }) => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on timeRange
      let startDate = null;
      const today = new Date();
      
      if (timeRange === 'day') {
        // Set to 10 minutes ago for 'day' view
        startDate = new Date(today);
        startDate.setMinutes(today.getMinutes() - 10);
      } else if (timeRange === 'week') {
        // Set to 24 hours ago for 'week' view (used for 24-hour history)
        startDate = new Date(today);
        startDate.setHours(today.getHours() - 24);
      } else if (timeRange === 'month') {
        // Set to 30 days ago
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Format dates as ISO string
      const formattedStartDate = startDate ? startDate.toISOString() : null;
      const formattedEndDate = today.toISOString();
      
      // Get feed data from Adafruit IO - adjust limit based on time range
      // For week view (24 hours), pass a higher limit to ensure we have enough data points for aggregation
      const limit = timeRange === 'day' ? 25 : timeRange === 'week' ? 500 : 200;
      
      const data = await SensorController.getFeedDataByDate(
        feedType, 
        formattedStartDate, 
        formattedEndDate, 
        limit, 
        true,
        timeRange  // Pass timeRange to enable proper aggregation
      );
      
      setChartData(data);
    } catch (error) {
      console.error(`Error loading ${feedType} feed data:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [feedType, timeRange]);
  
  useEffect(() => {
    loadChartData();
    
    // Auto-refresh data every minute
    const interval = setInterval(() => {
      loadChartData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [loadChartData]);
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    
    if (timeRange === 'day') {
      // For day view (10 minutes), show time in HH:MM:SS format
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else if (timeRange === 'week') {
      // For week view (24 hours), show date and time in HH:MM format
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      // For month view, show date only
      return date.toLocaleDateString([], {
        month: 'numeric',
        day: 'numeric'
      });
    }
  };
  
  // Get appropriate unit based on feed type
  const getUnit = () => {
    switch (feedType) {
      case 'temperature':
        return '°C';
      case 'humidity':
        return '%';
      case 'fan':
      case 'light':
        return '';
      default:
        return '';
    }
  };
  
  // Get appropriate color based on feed type
  const getColor = () => {
    switch (feedType) {
      case 'temperature':
        return '#FF5733';
      case 'humidity':
        return '#3498DB';
      case 'fan':
        return '#2ECC71';
      case 'light':
        return '#F39C12';
      default:
        return '#95a5a6';
    }
  };
  
  if (isLoading && chartData.length === 0) {
    return (
      <div className="sensor-chart">
        <div className="chart-header">
          <h3>{title || `${feedType.charAt(0).toUpperCase() + feedType.slice(1)} Chart`}</h3>
        </div>
        <div className="chart-loading">Loading data...</div>
      </div>
    );
  }
  
  return (
    <div className="sensor-chart">
      <div className="chart-header">
        <h3>{title || `${feedType.charAt(0).toUpperCase() + feedType.slice(1)} Chart`}</h3>
      </div>
      
      <div className="chart-description">
        {timeRange === 'day' 
          ? 'Showing data from Adafruit IO feed for the last 10 minutes'
          : timeRange === 'week' 
            ? 'Showing data from Adafruit IO feed for the last 24 hours' 
            : 'Showing data from Adafruit IO feed'
        }
      </div>
      
      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimestamp}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['auto', 'auto']}
                label={{ value: getUnit(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={formatTimestamp}
                formatter={(value) => [`${value}${getUnit()}`, feedType]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={getColor()} 
                activeDot={{ r: 8 }} 
                name={feedType.charAt(0).toUpperCase() + feedType.slice(1)}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">No data available for this time range</div>
        )}
      </div>
    </div>
  );
};

export default AdafruitFeedChart; 
import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import SensorController from '../../controllers/SensorController';
import './SensorChart.css';

const SensorHistoryCharts = () => {
  const [timeRange, setTimeRange] = useState('day');
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChartData();
    
    // Set up auto-refresh interval for live data
    const refreshInterval = setInterval(() => {
      loadChartData();
    }, 60000); // Refresh every minute for historical data
    
    return () => clearInterval(refreshInterval);
  }, [timeRange, loadChartData]);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      // Get temperature and humidity history for the selected time range
      const tempData = await SensorController.getSensorHistory('temperature', timeRange, true);
      const humidData = await SensorController.getSensorHistory('humidity', timeRange, true);
      
      setTemperatureData(tempData);
      setHumidityData(humidData);
    } catch (error) {
      console.error(`Error loading ${timeRange} chart data:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    
    if (timeRange === 'day') {
      // For day view, show time in HH:MM format
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // For week view, show date in MM/DD format with day of week
      return date.toLocaleDateString([], { 
        weekday: 'short',
        month: 'numeric', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading && temperatureData.length === 0) {
    return (
      <div className="sensor-history-charts">
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
        <div className="chart-loading">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="sensor-history-charts">
      <div className="chart-header">
        <h3>Sensor History</h3>
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
      
      {/* Temperature Chart */}
      <div className="sensor-chart">
        <div className="chart-header">
          <h4>Temperature History ({timeRange === 'day' ? 'Today' : 'Past Week'})</h4>
        </div>
        <div className="chart-container">
          {temperatureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={temperatureData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  label={{ value: '°C', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  labelFormatter={formatTimestamp}
                  formatter={(value) => [`${value.toFixed(1)}°C`, 'Temperature']}
                />
                <Legend />
                <defs>
                  <linearGradient id="tempColorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5733" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF5733" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#FF5733" 
                  fill="url(#tempColorGradient)" 
                  name="Temperature"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No temperature data available</div>
          )}
        </div>
      </div>
      
      {/* Humidity Chart */}
      <div className="sensor-chart">
        <div className="chart-header">
          <h4>Humidity History ({timeRange === 'day' ? 'Today' : 'Past Week'})</h4>
        </div>
        <div className="chart-container">
          {humidityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={humidityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  labelFormatter={formatTimestamp}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Humidity']}
                />
                <Legend />
                <defs>
                  <linearGradient id="humidColorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3498DB" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3498DB" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3498DB" 
                  fill="url(#humidColorGradient)" 
                  name="Humidity"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No humidity data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SensorHistoryCharts; 
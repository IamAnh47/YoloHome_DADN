import React, { useState, useEffect, useCallback, useRef } from 'react';
import SensorController from '../../controllers/SensorController';
import './SensorChart.css';

const SensorChart = ({ sensorType, title, unit }) => {
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState('day');
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef(null);
  
  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await SensorController.getSensorHistory(sensorType, timeRange);
      setChartData(data);
    } catch (error) {
      console.error(`Error loading ${sensorType} chart data:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [sensorType, timeRange]);
  
  useEffect(() => {
    loadChartData();
  }, [sensorType, timeRange, loadChartData]);
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return timeRange === 'day' 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };
  
  // Find min and max values for the chart scale
  const values = chartData.map(item => item.value);
  const minValue = Math.max(0, Math.floor(Math.min(...(values.length ? values : [0]))) - 2);
  const maxValue = Math.ceil(Math.max(...(values.length ? values : [100]))) + 2;
  
  const getThemeColor = () => {
    switch(sensorType) {
      case 'temperature':
        return {
          main: '#FF5733',
          gradient: ['rgba(255, 87, 51, 0.8)', 'rgba(255, 87, 51, 0)']
        };
      case 'humidity':
        return {
          main: '#3498DB',
          gradient: ['rgba(52, 152, 219, 0.8)', 'rgba(52, 152, 219, 0)']
        };
      case 'motion':
        return {
          main: '#2ECC71',
          gradient: ['rgba(46, 204, 113, 0.8)', 'rgba(46, 204, 113, 0)']
        };
      default:
        return {
          main: '#9B59B6',
          gradient: ['rgba(155, 89, 182, 0.8)', 'rgba(155, 89, 182, 0)'] 
        };
    }
  };
  
  const colors = getThemeColor();
  
  // Calculate point positions
  const getPointCoordinates = () => {
    if (!chartData.length) return [];
    
    const chartWidth = 100; // percentage
    const chartHeight = 150; // pixels
    const range = maxValue - minValue;
    
    // Calculate step based on number of points
    const step = chartWidth / (chartData.length - 1);
    
    return chartData.map((item, index) => {
      const x = index * step;
      const y = chartHeight - ((item.value - minValue) / range * chartHeight);
      return { x, y, value: item.value, timestamp: item.timestamp };
    });
  };
  
  const points = getPointCoordinates();
  
  // Generate SVG path for the line
  const generateLinePath = () => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      // Use bezier curves for smooth lines
      const cp1x = points[i-1].x + (points[i].x - points[i-1].x) / 3;
      const cp1y = points[i-1].y;
      const cp2x = points[i].x - (points[i].x - points[i-1].x) / 3;
      const cp2y = points[i].y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
    }
    
    return path;
  };
  
  // Generate SVG path for the area fill
  const generateAreaPath = () => {
    if (points.length < 2) return '';
    
    let path = generateLinePath();
    
    // Add bottom border to create closed path for fill
    path += ` L ${points[points.length-1].x} 150 L ${points[0].x} 150 Z`;
    
    return path;
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
    <div className="sensor-chart" ref={chartRef}>
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
              <span>{Math.round((maxValue + minValue) / 2)}{unit}</span>
              <span>{minValue}{unit}</span>
            </div>
            
            <div className="chart-line-view">
              <svg width="100%" height="150" className="line-chart">
                {/* Define gradient fill */}
                <defs>
                  <linearGradient id={`gradient-${sensorType}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.gradient[0]} />
                    <stop offset="100%" stopColor={colors.gradient[1]} />
                  </linearGradient>
                </defs>
                
                {/* Area fill */}
                <path 
                  d={generateAreaPath()} 
                  fill={`url(#gradient-${sensorType})`} 
                  className="chart-area"
                />
                
                {/* Line */}
                <path 
                  d={generateLinePath()} 
                  stroke={colors.main} 
                  strokeWidth="2" 
                  fill="none" 
                  className="chart-line"
                />
                
                {/* Data points */}
                {points.map((point, index) => (
                  <g key={index} className="data-point-group">
                    <circle 
                      cx={point.x + "%"} 
                      cy={point.y} 
                      r="4" 
                      fill="white" 
                      stroke={colors.main} 
                      strokeWidth="2"
                      className="data-point"
                    />
                    <text 
                      x={point.x + "%"} 
                      y={point.y - 10} 
                      textAnchor="middle" 
                      className="data-label"
                    >
                      {point.value}{unit}
                    </text>
                  </g>
                ))}
              </svg>
              
              {/* X-axis labels */}
              <div className="x-axis-labels">
                {points.map((point, index) => (
                  <div 
                    key={index} 
                    className="x-label" 
                    style={{ left: `${point.x}%` }}
                  >
                    {formatTime(point.timestamp)}
                  </div>
                ))}
              </div>
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
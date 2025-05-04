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
      console.log(`Chart data for ${sensorType} (${timeRange}):`, data);
      setChartData(data);
    } catch (error) {
      console.error(`Error loading ${sensorType} chart data:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [sensorType, timeRange]);
  
  useEffect(() => {
    loadChartData();
    
    // Set up auto-refresh interval (every 5 seconds)
    const refreshInterval = setInterval(() => {
      loadChartData();
    }, 5000);
    
    return () => clearInterval(refreshInterval);
  }, [sensorType, timeRange, loadChartData]);
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    
    if (timeRange === 'day') {
      // For day view, show time in HH:MM format
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // For week view, show date in MM/DD format
      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    }
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
    
    // The data from the backend is now pre-sorted in chronological order
    // so we can use it directly without re-sorting
    const displayData = chartData;
    
    // Calculate even spacing between points
    const step = displayData.length > 1 ? chartWidth / (displayData.length - 1) : 0;
    
    return displayData.map((item, index) => {
      // Position X evenly along the chart width
      const x = index * step;
      // Scale Y value to chart height - higher values are higher on the chart
      const y = chartHeight - ((item.value - minValue) / range * chartHeight);
      return { x, y, value: item.value, timestamp: item.timestamp };
    });
  };
  
  const points = getPointCoordinates();
  
  // Generate SVG path for the line
  const generateLinePath = () => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use more natural curves with tension for better visualization
    for (let i = 1; i < points.length; i++) {
      // Calculate control points with improved curve tension
      const xDiff = points[i].x - points[i-1].x;
      const yDiff = points[i].y - points[i-1].y;
      const tension = 0.2; // Lower value = smoother curve
      
      const ctrl1x = points[i-1].x + xDiff * tension;
      const ctrl1y = points[i-1].y;
      const ctrl2x = points[i].x - xDiff * tension;
      const ctrl2y = points[i].y;
      
      path += ` C ${ctrl1x} ${ctrl1y}, ${ctrl2x} ${ctrl2y}, ${points[i].x} ${points[i].y}`;
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
  
  const getChartDescription = () => {
    if (timeRange === 'day') {
      return `Showing the 30 most recent readings from today`;
    } else {
      return `Showing daily averages for the past 7 days`;
    }
  };
  
  // Add animated grid lines for better visual reference
  useEffect(() => {
    if (chartRef.current && !isLoading) {
      // Simple animation for the chart elements
      const lineElement = chartRef.current.querySelector('.chart-line');
      const areaElement = chartRef.current.querySelector('.chart-area');
      const pointElements = chartRef.current.querySelectorAll('.data-point');
      
      if (lineElement) {
        lineElement.style.opacity = '0';
        setTimeout(() => {
          lineElement.style.opacity = '1';
        }, 300);
      }
      
      if (areaElement) {
        areaElement.style.opacity = '0';
        setTimeout(() => {
          areaElement.style.opacity = '0.2';
        }, 500);
      }
      
      if (pointElements.length) {
        pointElements.forEach((point, i) => {
          point.style.opacity = '0';
          setTimeout(() => {
            point.style.opacity = '1';
          }, 700 + i * 50);
        });
      }
    }
  }, [chartData, isLoading]);
  
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
      
      <div className="chart-description">{getChartDescription()}</div>
      
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
                  className={`chart-line ${sensorType}`}
                />
                
                {/* Add animated grid lines for better visual reference */}
                <g className="grid-lines">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = (i * 150) / 4;
                    return (
                      <line
                        key={i}
                        x1="0"
                        y1={y}
                        x2="100%"
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={i === 0 || i === 4 ? "none" : "5,5"}
                      />
                    );
                  })}
                </g>
                
                {/* Data points */}
                {points.map((point, index) => (
                  <g key={index} className="data-point-group">
                    {/* Larger highlight circle for better visibility */}
                    <circle 
                      cx={point.x + "%"} 
                      cy={point.y} 
                      r="6" 
                      fill={colors.main}
                      opacity="0.2"
                      className="data-point-highlight"
                    />
                    {/* Main data point */}
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
                {points.length > 0 && (
                  <>
                    {/* Show evenly distributed labels for better readability */}
                    {points.filter((_, i) => 
                      timeRange === 'day' 
                        ? i === 0 || i === Math.floor(points.length / 4) || 
                          i === Math.floor(points.length / 2) || 
                          i === Math.floor(3 * points.length / 4) || 
                          i === points.length - 1
                        : true // Show all labels for week view
                    ).map((point, index) => (
                      <div 
                        key={index} 
                        className="x-label" 
                        style={{ left: `${point.x}%` }}
                      >
                        {formatTime(point.timestamp)}
                      </div>
                    ))}
                  </>
                )}
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
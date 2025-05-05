import React, { useEffect, useState } from 'react';
import SystemController from '../../controllers/SystemController';
import SensorController from '../../controllers/SensorController';
import SensorHistoryCharts from './SensorHistoryCharts';
import AdafruitFeedChart from './AdafruitFeedChart';
import './Dashboard.css';

const Dashboard = () => {
  const [systemStatus, setSystemStatus] = useState({
    devices: {
      fan: { status: false },
      light: { status: false }
    },
    sensors: {
      temperature: '0.0',
      humidity: '0.0',
    motion: false
    }
  });
  
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    online: 0,
    offline: 0
  });
  
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Lấy trạng thái toàn bộ hệ thống
        const status = await SystemController.getSystemStatus();
        setSystemStatus(status);
        
        // Tính toán thống kê thiết bị
        const deviceCount = Object.keys(status.devices).length;
        const onlineCount = Object.values(status.devices).filter(device => device.status).length;
        
        setDeviceStats({
          total: deviceCount,
          online: onlineCount,
          offline: deviceCount - onlineCount
        });
        
        // Lấy cảnh báo gần đây
        const alertsResult = await SensorController.getRecentAlerts();
        setAlerts(alertsResult);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
    
    // Thiết lập cập nhật định kỳ
    const interval = setInterval(loadDashboardData, 5000);
    
    // Dọn dẹp khi component unmount
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (isLoading) {
    return <div className="loading-indicator">Loading dashboard data...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Device Statistics */}
        <div className="card">
          <h2>Devices</h2>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{deviceStats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat">
              <span className="stat-value stat-online">{deviceStats.online}</span>
              <span className="stat-label">Online</span>
            </div>
            <div className="stat">
              <span className="stat-value stat-offline">{deviceStats.offline}</span>
              <span className="stat-label">Offline</span>
            </div>
          </div>
        </div>
        
        {/* Current Sensor Readings */}
        <div className="card">
          <h2>Current Readings</h2>
          <div className="readings">
            <div className="reading">
              <div className="reading-icon temp-icon">
                <i className="fas fa-thermometer-half"></i>
              </div>
              <div className="reading-details">
                <span className="reading-value">{systemStatus.sensors.temperature}°C</span>
                <span className="reading-label">Temperature</span>
              </div>
            </div>
            
            <div className="reading">
              <div className="reading-icon humidity-icon">
                <i className="fas fa-tint"></i>
              </div>
              <div className="reading-details">
                <span className="reading-value">{systemStatus.sensors.humidity}%</span>
                <span className="reading-label">Humidity</span>
              </div>
            </div>
            
            <div className="reading">
              <div className={`reading-icon motion-icon ${systemStatus.sensors.motion ? 'active' : ''}`}>
                <i className="fas fa-running"></i>
              </div>
              <div className="reading-details">
                <span className={`reading-value ${systemStatus.sensors.motion ? 'active' : ''}`}>
                  {systemStatus.sensors.motion ? 'Detected' : 'None'}
                </span>
                <span className="reading-label">Motion</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Alerts */}
        <div className="card">
          <h2>Recent Alerts</h2>
          {alerts.length > 0 ? (
            <ul className="alert-list">
              {alerts.map((alert) => (
                <li key={alert.id} className={`alert ${alert.status}`}>
                  <div className="alert-icon">
                    {alert.type === 'temperature' && <i className="fas fa-thermometer-full"></i>}
                    {alert.type === 'humidity' && <i className="fas fa-tint"></i>}
                    {alert.type === 'motion' && <i className="fas fa-running"></i>}
                  </div>
                  <div className="alert-details">
                    <span className="alert-message">{alert.message}</span>
                    <span className="alert-time">{formatTime(alert.timestamp)}</span>
                  </div>
                  <div className="alert-status">
                    <span className={alert.status}>{alert.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-alerts">No recent alerts</p>
          )}
          <div className="card-footer">
            <a href="/alerts" className="view-all">View All Alerts</a>
          </div>
        </div>
      </div>
      
      {/* Sensor Charts Section */}
      <div className="sensor-charts-section">
        <h2>Sensor History</h2>
        <div className="charts-container">
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
          <SensorHistoryCharts />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
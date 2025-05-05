import React, { useState, useEffect, useCallback } from 'react';
import SensorController from '../../controllers/SensorController';
import AlertConfigController from '../../controllers/AlertConfigController';
import './SensorChart.css';

const SensorAverageCard = ({ sensorType }) => {
  const [averageData, setAverageData] = useState({
    average: null,
    count: 0,
    fromTimestamp: null,
    toTimestamp: null
  });
  
  const [thresholds, setThresholds] = useState({
    min: null,
    max: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Lấy giá trị trung bình của feed
  const loadAverageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await SensorController.getFeedAverageForLastMinute(sensorType);
      setAverageData(data);
      
      // Cập nhật thời gian
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error(`Error loading ${sensorType} average:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [sensorType]);
  
  // Lấy ngưỡng cảnh báo
  const loadThresholds = useCallback(async () => {
    try {
      const configs = await AlertConfigController.getAlertConfigs();
      const config = configs.find(cfg => cfg.sensorType === sensorType);
      
      if (config) {
        setThresholds({
          min: config.minValue,
          max: config.maxValue
        });
      }
    } catch (error) {
      console.error(`Error loading ${sensorType} thresholds:`, error);
    }
  }, [sensorType]);
  
  useEffect(() => {
    loadAverageData();
    loadThresholds();
    
    // Cập nhật dữ liệu mỗi 60 giây
    const interval = setInterval(() => {
      loadAverageData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [loadAverageData, loadThresholds]);
  
  // Kiểm tra cảnh báo
  const getAlertStatus = () => {
    if (averageData.average === null || !thresholds.min || !thresholds.max) {
      return 'normal';
    }
    
    if (averageData.average < thresholds.min) {
      return 'low';
    }
    
    if (averageData.average > thresholds.max) {
      return 'high';
    }
    
    return 'normal';
  };
  
  // Format giá trị để hiển thị
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (sensorType === 'temperature') {
      return `${value.toFixed(1)}°C`;
    } else if (sensorType === 'humidity') {
      return `${value.toFixed(1)}%`;
    }
    
    return value.toString();
  };
  
  // Tên hiển thị của loại cảm biến
  const getSensorName = () => {
    switch (sensorType) {
      case 'temperature':
        return 'Nhiệt độ';
      case 'humidity':
        return 'Độ ẩm';
      default:
        return sensorType.charAt(0).toUpperCase() + sensorType.slice(1);
    }
  };
  
  // Lấy biểu tượng cho loại cảm biến
  const getSensorIcon = () => {
    switch (sensorType) {
      case 'temperature':
        return 'fas fa-thermometer-half';
      case 'humidity':
        return 'fas fa-tint';
      default:
        return 'fas fa-chart-line';
    }
  };
  
  // Thông báo cảnh báo
  const getAlertMessage = () => {
    const alertStatus = getAlertStatus();
    
    if (alertStatus === 'low') {
      return `${getSensorName()} trung bình thấp hơn ngưỡng (${formatValue(thresholds.min)})`;
    }
    
    if (alertStatus === 'high') {
      return `${getSensorName()} trung bình cao hơn ngưỡng (${formatValue(thresholds.max)})`;
    }
    
    return 'Giá trị trung bình bình thường';
  };
  
  const alertStatus = getAlertStatus();
  
  return (
    <div className={`sensor-average-card ${alertStatus !== 'normal' ? 'alert-active' : ''}`}>
      <div className="card-header">
        <h3>
          <i className={getSensorIcon()}></i> 
          {getSensorName()} trung bình (1 phút)
        </h3>
      </div>
      
      <div className="card-body">
        {isLoading && !averageData.average ? (
          <div className="loading">Đang tải dữ liệu...</div>
        ) : (
          <>
            <div className={`average-value ${alertStatus}`}>
              {formatValue(averageData.average)}
            </div>
            
            <div className="data-meta">
              {averageData.count > 0 ? (
                <span>Dựa trên {averageData.count} đo đạc trong 1 phút qua</span>
              ) : (
                <span>Không có dữ liệu trong phút vừa qua</span>
              )}
            </div>
            
            {alertStatus !== 'normal' && (
              <div className={`alert-message ${alertStatus}`}>
                {getAlertMessage()}
              </div>
            )}
            
            <div className="threshold-info">
              <div className="threshold">
                <span className="label">Ngưỡng thấp:</span>
                <span className="value">{formatValue(thresholds.min)}</span>
              </div>
              <div className="threshold">
                <span className="label">Ngưỡng cao:</span>
                <span className="value">{formatValue(thresholds.max)}</span>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="card-footer">
        <span className="last-updated">Cập nhật: {lastUpdated}</span>
      </div>
    </div>
  );
};

export default SensorAverageCard; 
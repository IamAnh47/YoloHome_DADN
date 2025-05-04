const DeviceModel = require('../models/deviceModel');
const SensorModel = require('../models/sensorModel');

// @desc    Get complete system status (devices and sensors)
// @route   GET /api/status
// @access  Private
exports.getSystemStatus = async (req, res, next) => {
  try {
    // 1. Lấy trạng thái của các thiết bị 
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    const lightDevice = await DeviceModel.findDeviceByType('light');

    // 2. Lấy dữ liệu từ các cảm biến
    const temperatureSensor = await SensorModel.getSensorByType('temperature');
    const humiditySensor = await SensorModel.getSensorByType('humidity');
    const motionSensor = await SensorModel.getSensorByType('motion');
    
    // Lấy dữ liệu mới nhất từ mỗi cảm biến
    const latestTemperature = temperatureSensor ? 
      await SensorModel.getLatestSensorData(temperatureSensor.sensor_id) : null;
    const latestHumidity = humiditySensor ? 
      await SensorModel.getLatestSensorData(humiditySensor.sensor_id) : null;
    const latestMotion = motionSensor ? 
      await SensorModel.getLatestSensorData(motionSensor.sensor_id) : null;
    
    // 3. Kết hợp trạng thái thiết bị và dữ liệu cảm biến
    const systemStatus = {
      devices: {
        fan: {
          status: fanDevice ? fanDevice.status === 'active' : false,
          device_id: fanDevice ? fanDevice.device_id : null,
          name: fanDevice ? fanDevice.device_name : 'Unknown',
          location: fanDevice ? fanDevice.dlocation : null
        },
        light: {
          status: lightDevice ? lightDevice.status === 'active' : false,
          device_id: lightDevice ? lightDevice.device_id : null,
          name: lightDevice ? lightDevice.device_name : 'Unknown',
          location: lightDevice ? lightDevice.dlocation : null
        }
      },
      sensors: {
        temperature: latestTemperature ? parseFloat(latestTemperature.svalue).toFixed(1) : '0.0',
        humidity: latestHumidity ? parseFloat(latestHumidity.svalue).toFixed(1) : '0.0',
        motion: latestMotion ? latestMotion.svalue > 0 : false
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    next(error);
  }
}; 
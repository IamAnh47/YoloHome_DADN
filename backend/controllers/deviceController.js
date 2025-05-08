const DeviceModel = require('../models/deviceModel');
const mqttService = require('../services/mqttService');
const adafruitService = require('../services/adafruitService');
const DeviceScheduleModel = require('../models/deviceScheduleModel');

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
exports.getAllDevices = async (req, res, next) => {
  try {
    const devices = await DeviceModel.getAllDevices();
    
    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res, next) => {
  try {
    const device = await DeviceModel.getDeviceById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new device
// @route   POST /api/devices
// @access  Private
exports.createDevice = async (req, res, next) => {
  try {
    const { name, type, location, status } = req.body;
    
    // Validate input
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and type for the device'
      });
    }
    
    // Create device
    const device = await DeviceModel.createDevice({
      name,
      type,
      location,
      status: status || 'inactive'
    });
    
    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
exports.updateDevice = async (req, res, next) => {
  try {
    const { name, type, location, status } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (location) updateData.location = location;
    if (status) updateData.status = status;
    
    // Update device
    const device = await DeviceModel.updateDevice(req.params.id, updateData);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    // Send MQTT message if status has changed
    if (updateData.status) {
        const topic = `yolohome/devices/${device.device_id}/control`;
        const message = JSON.stringify({
          device_id: device.device_id,
          status: device.status,
          timestamp: new Date().toISOString(),
          source: 'api'
        });
        
        mqttService.publishMessage(topic, message);
      }
      
      res.status(200).json({
        success: true,
        data: device
      });
    } catch (error) {
      next(error);
    }
  };
  
  // @desc    Delete device
  // @route   DELETE /api/devices/:id
  // @access  Private
  exports.deleteDevice = async (req, res, next) => {
    try {
      const success = await DeviceModel.deleteDevice(req.params.id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      next(error);
    }
  };
  
  // @desc    Control device (turn on/off)
  // @route   POST /api/devices/:id/control
  // @access  Private
  exports.controlDevice = async (req, res, next) => {
    try {
      const { action } = req.body;
      
      // Validate input
      if (!action || (action !== 'ON' && action !== 'OFF')) {
        return res.status(400).json({
          success: false,
          message: 'Please provide valid action (ON or OFF)'
        });
      }
      
      // Get device
      const device = await DeviceModel.getDeviceById(req.params.id);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }
      
      // Update device status
      const status = action === 'ON' ? 'active' : 'inactive';
      const updatedDevice = await DeviceModel.updateDevice(req.params.id, { status });
      
      // Send MQTT message
      const topic = `yolohome/devices/${device.device_id}/control`;
      const message = JSON.stringify({
        device_id: device.device_id,
        action,
        status,
        timestamp: new Date().toISOString(),
        source: 'api'
      });
      
      mqttService.publishMessage(topic, message);
      
      res.status(200).json({
        success: true,
        data: updatedDevice
      });
    } catch (error) {
      next(error);
    }
  };
  
  // @desc    Get device statistics
  // @route   GET /api/devices/stats
  // @access  Private
  exports.getDeviceStats = async (req, res, next) => {
    try {
      const stats = await DeviceModel.getDeviceStatistics();
      
      res.status(200).json({
        success: true,
        data: {
          total: parseInt(stats.total),
          online: parseInt(stats.active),
          offline: parseInt(stats.inactive)
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // @desc    Toggle devices by type
  // @route   POST /api/devices/toggle-by-type
  // @access  Private
  exports.toggleDevicesByType = async (req, res, next) => {
    try {
      const { type } = req.body;
      
      // Validate input
      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Please provide device type'
        });
      }
      
      // Get devices of the specified type
      const devices = await DeviceModel.getDevicesByType(type);
      
      if (devices.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No devices found with type: ${type}`
        });
      }
      
      // Toggle each device
      const updatedDevices = [];
      
      for (const device of devices) {
        const newStatus = device.status === 'active' ? 'inactive' : 'active';
        const updatedDevice = await DeviceModel.updateDevice(device.device_id, { status: newStatus });
        updatedDevices.push(updatedDevice);
        
        // Send MQTT message
        const topic = `yolohome/devices/${device.device_id}/control`;
        const action = newStatus === 'active' ? 'ON' : 'OFF';
        const message = JSON.stringify({
          device_id: device.device_id,
          action,
          status: newStatus,
          timestamp: new Date().toISOString(),
          source: 'api'
        });
        
        mqttService.publishMessage(topic, message);
      }
      
      res.status(200).json({
        success: true,
        count: updatedDevices.length,
        data: updatedDevices
      });
    } catch (error) {
      next(error);
    }
  };

// New methods for direct fan and light control using Adafruit IO

// @desc    Control fan
// @route   POST /api/devices/fan/:action
// @access  Private
exports.controlFan = async (req, res, next) => {
  try {
    const { action } = req.params;
    
    // Validate action
    if (action !== 'on' && action !== 'off') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "on" or "off"'
      });
    }
    
    // Find fan device first to include in response
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    if (!fanDevice) {
      return res.status(404).json({
        success: false,
        message: 'Fan device not found'
      });
    }
    
    // Use the Adafruit Service to control the fan
    let result;
    if (action === 'on') {
      result = await adafruitService.turnOnFan();
    } else {
      result = await adafruitService.turnOffFan();
    }
    
    // Check if we have a result
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to control fan. Check Adafruit IO connection.'
      });
    }
    
    // Convert action to device status
    const status = action === 'on' ? 'active' : 'inactive';
    
    // Update the device in the database
    const updatedDevice = await DeviceModel.updateDevice(fanDevice.device_id, { status });
    
    // Perform a synchronization to ensure database is in sync with Adafruit
    setTimeout(async () => {
      try {
        await adafruitService.syncDeviceStatesFromFeed(async (deviceType, deviceStatus) => {
          if (deviceType === 'fan') {
            await DeviceModel.updateDeviceByTypeWithStatus(deviceType, deviceStatus);
          }
        });
      } catch (syncError) {
        console.error('Error during feed synchronization:', syncError);
      }
    }, 1000); // Wait 1 second for Adafruit to process the change
    
    // Return success response with device data
    res.status(200).json({
      success: true,
      message: `Fan turned ${action} successfully`,
      data: {
        device_id: fanDevice.device_id,
        name: fanDevice.device_name,
        type: fanDevice.device_type,
        location: fanDevice.dlocation,
        status: status,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Control light
// @route   POST /api/devices/light/:action
// @access  Private
exports.controlLight = async (req, res, next) => {
  try {
    const { action } = req.params;
    
    // Validate action
    if (action !== 'on' && action !== 'off') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "on" or "off"'
      });
    }
    
    // Find light device first to include in response
    const lightDevice = await DeviceModel.findDeviceByType('light');
    if (!lightDevice) {
      return res.status(404).json({
        success: false,
        message: 'Light device not found'
      });
    }
    
    // Use the Adafruit Service to control the light
    let result;
    if (action === 'on') {
      result = await adafruitService.turnOnLight();
    } else {
      result = await adafruitService.turnOffLight();
    }
    
    // Check if we have a result
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to control light. Check Adafruit IO connection.'
      });
    }
    
    // Convert action to device status
    const status = action === 'on' ? 'active' : 'inactive';
    
    // Update the device in the database
    const updatedDevice = await DeviceModel.updateDevice(lightDevice.device_id, { status });
    
    // Perform a synchronization to ensure database is in sync with Adafruit
    setTimeout(async () => {
      try {
        await adafruitService.syncDeviceStatesFromFeed(async (deviceType, deviceStatus) => {
          if (deviceType === 'light') {
            await DeviceModel.updateDeviceByTypeWithStatus(deviceType, deviceStatus);
          }
        });
      } catch (syncError) {
        console.error('Error during feed synchronization:', syncError);
      }
    }, 1000); // Wait 1 second for Adafruit to process the change
    
    // Return success response with device data
    res.status(200).json({
      success: true,
      message: `Light turned ${action} successfully`,
      data: {
        device_id: lightDevice.device_id,
        name: lightDevice.device_name,
        type: lightDevice.device_type,
        location: lightDevice.dlocation,
        status: status,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Turn on fan device
// @route   POST /api/devices/fan/on
// @access  Private
exports.turnOnFan = async (req, res, next) => {
  try {
    // Tìm thiết bị quạt từ database
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    
    if (!fanDevice) {
      return res.status(404).json({
        success: false,
        message: 'Fan device not found'
      });
    }
    
    // Cập nhật trạng thái thiết bị
    const updatedDevice = await DeviceModel.updateDevice(fanDevice.device_id, { status: 'active' });
    
    // Gửi lệnh qua MQTT và Adafruit
    const topic = `yolohome/devices/${fanDevice.device_id}/control`;
    const message = JSON.stringify({
      device_id: fanDevice.device_id,
      action: 'ON',
      status: 'active',
      timestamp: new Date().toISOString(),
      source: 'api'
    });
    
    mqttService.publishMessage(topic, message);
    
    // Sử dụng AdafruitService để điều khiển thiết bị
    await adafruitService.turnOnFan();
    
    // Lưu lại nhật ký điều khiển
    await DeviceModel.createControlLog({
      user_id: req.user.id,
      device_id: fanDevice.device_id,
      action: 'Turn On Fan',
      description: 'Fan turned on via API'
    });
    
    res.status(200).json({
      success: true,
      message: 'Fan turned on successfully',
      data: updatedDevice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Turn off fan device
// @route   POST /api/devices/fan/off
// @access  Private
exports.turnOffFan = async (req, res, next) => {
  try {
    // Tìm thiết bị quạt từ database
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    
    if (!fanDevice) {
      return res.status(404).json({
        success: false,
        message: 'Fan device not found'
      });
    }
    
    // Cập nhật trạng thái thiết bị
    const updatedDevice = await DeviceModel.updateDevice(fanDevice.device_id, { status: 'inactive' });
    
    // Gửi lệnh qua MQTT và Adafruit
    const topic = `yolohome/devices/${fanDevice.device_id}/control`;
    const message = JSON.stringify({
      device_id: fanDevice.device_id,
      action: 'OFF',
      status: 'inactive',
      timestamp: new Date().toISOString(),
      source: 'api'
    });
    
    mqttService.publishMessage(topic, message);
    
    // Sử dụng AdafruitService để điều khiển thiết bị
    await adafruitService.turnOffFan();
    
    // Lưu lại nhật ký điều khiển
    await DeviceModel.createControlLog({
      user_id: req.user.id,
      device_id: fanDevice.device_id,
      action: 'Turn Off Fan',
      description: 'Fan turned off via API'
    });
    
    res.status(200).json({
      success: true,
      message: 'Fan turned off successfully',
      data: updatedDevice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Turn on light device
// @route   POST /api/devices/light/on
// @access  Private
exports.turnOnLight = async (req, res, next) => {
  try {
    // Tìm thiết bị đèn từ database
    const lightDevice = await DeviceModel.findDeviceByType('light');
    
    if (!lightDevice) {
      return res.status(404).json({
        success: false,
        message: 'Light device not found'
      });
    }
    
    // Cập nhật trạng thái thiết bị
    const updatedDevice = await DeviceModel.updateDevice(lightDevice.device_id, { status: 'active' });
    
    // Gửi lệnh qua MQTT và Adafruit
    const topic = `yolohome/devices/${lightDevice.device_id}/control`;
    const message = JSON.stringify({
      device_id: lightDevice.device_id,
      action: 'ON',
      status: 'active',
      timestamp: new Date().toISOString(),
      source: 'api'
    });
    
    mqttService.publishMessage(topic, message);
    
    // Sử dụng AdafruitService để điều khiển thiết bị
    await adafruitService.turnOnLight();
    
    // Lưu lại nhật ký điều khiển
    await DeviceModel.createControlLog({
      user_id: req.user.id,
      device_id: lightDevice.device_id,
      action: 'Turn On Light',
      description: 'Light turned on via API'
    });
    
    res.status(200).json({
      success: true,
      message: 'Light turned on successfully',
      data: updatedDevice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Turn off light device
// @route   POST /api/devices/light/off
// @access  Private
exports.turnOffLight = async (req, res, next) => {
  try {
    // Tìm thiết bị đèn từ database
    const lightDevice = await DeviceModel.findDeviceByType('light');
    
    if (!lightDevice) {
      return res.status(404).json({
        success: false,
        message: 'Light device not found'
      });
    }
    
    // Cập nhật trạng thái thiết bị
    const updatedDevice = await DeviceModel.updateDevice(lightDevice.device_id, { status: 'inactive' });
    
    // Gửi lệnh qua MQTT và Adafruit
    const topic = `yolohome/devices/${lightDevice.device_id}/control`;
    const message = JSON.stringify({
      device_id: lightDevice.device_id,
      action: 'OFF',
      status: 'inactive',
      timestamp: new Date().toISOString(),
      source: 'api'
    });
    
    mqttService.publishMessage(topic, message);
    
    // Sử dụng AdafruitService để điều khiển thiết bị
    await adafruitService.turnOffLight();
    
    // Lưu lại nhật ký điều khiển
    await DeviceModel.createControlLog({
      user_id: req.user.id,
      device_id: lightDevice.device_id,
      action: 'Turn Off Light',
      description: 'Light turned off via API'
    });
    
    res.status(200).json({
      success: true,
      message: 'Light turned off successfully',
      data: updatedDevice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get status of all devices (fan, light)
// @route   GET /api/devices/status
// @access  Private
exports.getDeviceStatus = async (req, res, next) => {
  try {
    // Tìm thiết bị quạt và đèn
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    const lightDevice = await DeviceModel.findDeviceByType('light');
    
    // Kết quả trả về
    const result = {
      fan: {
        status: fanDevice ? fanDevice.status === 'active' : false,
        device_id: fanDevice ? fanDevice.device_id : null
      },
      light: {
        status: lightDevice ? lightDevice.status === 'active' : false,
        device_id: lightDevice ? lightDevice.device_id : null
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting device status:', error);
      next(error);
    }
  };

// Device scheduling controllers

// @desc    Get all schedules for a device type
// @route   GET /api/devices/:deviceType/schedules
// @access  Private
exports.getDeviceSchedules = async (req, res, next) => {
  try {
    const { deviceType } = req.params;
    
    // Validate device type
    if (!deviceType) {
      return res.status(400).json({
        success: false,
        message: 'Device type is required'
      });
    }
    
    const schedules = await DeviceScheduleModel.getSchedulesByDeviceType(deviceType);
    
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a one-time schedule for a device
// @route   POST /api/devices/:deviceType/schedule
// @access  Private
exports.scheduleDevice = async (req, res, next) => {
  try {
    const { deviceType } = req.params;
    const { action, scheduledTime } = req.body;
    
    // Validate input
    if (!deviceType || !action || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Device type, action, and scheduledTime are required'
      });
    }
    
    // Validate action
    if (action !== 'on' && action !== 'off') {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "on" or "off"'
      });
    }
    
    // Find the device
    const device = await DeviceModel.findDeviceByType(deviceType);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `No device found with type: ${deviceType}`
      });
    }
    
    // Create schedule
    const schedule = await DeviceScheduleModel.createSchedule({
      deviceId: device.device_id,
      scheduleType: 'once',
      action,
      startTime: new Date(scheduledTime),
      createdBy: req.user ? req.user.id : 1 // Default to admin user if not authenticated
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a range schedule for a device (turn on at start, off at end)
// @route   POST /api/devices/:deviceType/schedule-range
// @access  Private
exports.scheduleDeviceRange = async (req, res, next) => {
  try {
    const { deviceType } = req.params;
    const { startTime, endTime } = req.body;
    
    // Validate input
    if (!deviceType || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Device type, startTime, and endTime are required'
      });
    }
    
    // Find the device
    const device = await DeviceModel.findDeviceByType(deviceType);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `No device found with type: ${deviceType}`
      });
    }
    
    // Create schedule
    const schedule = await DeviceScheduleModel.createSchedule({
      deviceId: device.device_id,
      scheduleType: 'range',
      action: 'range',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy: req.user ? req.user.id : 1 // Default to admin user if not authenticated
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a schedule
// @route   DELETE /api/devices/schedules/:id
// @access  Private
exports.cancelSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the schedule first
    const schedule = await DeviceScheduleModel.getScheduleById(id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: `No schedule found with ID: ${id}`
      });
    }
    
    // Delete the schedule
    const success = await DeviceScheduleModel.deleteSchedule(id);
    
    res.status(200).json({
      success: true,
      data: { scheduleId: id }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute pending schedules - This would be called by a cron job
// @route   POST /api/devices/schedules/execute
// @access  Private (internal)
exports.executePendingSchedules = async (req, res, next) => {
  try {
    // Get pending schedules
    const pendingSchedules = await DeviceScheduleModel.getPendingSchedules();
    
    if (pendingSchedules.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending schedules to execute',
        data: []
      });
    }
    
    const executedSchedules = [];
    
    // Process each pending schedule
    for (const schedule of pendingSchedules) {
      try {
        // Different handling based on schedule type
        if (schedule.schedule_type === 'once') {
          // Execute the one-time schedule
          const action = schedule.action === 'on' ? 'ON' : 'OFF';
          const status = schedule.action === 'on' ? 'active' : 'inactive';
          
          // Update device status
          await DeviceModel.updateDevice(schedule.device_id, { status });
          
          // Send MQTT message
          const topic = `yolohome/devices/${schedule.device_id}/control`;
          const message = JSON.stringify({
            device_id: schedule.device_id,
            action,
            status,
            timestamp: new Date().toISOString(),
            source: 'scheduler'
          });
          
          mqttService.publishMessage(topic, message);
          
          // Execute based on device type
          if (schedule.device_type === 'fan') {
            if (schedule.action === 'on') {
              await adafruitService.turnOnFan();
            } else {
              await adafruitService.turnOffFan();
            }
          } else if (schedule.device_type === 'light') {
            if (schedule.action === 'on') {
              await adafruitService.turnOnLight();
            } else {
              await adafruitService.turnOffLight();
            }
          }
        } else if (schedule.schedule_type === 'range') {
          // For range type schedules, check if we're at start or end time
          const now = new Date();
          const startTime = new Date(schedule.start_time);
          const endTime = new Date(schedule.end_time);
          
          // If we're close to the start time - turn ON
          if (Math.abs(now - startTime) < 60000) { // Within 1 minute
            // Turn ON
            await DeviceModel.updateDevice(schedule.device_id, { status: 'active' });
            
            // Send MQTT message
            const topic = `yolohome/devices/${schedule.device_id}/control`;
            const message = JSON.stringify({
              device_id: schedule.device_id,
              action: 'ON',
              status: 'active',
              timestamp: new Date().toISOString(),
              source: 'scheduler'
            });
            
            mqttService.publishMessage(topic, message);
            
            // Execute based on device type
            if (schedule.device_type === 'fan') {
              await adafruitService.turnOnFan();
            } else if (schedule.device_type === 'light') {
              await adafruitService.turnOnLight();
            }
            
            // Don't mark as executed yet since we have the end time
            continue;
          }
          
          // If we're close to the end time - turn OFF
          if (Math.abs(now - endTime) < 60000) { // Within 1 minute
            // Turn OFF
            await DeviceModel.updateDevice(schedule.device_id, { status: 'inactive' });
            
            // Send MQTT message
            const topic = `yolohome/devices/${schedule.device_id}/control`;
            const message = JSON.stringify({
              device_id: schedule.device_id,
              action: 'OFF',
              status: 'inactive',
              timestamp: new Date().toISOString(),
              source: 'scheduler'
            });
            
            mqttService.publishMessage(topic, message);
            
            // Execute based on device type
            if (schedule.device_type === 'fan') {
              await adafruitService.turnOffFan();
            } else if (schedule.device_type === 'light') {
              await adafruitService.turnOffLight();
            }
          }
        }
        
        // Mark schedule as executed
        await DeviceScheduleModel.markScheduleAsExecuted(schedule.schedule_id);
        executedSchedules.push(schedule);
      } catch (scheduleError) {
        console.error(`Error executing schedule ${schedule.schedule_id}:`, scheduleError);
        // Continue with other schedules even if one fails
      }
    }
    
    res.status(200).json({
      success: true,
      count: executedSchedules.length,
      data: executedSchedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle device by AI system (no HTTP response)
// @access  Internal only
exports.toggleDeviceAI = async (deviceId, action, reason) => {
  try {
    // Thêm log chi tiết để debug
    console.log(`=== AI SYSTEM ACTION ===`);
    console.log(`Device ID: ${deviceId}`);
    console.log(`Action: ${action}`);
    console.log(`Reason: ${reason}`);
    
    // Validate input
    if (!action || (action !== 'ON' && action !== 'OFF')) {
      throw new Error('Please provide valid action (ON or OFF)');
    }
    
    // Get device
    const device = await DeviceModel.getDeviceById(deviceId);
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    console.log(`Found device: ${device.name}, current status: ${device.status}`);
    
    // Update device status
    const status = action === 'ON' ? 'active' : 'inactive';
    const updatedDevice = await DeviceModel.updateDevice(deviceId, { status });
    
    console.log(`Device status updated to: ${status}`);
    
    // Send MQTT message
    const topic = `yolohome/devices/${device.device_id}/control`;
    const message = JSON.stringify({
      device_id: device.device_id,
      action,
      status,
      timestamp: new Date().toISOString(),
      source: 'ai_system',
      reason: reason || 'AI triggered action'
    });
    
    console.log(`Sending MQTT message to topic: ${topic}`);
    mqttService.publishMessage(topic, message);
    
    // Also update Adafruit feed directly
    if (device.type === 'fan' || device.type === 'light') {
      try {
        const value = action === 'ON' ? 1 : 0;
        console.log(`Updating Adafruit feed for ${device.type} to value: ${value}`);
        await adafruitService.updateFeed(device.type, value);
        console.log(`Adafruit feed updated successfully`);
      } catch (feedError) {
        console.error(`Error updating Adafruit feed for ${device.type}:`, feedError);
      }
    }
    
    console.log(`=== AI ACTION COMPLETE ===`);
    return updatedDevice;
  } catch (error) {
    console.error(`Error in toggleDeviceAI: ${error.message}`);
    throw error;
  }
};

// @desc    Enable AI mode for fan
// @route   POST /api/devices/aimode/enable
// @access  Private
exports.enableAIMode = async (req, res, next) => {
  try {
    // Enable AI mode in adafruit service
    const result = await adafruitService.enableAIMode();
    
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to enable AI mode. Check Adafruit IO connection.'
      });
    }
    
    // Turn on the fan initially when AI mode is enabled
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    if (fanDevice) {
      await DeviceModel.updateDevice(fanDevice.device_id, { status: 'active' });
      
      // Log this control action
      await DeviceModel.createControlLog({
        user_id: req.user ? req.user.id : 1,
        device_id: fanDevice.device_id,
        action: 'AI Mode Enabled',
        description: 'AI Mode for fan has been enabled'
      });
    }
    
    // Check temperature immediately 
    adafruitService.checkTemperatureAndManageFan(async (deviceType, deviceStatus) => {
      if (deviceType === 'fan') {
        await DeviceModel.updateDeviceByTypeWithStatus(deviceType, deviceStatus);
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'AI mode for fan enabled successfully',
      data: {
        aiModeEnabled: true,
        temperatureThreshold: adafruitService.temperatureThreshold,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable AI mode for fan
// @route   POST /api/devices/aimode/disable
// @access  Private
exports.disableAIMode = async (req, res, next) => {
  try {
    // Disable AI mode in adafruit service
    const result = await adafruitService.disableAIMode();
    
    // Log this control action
    const fanDevice = await DeviceModel.findDeviceByType('fan');
    if (fanDevice) {
      await DeviceModel.createControlLog({
        user_id: req.user ? req.user.id : 1,
        device_id: fanDevice.device_id,
        action: 'AI Mode Disabled',
        description: 'AI Mode for fan has been disabled'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'AI mode for fan disabled successfully',
      data: {
        aiModeEnabled: false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI mode status
// @route   GET /api/devices/aimode/status
// @access  Private
exports.getAIModeStatus = async (req, res, next) => {
  try {
    // Get current AI mode status
    const aiModeEnabled = adafruitService.isAIModeEnabled();
    
    res.status(200).json({
      success: true,
      data: {
        aiModeEnabled: aiModeEnabled,
        temperatureThreshold: adafruitService.temperatureThreshold,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};
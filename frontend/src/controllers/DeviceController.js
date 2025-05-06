import DeviceModel from '../models/DeviceModel';
import apiService from '../services/apiService';
import deviceService from '../services/deviceService';

class DeviceController {
  static async getAllDevices() {
    try {
      // Fetch devices from the API through deviceService
      const devices = await deviceService.getDevices();
      
      // Map backend properties to frontend model properties
      return devices.map(device => new DeviceModel({
        id: device.device_id,
        name: device.device_name,
        type: device.device_type,
        location: device.dlocation,
        status: device.status,
        lastUpdated: device.created_time || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }
  
  static async getDeviceById(id) {
    try {
      const response = await apiService.get(`/devices/${id}`);
      
      if (response.data && response.data.data) {
        const device = response.data.data;
        return new DeviceModel({
          id: device.device_id,
          name: device.device_name,
          type: device.device_type,
          location: device.dlocation,
          status: device.status,
          lastUpdated: device.created_time || new Date().toISOString()
        });
      }
      
        throw new Error('Device not found');
    } catch (error) {
      console.error(`Error fetching device with id ${id}:`, error);
      throw error;
    }
  }
  
  static async updateDeviceStatus(id, status) {
    try {
      // Call the API to update the device status
      const response = await apiService.put(`/devices/${id}`, { status });
      return new DeviceModel({
        id: response.data.device_id,
        name: response.data.device_name,
        type: response.data.device_type,
        location: response.data.dlocation,
        status: response.data.status,
        lastUpdated: response.data.created_time || new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating device status for id ${id}:`, error);
      throw error;
    }
  }
  
  static async getDeviceStats() {
    try {
      // Fetch stats from the API
      const response = await apiService.get('/devices/stats');
      
      if (response.data && response.data.data) {
        return {
          total: parseInt(response.data.data.total) || 0,
          online: parseInt(response.data.data.online) || 0,
          offline: parseInt(response.data.data.offline) || 0
        };
      }
      
      throw new Error('Invalid device stats format received from API');
    } catch (error) {
      console.error('Error fetching device stats:', error);
      throw error;
    }
  }
  
  static async toggleDeviceByType(deviceType) {
    try {
      // Call the API endpoint to toggle devices by type
      // Pass device_type instead of type to match backend expectations
      const response = await apiService.post('/devices/toggle-by-type', { device_type: deviceType });
      
      // Handle response data
      if (response.data) {
        return {
          success: response.data.success,
          devices: response.data.data ? response.data.data.map(device => new DeviceModel({
            id: device.device_id,
            name: device.device_name,
            type: device.device_type,
            location: device.dlocation,
            status: device.status,
            lastUpdated: device.created_time || new Date().toISOString()
          })) : []
        };
      }
      
      return {
        success: false,
        devices: []
      };
    } catch (error) {
      console.error(`Error toggling devices of type ${deviceType}:`, error);
      throw error;
    }
  }
  
  static async controlFan(action) {
    try {
      // Use the deviceService to control the fan
      const result = await deviceService.controlFan(action);
      
      // Get the latest device state directly after sending command
      // This ensures we get the status after the feed update and database sync
      await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for DB update
      const devices = await this.getAllDevices();
      const fanDevice = devices.find(device => device.type === 'fan');
      
      return {
        success: result.success,
        message: result.message,
        data: fanDevice || result.data
      };
    } catch (error) {
      console.error(`Error controlling fan (${action}):`, error);
      throw error;
    }
  }
  
  static async controlLight(action) {
    try {
      // Use the deviceService to control the light
      const result = await deviceService.controlLight(action);
      
      // Get the latest device state directly after sending command
      // This ensures we get the status after the feed update and database sync
      await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for DB update
      const devices = await this.getAllDevices();
      const lightDevice = devices.find(device => device.type === 'light');
      
      return {
        success: result.success,
        message: result.message,
        data: lightDevice || result.data
      };
    } catch (error) {
      console.error(`Error controlling light (${action}):`, error);
      throw error;
    }
  }
  
  /**
   * Get all schedules for a specific device type
   * @param {string} deviceType - Type of device (fan, light)
   * @returns {Promise<Array>} - List of schedules
   */
  static async getDeviceSchedules(deviceType) {
    try {
      return await deviceService.getDeviceSchedules(deviceType);
    } catch (error) {
      console.error(`Error fetching schedules for ${deviceType}:`, error);
      return [];
    }
  }
  
  /**
   * Schedule a device to turn on/off at a specific time
   * @param {string} deviceType - Type of device (fan, light)
   * @param {string} action - Action to perform (on, off)
   * @param {string} scheduledTime - ISO string of scheduled time
   * @returns {Promise<Object>} - Created schedule
   */
  static async scheduleDevice(deviceType, action, scheduledTime) {
    try {
      return await deviceService.scheduleDevice(deviceType, action, scheduledTime);
    } catch (error) {
      console.error(`Error scheduling ${deviceType}:`, error);
      throw error;
    }
  }
  
  /**
   * Schedule a device to operate during a time range
   * @param {string} deviceType - Type of device (fan, light)
   * @param {string} startTime - ISO string of range start time
   * @param {string} endTime - ISO string of range end time
   * @returns {Promise<Object>} - Created schedule
   */
  static async scheduleDeviceRange(deviceType, startTime, endTime) {
    try {
      return await deviceService.scheduleDeviceRange(deviceType, startTime, endTime);
    } catch (error) {
      console.error(`Error scheduling ${deviceType} for time range:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a specific schedule
   * @param {string} scheduleId - ID of the schedule to cancel
   * @returns {Promise<Object>} - Result of cancellation
   */
  static async cancelSchedule(scheduleId) {
    try {
      return await deviceService.cancelSchedule(scheduleId);
    } catch (error) {
      console.error(`Error canceling schedule ${scheduleId}:`, error);
      throw error;
    }
  }
}

export default DeviceController;
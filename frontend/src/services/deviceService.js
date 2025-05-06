import apiService from './apiService';

const deviceService = {
  // Get all devices
  async getDevices() {
    try {
      const response = await apiService.get('/devices');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },
  
  // Get device by ID
  async getDeviceById(id) {
    try {
      // In a real application, we would call the API
      const response = await apiService.get(`/devices/${id}`);
      return response.data.data;
      
    } catch (error) {
      console.error(`Error fetching device with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Update device status
  async updateDeviceStatus(id, status) {
    try {
      // In a real application, we would call the API
      const response = await apiService.put(`/devices/${id}`, { status });
      return response.data.data;
      
    } catch (error) {
      console.error(`Error updating device status for ID ${id}:`, error);
      throw error;
    }
  },
  
  // Toggle device by type
  async toggleDevicesByType(type) {
    try {
      // In a real application, we would call the API
      const response = await apiService.post(`/devices/toggle-by-type`, { device_type: type });
      return response.data;
      
    } catch (error) {
      console.error(`Error toggling devices of type ${type}:`, error);
      throw error;
    }
  },
  
  // Direct fan control
  async controlFan(action) {
    try {
      // Validate action
      if (action !== 'on' && action !== 'off') {
        throw new Error('Invalid action. Use "on" or "off"');
      }
      
      const response = await apiService.post(`/devices/fan/${action}`);
      return response.data;
    } catch (error) {
      console.error(`Error controlling fan (action: ${action}):`, error);
      throw error;
    }
  },
  
  // Direct light control
  async controlLight(action) {
    try {
      // Validate action
      if (action !== 'on' && action !== 'off') {
        throw new Error('Invalid action. Use "on" or "off"');
      }
      
      const response = await apiService.post(`/devices/light/${action}`);
      return response.data;
    } catch (error) {
      console.error(`Error controlling light (action: ${action}):`, error);
      throw error;
    }
  },
  
  // Get scheduled tasks for a device
  async getDeviceSchedules(deviceType) {
    try {
      const response = await apiService.get(`/devices/${deviceType}/schedules`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching schedules for ${deviceType}:`, error);
      // If API doesn't exist yet, return empty array instead of throwing error
      return [];
    }
  },
  
  // Schedule a device to turn on or off at a specific time
  async scheduleDevice(deviceType, action, scheduledTime) {
    try {
      const response = await apiService.post(`/devices/${deviceType}/schedule`, {
        action,
        scheduledTime
      });
      return response.data;
    } catch (error) {
      console.error(`Error scheduling ${deviceType} ${action} at ${scheduledTime}:`, error);
      throw error;
    }
  },
  
  // Schedule a device to operate during a time range
  async scheduleDeviceRange(deviceType, startTime, endTime) {
    try {
      const response = await apiService.post(`/devices/${deviceType}/schedule-range`, {
        startTime,
        endTime
      });
      return response.data;
    } catch (error) {
      console.error(`Error scheduling ${deviceType} from ${startTime} to ${endTime}:`, error);
      throw error;
    }
  },
  
  // Cancel a scheduled task
  async cancelSchedule(scheduleId) {
    try {
      const response = await apiService.delete(`/devices/schedules/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error(`Error canceling schedule ${scheduleId}:`, error);
      throw error;
    }
  }
};

export default deviceService;
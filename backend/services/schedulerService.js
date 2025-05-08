const DeviceScheduleModel = require('../models/deviceScheduleModel');
const DeviceModel = require('../models/deviceModel');
const mqttService = require('./mqttService');
const adafruitService = require('./adafruitService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.aiCheckInterval = null;
    this.checkInterval = 10000; // Check every 10 seconds by default
    this.aiModeCheckInterval = 30000; // Check temperature every 30 seconds for AI mode
  }

  /**
   * Start the scheduler service
   * @param {number} interval - Check interval in milliseconds (optional)
   */
  start(interval = null) {
    if (this.isRunning) {
      console.log('Scheduler service is already running');
      return;
    }

    if (interval) {
      this.checkInterval = interval;
    }

    console.log(`Starting scheduler service, checking every ${this.checkInterval/1000} seconds`);
    
    this.isRunning = true;
    this.interval = setInterval(() => this.checkAndExecuteSchedules(), this.checkInterval);
    
    // Start AI mode temperature check
    this.startAIModeCheck();
    
    // Run immediately on start
    this.checkAndExecuteSchedules();
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler service is not running');
      return;
    }

    console.log('Stopping scheduler service');
    clearInterval(this.interval);
    clearInterval(this.aiCheckInterval);
    this.isRunning = false;
    this.interval = null;
    this.aiCheckInterval = null;
  }

  /**
   * Start AI mode temperature check
   */
  startAIModeCheck() {
    if (this.aiCheckInterval) {
      clearInterval(this.aiCheckInterval);
    }
    
    console.log(`Starting AI mode temperature check every ${this.aiModeCheckInterval/1000} seconds`);
    
    // Run AI temperature check at regular intervals
    this.aiCheckInterval = setInterval(() => this.checkTemperatureForAIMode(), this.aiModeCheckInterval);
    
    // Run immediately on start
    this.checkTemperatureForAIMode();
  }
  
  /**
   * Check temperature and control fan if AI mode is enabled
   */
  async checkTemperatureForAIMode() {
    try {
      // Check if AI mode is enabled
      if (!adafruitService.isAIModeEnabled()) {
        return;
      }
      
      logger.info('AI Mode: Checking temperature for fan control');
      
      // Check temperature and manage fan
      await adafruitService.checkTemperatureAndManageFan(async (deviceType, deviceStatus) => {
        if (deviceType === 'fan') {
          await DeviceModel.updateDeviceByTypeWithStatus(deviceType, deviceStatus);
          logger.info(`AI Mode: Fan status updated to ${deviceStatus}`);
        }
      });
    } catch (error) {
      logger.error(`Error in AI mode temperature check: ${error.message}`);
    }
  }

  /**
   * Check for pending schedules and execute them
   */
  async checkAndExecuteSchedules() {
    try {
      // Get pending schedules
      const pendingSchedules = await DeviceScheduleModel.getPendingSchedules();
      
      if (pendingSchedules.length === 0) {
        return;
      }
      
      console.log(`Found ${pendingSchedules.length} pending schedules to execute`);
      
      // Process each pending schedule
      for (const schedule of pendingSchedules) {
        try {
          // Different handling based on schedule type
          if (schedule.schedule_type === 'once') {
            // Execute the one-time schedule
            const action = schedule.action === 'on' ? 'ON' : 'OFF';
            const status = schedule.action === 'on' ? 'active' : 'inactive';
            
            console.log(`Executing schedule ${schedule.schedule_id}: ${action} ${schedule.device_type}`);
            
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
            
            // Mark as executed
            await DeviceScheduleModel.markScheduleAsExecuted(schedule.schedule_id);
          } else if (schedule.schedule_type === 'range') {
            // For range type schedules, check if we're at start or end time
            const now = new Date();
            const startTime = new Date(schedule.start_time);
            const endTime = new Date(schedule.end_time);
            
            // If we're close to the start time - turn ON
            if (Math.abs(now - startTime) < 60000) { // Within 1 minute
              console.log(`Executing range schedule ${schedule.schedule_id} START: ON ${schedule.device_type}`);
              
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
              console.log(`Executing range schedule ${schedule.schedule_id} END: OFF ${schedule.device_type}`);
              
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
              
              // Mark as executed since we've reached the end time
              await DeviceScheduleModel.markScheduleAsExecuted(schedule.schedule_id);
            }
          }
        } catch (scheduleError) {
          console.error(`Error executing schedule ${schedule.schedule_id}:`, scheduleError);
          // Continue with other schedules even if one fails
        }
      }
    } catch (error) {
      console.error('Error checking schedules:', error);
    }
  }
}

// Create and export the singleton instance
const schedulerService = new SchedulerService();
module.exports = schedulerService; 
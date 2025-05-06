const DeviceScheduleModel = require('../models/deviceScheduleModel');
const DeviceModel = require('../models/deviceModel');
const mqttService = require('./mqttService');
const adafruitService = require('./adafruitService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 10000; // Check every 10 seconds by default
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
    this.isRunning = false;
    this.interval = null;
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
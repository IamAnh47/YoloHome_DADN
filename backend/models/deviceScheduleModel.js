const db = require('../config/db');

class DeviceScheduleModel {
  /**
   * Get all schedules for a specific device
   * @param {number} deviceId - The device ID
   * @returns {Promise<Array>} List of schedules
   */
  static async getSchedulesByDeviceId(deviceId) {
    try {
      const query = `
        SELECT ds.*, d.device_name, d.device_type 
        FROM device_schedule ds
        JOIN device d ON ds.device_id = d.device_id
        WHERE ds.device_id = $1
        ORDER BY ds.start_time
      `;
      
      const result = await db.query(query, [deviceId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting device schedules: ${error.message}`);
    }
  }

  /**
   * Get all schedules for a specific device type (e.g., fan, light)
   * @param {string} deviceType - The device type
   * @returns {Promise<Array>} List of schedules
   */
  static async getSchedulesByDeviceType(deviceType) {
    try {
      const query = `
        SELECT ds.*, d.device_name, d.device_type 
        FROM device_schedule ds
        JOIN device d ON ds.device_id = d.device_id
        WHERE d.device_type = $1
        ORDER BY ds.start_time
      `;
      
      const result = await db.query(query, [deviceType]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting device schedules by type: ${error.message}`);
    }
  }

  /**
   * Create a schedule for a device
   * @param {Object} scheduleData - Schedule details
   * @returns {Promise<Object>} Created schedule
   */
  static async createSchedule(scheduleData) {
    try {
      const { 
        deviceId, 
        scheduleType, 
        action, 
        startTime, 
        endTime = null,
        createdBy 
      } = scheduleData;

      const query = `
        INSERT INTO device_schedule (
          device_id, schedule_type, action, start_time, end_time, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        deviceId,
        scheduleType,
        action,
        startTime,
        endTime,
        createdBy
      ];
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating device schedule: ${error.message}`);
    }
  }

  /**
   * Delete a schedule
   * @param {number} scheduleId - The schedule ID to delete
   * @returns {Promise<boolean>} True if successful
   */
  static async deleteSchedule(scheduleId) {
    try {
      const query = 'DELETE FROM device_schedule WHERE schedule_id = $1 RETURNING schedule_id';
      const result = await db.query(query, [scheduleId]);
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error deleting device schedule: ${error.message}`);
    }
  }

  /**
   * Get a schedule by ID
   * @param {number} scheduleId - The schedule ID
   * @returns {Promise<Object>} Schedule details
   */
  static async getScheduleById(scheduleId) {
    try {
      const query = `
        SELECT ds.*, d.device_name, d.device_type 
        FROM device_schedule ds
        JOIN device d ON ds.device_id = d.device_id
        WHERE ds.schedule_id = $1
      `;
      
      const result = await db.query(query, [scheduleId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting device schedule: ${error.message}`);
    }
  }

  /**
   * Get all upcoming schedules that need to be executed
   * @returns {Promise<Array>} List of pending schedules
   */
  static async getPendingSchedules() {
    try {
      const query = `
        SELECT ds.*, d.device_name, d.device_type 
        FROM device_schedule ds
        JOIN device d ON ds.device_id = d.device_id
        WHERE ds.executed = FALSE 
        AND ds.start_time <= NOW()
        ORDER BY ds.start_time
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting pending schedules: ${error.message}`);
    }
  }

  /**
   * Mark a schedule as executed
   * @param {number} scheduleId - The schedule ID
   * @returns {Promise<Object>} Updated schedule
   */
  static async markScheduleAsExecuted(scheduleId) {
    try {
      const query = `
        UPDATE device_schedule
        SET executed = TRUE
        WHERE schedule_id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [scheduleId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error marking schedule as executed: ${error.message}`);
    }
  }
}

module.exports = DeviceScheduleModel; 
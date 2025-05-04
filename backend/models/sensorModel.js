const db = require('../config/db');

class SensorModel {
  static async getAllSensors() {
    try {
      const query = `
        SELECT s.sensor_id, s.sensor_type, s.model, s.unit, s.description
        FROM sensor s
        ORDER BY s.sensor_type
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting all sensors: ${error.message}`);
    }
  }
  
  static async getSensorById(id) {
    try {
      const query = `
        SELECT s.sensor_id, s.sensor_type, s.model, s.unit, s.description
        FROM sensor s
        WHERE s.sensor_id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting sensor by ID: ${error.message}`);
    }
  }
  
  static async createSensor(sensorData) {
    try {
      const query = `
        INSERT INTO sensor (sensor_type, model, unit, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [
        sensorData.type,
        sensorData.model,
        sensorData.unit,
        sensorData.description
      ];
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating sensor: ${error.message}`);
    }
  }
  
  static async updateSensor(id, sensorData) {
    try {
      // Build the SET clause dynamically
      const setClause = Object.keys(sensorData)
        .map((key, index) => {
          // Map the JS property names to DB column names
          const columnMapping = {
            type: 'sensor_type',
            model: 'model',
            unit: 'unit',
            description: 'description'
          };
          
          return `${columnMapping[key]} = $${index + 1}`;
        })
        .join(', ');
      
      // Build the query
      const query = `
        UPDATE sensor
        SET ${setClause}
        WHERE sensor_id = $${Object.keys(sensorData).length + 1}
        RETURNING *
      `;
      
      // Build the values array
      const values = [...Object.values(sensorData), id];
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating sensor: ${error.message}`);
    }
  }
  
  static async deleteSensor(id) {
    try {
      const query = 'DELETE FROM sensor WHERE sensor_id = $1 RETURNING sensor_id';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      return true;
    } catch (error) {
      throw new Error(`Error deleting sensor: ${error.message}`);
    }
  }
  
  static async getSensorData(sensorId, limit = 100) {
    try {
      const query = `
        SELECT sd.data_id, sd.sensor_id, sd.svalue, sd.recorded_time
        FROM sensor_data sd
        WHERE sd.sensor_id = $1
        ORDER BY sd.recorded_time DESC
        LIMIT $2
      `;
      
      const result = await db.query(query, [sensorId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting sensor data: ${error.message}`);
    }
  }
  
  static async getLatestSensorData(sensorId) {
    try {
      const query = `
        SELECT data_id, sensor_id, svalue, recorded_time
        FROM sensor_data
        WHERE sensor_id = $1
        ORDER BY recorded_time DESC
        LIMIT 1
      `;
      
      const result = await db.query(query, [sensorId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting latest data for sensor: ${error.message}`);
    }
  }
  
  static async insertSensorData(sensorId, value, timestamp = null) {
    try {
      let query;
      let values;
      
      if (timestamp) {
        query = `
          INSERT INTO sensor_data (sensor_id, svalue, recorded_time)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        values = [sensorId, value, timestamp];
      } else {
        query = `
          INSERT INTO sensor_data (sensor_id, svalue)
          VALUES ($1, $2)
          RETURNING *
        `;
        values = [sensorId, value];
      }
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error inserting sensor data: ${error.message}`);
    }
  }
  
  static async getSensorByType(sensorType) {
    try {
      const query = `
        SELECT sensor_id, sensor_type, model, unit, description
        FROM sensor
        WHERE sensor_type = $1
        LIMIT 1
      `;
      
      const result = await db.query(query, [sensorType]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting sensor by type: ${error.message}`);
    }
  }
  
  static async getSensorHistory(sensorId, limit = 24, timeRange = 'day') {
    try {
      // For day view: Get the 30 most recent readings for the current day
      if (timeRange === 'day') {
        const query = `
          SELECT data_id, sensor_id, svalue, recorded_time
          FROM sensor_data
          WHERE sensor_id = $1
          AND recorded_time >= CURRENT_DATE
          ORDER BY recorded_time DESC
          LIMIT 30
        `;
        
        const result = await db.query(query, [sensorId]);
        return result.rows;
      } 
      // For week view: Get daily averages for the past 7 days
      else if (timeRange === 'week') {
        const query = `
          SELECT 
            sensor_id,
            DATE(recorded_time) as day,
            AVG(CAST(svalue AS FLOAT)) as svalue,
            MAX(recorded_time) as recorded_time
          FROM sensor_data
          WHERE sensor_id = $1
          AND recorded_time >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY sensor_id, DATE(recorded_time)
          ORDER BY day DESC
          LIMIT 7
        `;
        
        const result = await db.query(query, [sensorId]);
        return result.rows;
      }
      // Default case: return a limited number of records
      else {
        const query = `
          SELECT data_id, sensor_id, svalue, recorded_time
          FROM sensor_data
          WHERE sensor_id = $1
          ORDER BY recorded_time DESC
          LIMIT $2
        `;
        
        const result = await db.query(query, [sensorId, limit]);
        return result.rows;
      }
    } catch (error) {
      throw new Error(`Error getting sensor history: ${error.message}`);
    }
  }
}

module.exports = SensorModel;
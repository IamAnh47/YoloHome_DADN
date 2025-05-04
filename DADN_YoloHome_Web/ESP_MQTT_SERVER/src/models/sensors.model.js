const pool = require('../clients/db');

const createSensorDataTable = async () => {
  try {
    // PostgreSQL version
    const query = `
      CREATE TABLE IF NOT EXISTS sensor_data (
        data_id SERIAL PRIMARY KEY,
        sensor_id INT NOT NULL,
        svalue FLOAT NOT NULL,
        recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE
      );
    `;
    
    await pool.query(query);
    console.log('Sensor data table initialized successfully');
  } catch (err) {
    console.error('Error creating sensor_data table:', err.message);
  }
};

// Initialize the sensor_data table
createSensorDataTable();

const getAllSensorData = async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM sensor_data ORDER BY recorded_time DESC LIMIT 5'
    );
    return result.rows;
  } catch (err) {
    throw new Error(err);
  }
};

const getSensorDataById = async (id) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sensor_data WHERE data_id = $1',
      [id]
    );
    return result.rows[0];
  } catch (err) {
    throw new Error(err);
  }
};

const getSensorDataWithinRange = async (range) => {
  try {
    // PostgreSQL version using INTERVAL syntax
    const query = `
      SELECT *
      FROM sensor_data
      WHERE recorded_time BETWEEN NOW() - INTERVAL '${range.timeEnd} hours'
      AND NOW() - INTERVAL '${range.timeStart} hours'
      ORDER BY recorded_time DESC;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    throw new Error(err);
  }
};

const createSensorData = async (dataObj) => {
  const query = `
    INSERT INTO sensor_data (sensor_id, svalue, recorded_time)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [dataObj.sensor_id, dataObj.svalue, dataObj.recorded_time];
  try {
    const result = await pool.query(query, values);
    console.log("Insert thành công:", result.rows[0]); // Mn chỉ cần comment dòng này nếu không muốn in ra
    return result.rows[0];
  } catch (err) {
    console.error('Error in model createSensorData:', err.message);
    throw new Error(err);
  }
};

const deleteSensorData = async (id) => {
  try {
    const query = 'DELETE FROM sensor_data WHERE data_id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (err) {
    throw new Error(err);
  }
};

const getSensorByType = async (sensorType) => {
  // Mapping feed names to sensor types
  const typeMapping = {
    'temperature': 'temperature',
    'humidity': 'humidity',
    'light': 'light',
    'fan': 'fan',
    // Add fan and light control mappings
  };

  const mappedType = typeMapping[sensorType.toLowerCase()] || sensorType;

  const query = `SELECT * FROM sensor WHERE sensor_type = $1 LIMIT 1`;
  try {
    const result = await pool.query(query, [mappedType]);
    return result.rows[0];
  } catch (err) {
    console.error('Error in getSensorByType:', err.message);
    throw new Error(err);
  }
};

module.exports = {
  getAllSensorData,
  getSensorDataById,
  getSensorDataWithinRange,
  createSensorData,
  deleteSensorData,
  getSensorByType
};

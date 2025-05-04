const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const dbConfig = require('../config/db.config');

// Define database schema for PostgreSQL
const postgresSchema = `
-- Drop tables if they exist
DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS sensor;

-- Table Sensors : Sensing sensor information
CREATE TABLE IF NOT EXISTS sensor (
  sensor_id SERIAL PRIMARY KEY,
  sensor_type VARCHAR(50) NOT NULL,
  model VARCHAR(50),
  unit VARCHAR(20),
  description TEXT
);

-- Table SensorData : Save data measured from the sensor
CREATE TABLE IF NOT EXISTS sensor_data (
  data_id SERIAL PRIMARY KEY,
  sensor_id INT NOT NULL,
  svalue FLOAT NOT NULL,
  recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Insert initial sensors
INSERT INTO sensor (sensor_type, model, unit, description) VALUES
('temperature', 'TMP36', 'Celsius', 'Temperature sensor for room monitoring'),
('humidity', 'DHT22', 'Percentage', 'Humidity sensor for environment control'),
('light', 'LDR', 'Lux', 'Measures ambient light intensity for controlling lights');
`;

// Database initialization
async function initializeDatabase() {
  console.log('Initializing PostgreSQL database...');
  
  // Create connection pool
  const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port
  });

  let client;
  
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL database');

    // Execute schema SQL
    console.log('Creating database schema...');
    await client.query(postgresSchema);
    console.log('Schema created successfully.');

    // Verify database setup
    const sensorResult = await client.query('SELECT COUNT(*) as count FROM sensor');
    console.log(`Sensors in database: ${sensorResult.rows[0].count}`);

    console.log('Database initialization completed successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the initialization function
initializeDatabase(); 
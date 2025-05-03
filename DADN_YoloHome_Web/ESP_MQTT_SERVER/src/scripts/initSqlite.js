const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const dbConfig = require('../config/db.config');

// Define database schema for SQLite
const sqliteSchema = `
-- Drop tables if they exist
DROP TABLE IF EXISTS sensor_logs;
DROP TABLE IF EXISTS device_logs;
DROP TABLE IF EXISTS equipped_with;
DROP TABLE IF EXISTS control;
DROP TABLE IF EXISTS alert;
DROP TABLE IF EXISTS alert_config;
DROP TABLE IF EXISTS configuration;
DROP TABLE IF EXISTS control_logs;
DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS sensor;
DROP TABLE IF EXISTS device;
DROP TABLE IF EXISTS users;

-- Table Users : Save user information
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  user_password TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

-- Table Devices : Save equipment information
CREATE TABLE device (
  device_id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  dlocation TEXT,
  status TEXT CHECK ( status IN ( 'active', 'inactive' ) ) DEFAULT 'inactive',
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Sensors : Sensing sensor information (each device has many sensors)
CREATE TABLE sensor (
  sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_type TEXT NOT NULL,
  model TEXT,
  unit TEXT,
  description TEXT
);

-- Table SensorData : Save data measured from the sensor
CREATE TABLE sensor_data (
  data_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_id INTEGER NOT NULL,
  svalue REAL NOT NULL,
  recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Insert initial sensors
INSERT INTO sensor (sensor_type, model, unit, description) VALUES
('Temperature', 'TMP36', 'Celsius', 'Temperature sensor for room monitoring'),
('Humidity', 'DHT22', 'Percentage', 'Humidity sensor for environment control'),
('Light', 'LDR', 'Lux', 'Measures ambient light intensity for controlling lights');
`;

// Database initialization
async function initializeDatabase() {
  console.log('Initializing SQLite database...');
  
  const dbPath = dbConfig.path;
  console.log(`Database path: ${dbPath}`);

  try {
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Execute schema SQL
    console.log('Creating database schema...');
    await db.exec(sqliteSchema);
    console.log('Schema created successfully.');

    // Verify database setup
    const sensorCount = await db.get('SELECT COUNT(*) as count FROM sensor');
    console.log(`Sensors in database: ${sensorCount.count}`);

    console.log('Database initialization completed successfully.');
    
    // Close the database connection
    await db.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

// Run the initialization function
initializeDatabase(); 
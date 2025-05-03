-- SQLite version of the schema.sql file

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

-- Table Controllogs : Save device control history
CREATE TABLE control_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id INTEGER NOT NULL,
  cl_action TEXT NOT NULL,
  description TEXT,
  executed_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE
);

-- Table Configurations : The weak entity of the sensors (configuration)
CREATE TABLE configuration (
  config_id INTEGER NOT NULL,
  sensor_id INTEGER NOT NULL,
  cparameter TEXT NOT NULL,
  cvalue TEXT NOT NULL,
  updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id, sensor_id),
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Table AlertConfig : User-defined alert thresholds
CREATE TABLE alert_config (
  config_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sensor_type TEXT NOT NULL,
  min_value REAL NOT NULL,
  max_value REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE (user_id, sensor_type)
);

-- Table Alerts : Warning information
CREATE TABLE alert (
  alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  sensor_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL,
  amessage TEXT NOT NULL,
  alerted_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending',
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Table Control : Save equipment information controlled by users
CREATE TABLE control (
  user_id INTEGER NOT NULL,
  device_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, device_id),
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE
);

-- Table Equipped_with : Determine which device is equipped
CREATE TABLE equipped_with (
  device_id INTEGER NOT NULL,
  sensor_id INTEGER NOT NULL,
  PRIMARY KEY (device_id, sensor_id),
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

CREATE TABLE device_logs (
  log_id INTEGER PRIMARY KEY,
  device_id INTEGER REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES control_logs (log_id) ON DELETE CASCADE
);

CREATE TABLE sensor_logs (
  log_id INTEGER PRIMARY KEY,
  sensor_id INTEGER REFERENCES sensor (sensor_id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES control_logs (log_id) ON DELETE CASCADE
);

-- Insert initial data

-- Create default admin user
INSERT INTO users (user_id, username, user_password, email)
VALUES (
  1,
  'admin',
  -- Password: 'tuan' hashed with bcrypt
  '$2a$10$/TCFfdNZcQBSf5RB2a5V3uGafrbunZB3OdvrwiBeT1lvrH6/FYOcG',
  'admin@example.com'
);

-- Insert default alert configurations for admin user
INSERT INTO alert_config (user_id, sensor_type, min_value, max_value, is_active) 
VALUES
(1, 'temperature', 18.0, 30.0, 1),
(1, 'humidity', 30.0, 70.0, 1);

-- Add data to Devices table
INSERT INTO device (device_name, device_type, dlocation) VALUES
('Smart Light', 'Lighting', 'Living Room'),
('Thermostat', 'Temperature Control', 'Bedroom'),
('Camera', 'Security', 'Front Door'),
('Air Purifier', 'Air Quality', 'Office'),
('Smart Lock', 'Security', 'Main Entrance');

-- Add data to Sensors table
INSERT INTO sensor (sensor_type, model, unit, description) VALUES
('Temperature', 'TMP36', 'Celsius', 'Temperature sensor for room monitoring'),
('Humidity', 'DHT22', 'Percentage', 'Humidity sensor for environment control'),
('Motion', 'PIR Sensor', 'Boolean', 'Detects movement'),
('Air Quality', 'MQ135', 'PPM', 'Measures air quality index'),
('Light', 'LDR', 'Lux', 'Measures ambient light intensity');

-- Add data to Configurations table
INSERT INTO configuration (config_id, sensor_id, cparameter, cvalue) VALUES
(1, 1, 'Threshold', '30'),
(2, 2, 'MinHumidity', '40'),
(3, 3, 'Sensitivity', 'High'),
(4, 4, 'AQI Limit', '200'),
(5, 5, 'Light Level', '300');

-- Add data to Alerts table
INSERT INTO alert (device_id, sensor_id, alert_type, amessage) VALUES
(1, 1, 'Overheat', 'Temperature exceeded threshold!'),
(2, 2, 'Low Humidity', 'Humidity dropped below minimum!');

-- Add data to Control table
INSERT INTO control (user_id, device_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5);

-- Add data to Equipped_with table
INSERT INTO equipped_with (device_id, sensor_id) VALUES
(1, 1), (2, 1), (3, 1), (4, 1), (5, 1);

-- Add data to Device_logs table
INSERT INTO device_logs (log_id, device_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5);

-- Add data to Sensor_logs table
INSERT INTO sensor_logs (log_id, sensor_id) VALUES
(1, 1), (2, 2), (1, 3), (1, 4), (1, 5);

-- Add data to SensorData table
INSERT INTO sensor_data (sensor_id, svalue) VALUES
(1, 25.5),
(2, 60.2),
(3, 1.0),
(4, 150.3),
(5, 500.0);

-- Add data to ControlLogs table
INSERT INTO control_logs (user_id, device_id, cl_action, description) VALUES
(1, 1, 'Turn On', 'Turned on smart light'),
(1, 2, 'Adjust Temperature', 'Set thermostat to 22°C'),
(1, 3, 'Enable Security', 'Activated security camera'),
(1, 4, 'Start Purifier', 'Turned on air purifier'),
(1, 5, 'Lock Door', 'Locked the main entrance smart lock'); 
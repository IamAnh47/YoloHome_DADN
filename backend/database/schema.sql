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
  user_id SERIAL PRIMARY KEY,
  username VARCHAR (50) UNIQUE NOT NULL,
  user_password VARCHAR (255) NOT NULL,
  email VARCHAR (100) UNIQUE NOT NULL
);

-- Table Devices : Save equipment information
CREATE TABLE device (
  device_id SERIAL PRIMARY KEY,
  device_name VARCHAR (100) NOT NULL,
  device_type VARCHAR (50) NOT NULL,
  dlocation VARCHAR (100),
  status VARCHAR (10) CHECK ( status IN ( 'active', 'inactive' ) ) DEFAULT 'inactive',
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Sensors : Sensing sensor information (each device has many sensors)
CREATE TABLE sensor (
  sensor_id SERIAL PRIMARY KEY,
  sensor_type VARCHAR (50) NOT NULL,
  model VARCHAR (50),
  unit VARCHAR (20),
  description TEXT
);

-- Table SensorData : Save data measured from the sensor
CREATE TABLE sensor_data (
  data_id SERIAL PRIMARY KEY,
  sensor_id INT NOT NULL,
  svalue FLOAT NOT NULL,
  recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Table Controllogs : Save device control history
CREATE TABLE control_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  device_id INT NOT NULL,
  cl_action VARCHAR (50) NOT NULL,
  description TEXT,
  executed_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE
);

-- Table Configurations : The weak entity of the sensors (configuration)
CREATE TABLE configuration (
  config_id INT NOT NULL,
  sensor_id INT NOT NULL,
  cparameter VARCHAR (50) NOT NULL,
  cvalue VARCHAR (50) NOT NULL,
  updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id, sensor_id),
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Table AlertConfig : User-defined alert thresholds
CREATE TABLE alert_config (
  config_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  sensor_type VARCHAR(50) NOT NULL,
  min_value FLOAT NOT NULL,
  max_value FLOAT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_sensor_type UNIQUE (user_id, sensor_type)
);

-- Table Alerts : Warning information
CREATE TABLE alert (
  alert_id SERIAL PRIMARY KEY,
  device_id INT NOT NULL,
  sensor_id INT NOT NULL,
  alert_type VARCHAR (50) NOT NULL,
  amessage TEXT NOT NULL,
  alerted_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR (10) CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending',
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

-- Table Control : Save equipment information controlled by users
CREATE TABLE control (
  user_id INT NOT NULL,
  device_id INT NOT NULL,
  PRIMARY KEY (user_id, device_id),
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE
);

-- Table Equipped_with : Determine which device is equipped
CREATE TABLE equipped_with (
  device_id INT NOT NULL,
  sensor_id INT NOT NULL,
  PRIMARY KEY (device_id, sensor_id),
  FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensor (sensor_id) ON DELETE CASCADE
);

CREATE TABLE device_logs (
  log_id SERIAL PRIMARY KEY,
  device_id INT REFERENCES device (device_id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES control_logs (log_id) ON DELETE CASCADE
);

CREATE TABLE sensor_logs (
  log_id SERIAL PRIMARY KEY,
  sensor_id INT REFERENCES sensor (sensor_id) ON DELETE CASCADE,
  FOREIGN KEY (log_id) REFERENCES control_logs (log_id) ON DELETE CASCADE
);
ALTER TABLE sensor_data ADD CONSTRAINT fk_sensor_data FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE;
ALTER TABLE control_logs ADD CONSTRAINT fk_control_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE control_logs ADD CONSTRAINT fk_control_logs_device FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE;
ALTER TABLE configuration ADD CONSTRAINT fk_configuration_sensor FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE;
ALTER TABLE alert ADD CONSTRAINT fk_alert_device FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE;
ALTER TABLE alert ADD CONSTRAINT fk_alert_sensor FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE;
ALTER TABLE control ADD CONSTRAINT fk_control_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE control ADD CONSTRAINT fk_control_device FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE;
ALTER TABLE equipped_with ADD CONSTRAINT fk_equipped_with_device FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE;
ALTER TABLE equipped_with ADD CONSTRAINT fk_equipped_with_sensor FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE;
ALTER TABLE device_logs ADD CONSTRAINT fk_device_logs FOREIGN KEY (log_id) REFERENCES control_logs(log_id) ON DELETE CASCADE;
ALTER TABLE device_logs ADD CONSTRAINT fk_device_logs_device FOREIGN KEY (device_id) REFERENCES device(device_id) ON DELETE CASCADE;
ALTER TABLE sensor_logs ADD CONSTRAINT fk_sensor_logs FOREIGN KEY (log_id) REFERENCES control_logs(log_id) ON DELETE CASCADE;
ALTER TABLE sensor_logs ADD CONSTRAINT fk_sensor_logs_sensor FOREIGN KEY (sensor_id) REFERENCES sensor(sensor_id) ON DELETE CASCADE;

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

-- Thêm các thiết bị chính (quạt và đèn)
INSERT INTO device (device_id, device_name, device_type, dlocation, status) VALUES
(1, 'Smart Light', 'light', 'Living Room', 'active'),
(2, 'Smart Fan', 'fan', 'Bedroom', 'active');

-- Thêm các sensor đo lường (nhiệt độ, độ ẩm, chuyển động)
INSERT INTO sensor (sensor_id, sensor_type, model, unit, description) VALUES
(1, 'temperature', 'DHT11', 'Celsius', 'Temperature sensor'),
(2, 'humidity', 'DHT11', 'Percentage', 'Humidity sensor'),
(3, 'motion', 'PIR', 'Boolean', 'Motion detection sensor');

-- Thêm cấu hình cảnh báo cho admin
INSERT INTO alert_config (user_id, sensor_type, min_value, max_value, is_active) VALUES
(1, 'temperature', 18.0, 30.0, true),
(1, 'humidity', 30.0, 70.0, true);

-- Kết nối thiết bị với sensor
INSERT INTO equipped_with (device_id, sensor_id) VALUES
(1, 3), -- Đèn kết nối với cảm biến chuyển động
(2, 1), -- Quạt kết nối với cảm biến nhiệt độ
(2, 2); -- Quạt kết nối với cảm biến độ ẩm

-- Cấp quyền điều khiển cho admin
INSERT INTO control (user_id, device_id) VALUES
(1, 1), (1, 2);

-- Thêm dữ liệu mẫu cho sensor_data
-- INSERT INTO sensor_data (sensor_id, svalue, recorded_time) VALUES
-- -- Dữ liệu nhiệt độ
-- (1, 25.5, NOW() - INTERVAL '1 hour'),
-- (1, 26.2, NOW() - INTERVAL '45 minutes'),
-- (1, 26.8, NOW() - INTERVAL '30 minutes'),
-- (1, 27.1, NOW() - INTERVAL '15 minutes'),
-- (1, 27.5, NOW()),

-- -- Dữ liệu độ ẩm
-- (2, 60.5, NOW() - INTERVAL '1 hour'),
-- (2, 61.2, NOW() - INTERVAL '45 minutes'),
-- (2, 62.8, NOW() - INTERVAL '30 minutes'),
-- (2, 63.1, NOW() - INTERVAL '15 minutes'),
-- (2, 63.5, NOW()),

-- -- Dữ liệu chuyển động (1 = có chuyển động, 0 = không có)
-- (3, 0, NOW() - INTERVAL '1 hour'),
-- (3, 1, NOW() - INTERVAL '45 minutes'),
-- (3, 0, NOW() - INTERVAL '30 minutes'),
-- (3, 1, NOW() - INTERVAL '15 minutes'),
-- (3, 0, NOW());

# Smart House System

A smart home automation system that connects to IoT devices for monitoring and controlling various home appliances like lights and fans based on sensor data.

## Features

- Real-time monitoring of temperature, humidity, and light sensors
- Automatic control of lights and fans based on sensor data
- User authentication and authorization
- Historical data visualization
- Alert notifications for abnormal conditions
- Direct control of fans and lights via Adafruit IO

## System Architecture

- **Backend**: Express.js REST API server
- **Frontend**: React.js web application
- **Database**: PostgreSQL (production) / SQLite (development/testing)
- **IoT Communication**: MQTT protocol via Adafruit IO

## Database Configuration

The system supports both PostgreSQL and SQLite databases:

### PostgreSQL Setup (Production)

1. Install PostgreSQL on your system
2. Create a database for the application
3. Set up environment variables in `.env` file:
```
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```
4. Comment out the SQLite configuration in `.env`

### SQLite Setup (Development/Testing)

1. Uncomment the SQLite configuration in `.env`:
```
SQLITE_PATH=./database.sqlite
```
2. Comment out the PostgreSQL configuration

3. Initialize the SQLite database:
```bash
# For backend
cd backend
node ./database/initSqlite.js

# For ESP_MQTT_SERVER
cd ../DADN_YoloHome_Web/ESP_MQTT_SERVER
npm run init-sqlite
```

## MQTT Configuration

This system uses MQTT protocol for IoT device communication via Adafruit IO.

### Adafruit IO Configuration

1. Create an Adafruit IO account
2. Create feeds for your sensors and control devices
3. Update the environment variables in `.env` file:
```
ADA_USERNAME=your_adafruit_username
ADAFRUIT_IO_KEY=your_adafruit_io_key
```

### Feeds Structure

- `dadn.temperature` - Temperature sensor reading
- `dadn.humidity` - Humidity sensor reading
- `dadn.light` - Light sensor reading
- `dadn.fan` - Fan control (1 = ON, 0 = OFF)
- `dadn.light` - Light control (1 = ON, 0 = OFF)

### Controlling Devices

The system supports direct control of fans and lights via API endpoints:

```bash
# Turn on fan
curl -X POST http://localhost:5000/api/devices/fan/on -H "Authorization: Bearer <your_token>"

# Turn off fan
curl -X POST http://localhost:5000/api/devices/fan/off -H "Authorization: Bearer <your_token>"

# Turn on light
curl -X POST http://localhost:5000/api/devices/light/on -H "Authorization: Bearer <your_token>"

# Turn off light
curl -X POST http://localhost:5000/api/devices/light/off -H "Authorization: Bearer <your_token>"
```

## Smart Control Logic

The system automatically controls devices based on sensor data:

1. **Fan Control**: The fan turns on when temperature exceeds the configured threshold
2. **Light Control**: The light turns on when ambient light level is below the configured threshold or when motion is detected

## Installation

1. Clone the repository
2. Install dependencies for backend and frontend:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# ESP_MQTT_SERVER
cd ../DADN_YoloHome_Web/ESP_MQTT_SERVER
npm install
```

3. Create and configure `.env` files for both backend and ESP_MQTT_SERVER
4. Initialize the database (PostgreSQL or SQLite)
5. Start the servers:
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm start

# ESP_MQTT_SERVER
cd DADN_YoloHome_Web/ESP_MQTT_SERVER && npm start
```
## FAKE DATA
```bash
cd DADN_YoloHome_Web/ESP_MQTT_SERVER/test && node fake_data.js
```
## ESP32 Client Setup

1. Install PlatformIO or Arduino IDE
2. Configure the WiFi credentials and MQTT broker details in the ESP32 code
3. Flash the code to your ESP32 device
4. Connect the sensors and actuators according to the pin configuration 
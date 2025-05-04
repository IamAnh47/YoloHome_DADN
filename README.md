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

```mermaid
graph TB
    classDef frontend fill:#f9d5e5,stroke:#333,stroke-width:1px
    classDef backend fill:#eeeeee,stroke:#333,stroke-width:1px
    classDef database fill:#b5ead7,stroke:#333,stroke-width:1px
    classDef external fill:#c7ceea,stroke:#333,stroke-width:1px
    classDef cache fill:#ffdac1,stroke:#333,stroke-width:1px

    %% External Services
    AdafruitIO[Adafruit IO<br/>MQTT Broker]:::external
    ESP32[ESP32 Devices]:::external

    %% Frontend Components
    subgraph Frontend["Frontend (React)"]
        direction TB
        UI[User Interface]:::frontend
        Components[React Components]:::frontend
        FController[Controllers<br/>- SensorController<br/>- DeviceController]:::frontend
        FService[Services<br/>- apiService<br/>- deviceService<br/>- authService]:::frontend
        FCache[Client Cache<br/>- Readings<br/>- History<br/>- Alerts]:::cache
    end

    %% Backend Components
    subgraph Backend["Backend (Node.js)"]
        direction TB
        API[RESTful API<br/>Express.js]:::backend
        BController[Controllers<br/>- sensorController<br/>- deviceController<br/>- alertController]:::backend
        BService[Services<br/>- adafruitService<br/>- mqttService<br/>- predictionService]:::backend
        Models[Data Models]:::backend
    end

    %% Database
    subgraph DB["Database"]
        direction TB
        SQLite[(SQLite Database)]:::database
        Tables[Tables<br/>- Sensors<br/>- Devices<br/>- Alerts<br/>- Users]:::database
    end

    %% Data Flow
    UI --> Components
    Components --> FController
    FController <--> FCache
    FController --> FService

    FService <--> API
    API --> BController
    BController <--> BService
    BController <--> Models
    Models <--> SQLite

    BService <--> AdafruitIO
    AdafruitIO <--> ESP32

    %% Connections explanations
    ESP32 -. "Collects sensor data" .-> AdafruitIO
    ESP32 -. "Receives commands" .-> AdafruitIO
    BService -. "Subscribes to feeds" .-> AdafruitIO
    BService -. "Publishes commands" .-> AdafruitIO
    FCache -. "TTL: 5s" .-> FController
    SQLite -. "Stores history" .-> Tables
</graph>

### Data Flow

1. **Sensor Data Collection**:
   - ESP32 devices read physical sensors (temperature, humidity, motion)
   - Data is published to Adafruit IO MQTT feeds
   - Backend's MQTT service subscribes to these feeds
   - Data is processed and stored in the SQLite database

2. **Device Control**:
   - User interacts with the UI to control devices (lights, fans, etc.)
   - Frontend controllers process these requests through the API service
   - Backend controllers receive commands via the REST API
   - Commands are published to Adafruit IO feeds
   - ESP32 devices subscribe to these feeds and control physical devices
   - State changes are synchronized back to the database

3. **Data Visualization**:
   - Frontend requests sensor data via API service
   - Backend retrieves data from the database
   - SensorController manages data caching (TTL: 5 seconds)
   - UI components display data with 5-second auto-refresh
   - Charts show 30 evenly spaced historical data points

4. **Alert System**:
   - Backend monitors sensor values against thresholds
   - Prediction service analyzes patterns for anomaly detection
   - Alerts are generated and stored in the database
   - Frontend retrieves and displays alerts with appropriate visuals

### Smart Features

- **Efficient Caching**: Frontend maintains TTL-based cache for different data types
- **Real-time Updates**: 5-second refresh intervals keep UI in sync with physical world
- **Smart Analysis**: Prediction service identifies unusual patterns in sensor data
- **Responsive Design**: UI adapts to different device sizes with modern styling
- **Fault Tolerance**: Graceful error handling and fallbacks ensure system reliability

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
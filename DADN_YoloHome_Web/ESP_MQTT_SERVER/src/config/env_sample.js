/**
 * Sample environment configuration file
 * 
 * Copy this file to .env in the project root directory
 * and update the values according to your environment.
 */

// Sample .env file content for SQLite:
/*
# Server Configuration
PORT=3000

# Database Configuration 
# Select database type by setting USE_SQLITE=true/false
USE_SQLITE=true
SQLITE_PATH=./database.sqlite

# PostgreSQL Configuration (Not used when USE_SQLITE is true)
# PG_USER=postgres
# PG_HOST=localhost
# PG_DATABASE=smart_house
# PG_PASSWORD=your_password
# PG_PORT=5432

# Adafruit IO Configuration
ADA_USERNAME=your_adafruit_username
ADAFRUIT_IO_KEY=your_adafruit_io_key

# MQTT Broker URL
MQTT_BROKER=mqtt://io.adafruit.com
*/

// Sample .env file content for PostgreSQL:
/*
# Server Configuration
PORT=3000

# Database Configuration
# Select database type by setting USE_SQLITE=true/false
USE_SQLITE=false

# PostgreSQL Configuration
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=smart_house
PG_PASSWORD=your_password
PG_PORT=5432

# Adafruit IO Configuration
ADA_USERNAME=your_adafruit_username
ADAFRUIT_IO_KEY=your_adafruit_io_key

# MQTT Broker URL
MQTT_BROKER=mqtt://io.adafruit.com
*/

// Instructions:
/*
1. Choose the database type by setting USE_SQLITE=true/false
2. Fill in the corresponding database information
3. Add your Adafruit IO credentials
4. Ensure MQTT_BROKER is pointing to the correct MQTT broker
5. Set the PORT for the server to run on
*/ 
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config/.env' });

const dbPath = process.env.SQLITE_PATH || './database.sqlite';

async function initializeDatabase() {
  console.log('Initializing SQLite database...');
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

    // Read the schema file
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sqlite.sql'),
      'utf8'
    );

    // Execute schema SQL
    console.log('Creating database schema...');
    await db.exec(schema);
    console.log('Schema created successfully.');

    // Verify database setup
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    console.log(`Users in database: ${userCount.count}`);
    
    const deviceCount = await db.get('SELECT COUNT(*) as count FROM device');
    console.log(`Devices in database: ${deviceCount.count}`);
    
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
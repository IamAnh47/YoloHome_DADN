const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/.env') });

// Create PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smarthome',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL by semicolons to execute each statement separately
    const statements = schemaSql.split(';');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute each statement
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await client.query(trimmedStatement);
        } catch (error) {
          console.error(`Error executing statement: ${trimmedStatement}`);
          console.error(error);
          throw error;
        }
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database initialized successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the initialization
initializeDatabase(); 
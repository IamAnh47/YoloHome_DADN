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

async function runMigration(filename) {
  const client = await pool.connect();
  
  try {
    console.log(`Running migration: ${filename}`);
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'migrations', filename);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    
    console.log(`Migration ${filename} completed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Migration ${filename} failed:`, error);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide a migration filename');
    console.log('Usage: node runMigration.js <filename>');
    console.log('Example: node runMigration.js add_ai_mode_table.sql');
    process.exit(1);
  }
  
  const filename = process.argv[2];
  
  try {
    await runMigration(filename);
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 
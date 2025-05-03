// const { Pool } = require('pg');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Load env vars
dotenv.config({ path: './config/.env' });

// Log database connection parameters
console.log('Using SQLite database');
console.log('- Database path:', process.env.SQLITE_PATH || './database.sqlite');

// Comment out PostgreSQL connection code
/*
// Create connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    console.error('Connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      // Don't log password
    });
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
    
    // Check if users table exists and has data
    pool.query('SELECT COUNT(*) FROM users', (usersErr, usersRes) => {
      if (usersErr) {
        console.error('Error checking users table:', usersErr.message);
      } else {
        console.log('Users in database:', usersRes.rows[0].count);
      }
    });
  }
});
*/

// Create SQLite connection
let db;

const initDb = async () => {
  try {
    db = await open({
      filename: process.env.SQLITE_PATH || './database.sqlite',
      driver: sqlite3.Database
    });
    
    // Test connection
    const result = await db.get('SELECT datetime("now") as now');
    console.log('SQLite database connected successfully at:', result.now);
    
    // Check if users table exists and has data
    try {
      const users = await db.get('SELECT COUNT(*) as count FROM users');
      console.log('Users in database:', users.count);
    } catch (userErr) {
      console.error('Error checking users table:', userErr.message);
    }
    
    return db;
  } catch (err) {
    console.error('SQLite database connection error:', err);
    throw err;
  }
};

// Initialize database connection
initDb();

// Modified query function to handle both PostgreSQL and SQLite syntax
const query = async (text, params = []) => {
  if (!db) await initDb();
  
  try {
    // Convert PostgreSQL query placeholders ($1, $2) to SQLite placeholders (?)
    const sqliteText = text.replace(/\$\d+/g, '?');
    
    // Determine if it's a SELECT query or other type
    if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
      // For SELECT queries that might return multiple rows
      const rows = await db.all(sqliteText, params);
      return { rows };
    } else {
      // For INSERT, UPDATE, DELETE queries
      const result = await db.run(sqliteText, params);
      return { rows: [result] };
    }
  } catch (err) {
    console.error('Error executing query:', err);
    throw err;
  }
};

module.exports = {
  query,
  getClient: async () => {
    if (!db) await initDb();
    return db;
  }
};
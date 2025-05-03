require('dotenv').config();
const dbConfig = require('../config/db.config');

// Determine which database to use
const useSqlite = process.env.USE_SQLITE === 'true';
let db;

if (useSqlite) {
  // SQLite setup
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');
  
  // Create a promise-based pool for SQLite
  const initSqlite = async () => {
    try {
      db = await open({
        filename: dbConfig.path,
        driver: sqlite3.Database
      });
      console.log('Connected to SQLite database');
      
      // Setup the query method to match PostgreSQL's interface
      db.query = async (text, params = []) => {
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
            if (sqliteText.trim().toUpperCase().startsWith('INSERT')) {
              return { 
                rows: [{ 
                  ...result, 
                  id: result.lastID 
                }] 
              };
            }
            return { rows: [result] };
          }
        } catch (err) {
          console.error('Error executing SQLite query:', err);
          throw err;
        }
      };
      
      return db;
    } catch (err) {
      console.error('SQLite database connection error:', err);
      process.exit(-1);
    }
  };
  
  // Initialize SQLite
  initSqlite();
  
  module.exports = db;
} else {
  // PostgreSQL setup
  const { Pool } = require('pg');
  
  const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port
  });
  
  pool.on('connect', () => {
    console.log("Connected to PostgreSQL database");
  });
  
  pool.on('error', (err) => {
    console.error("Unexpected error on PostgreSQL client", err);
    process.exit(-1);
  });
  
  module.exports = pool;
}

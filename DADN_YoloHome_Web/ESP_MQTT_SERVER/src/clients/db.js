require('dotenv').config();
const dbConfig = require('../config/db.config');

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

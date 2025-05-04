// PostgreSQL configuration
const postgresConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "smarthome",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432
};

module.exports = postgresConfig;
  
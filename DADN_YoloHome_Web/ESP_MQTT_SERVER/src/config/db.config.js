const useSqlite = process.env.USE_SQLITE === 'true';

// PostgreSQL config (commented but kept for future use)
const postgresConfig = {
  user: process.env.PG_USER || "anh",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "postgres",
  password: process.env.PG_PASSWORD || "IamAnh123",
  port: process.env.PG_PORT || 5432
};

// SQLite config
const sqliteConfig = {
  path: process.env.SQLITE_PATH || "./database.sqlite"
};

module.exports = useSqlite ? sqliteConfig : postgresConfig;
  
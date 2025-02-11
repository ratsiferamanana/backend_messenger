const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Utilise l'URL fournie par Render
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

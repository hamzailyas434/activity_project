const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT) || 3306;

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error(
        `   → Nothing is accepting connections at ${dbHost}:${dbPort}. Start MySQL (or set DB_HOST / DB_PORT in .env).`
      );
    }
  }
}

testConnection();

module.exports = pool;

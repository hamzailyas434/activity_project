const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function checkUsersTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database\n");

    // Check table structure
    console.log("📋 Users Table Structure:");
    const [columns] = await connection.query("DESCRIBE users");
    console.table(columns);

    // Check constraints
    console.log("\n🔍 Table Constraints:");
    const [constraints] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
    `);
    console.table(constraints);

    // Check sample data
    console.log("\n👤 Sample User Data (first 3):");
    const [users] = await connection.query(
      "SELECT id, username, email, LENGTH(profile_picture) as picture_size, created_at FROM users LIMIT 3"
    );
    console.table(users);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ Database connection closed");
    }
  }
}

checkUsersTable();


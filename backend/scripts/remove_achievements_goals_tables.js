const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function removeTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Drop achievements table
    console.log("\n1. Dropping achievements table...");
    try {
      await connection.query("DROP TABLE IF EXISTS achievements");
      console.log("✅ Achievements table dropped");
    } catch (err) {
      console.error("❌ Error dropping achievements table:", err.message);
    }

    // Drop goals table
    console.log("\n2. Dropping goals table...");
    try {
      await connection.query("DROP TABLE IF EXISTS goals");
      console.log("✅ Goals table dropped");
    } catch (err) {
      console.error("❌ Error dropping goals table:", err.message);
    }

    console.log("\n✅ All tables removed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ Database connection closed");
    }
  }
}

// Run the script
removeTables();

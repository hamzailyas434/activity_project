const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addUserNameFields() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Add first_name column
    console.log("\n1. Adding first_name column to users table...");
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN first_name VARCHAR(100) DEFAULT NULL AFTER username
      `);
      console.log("✅ First name column added");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("ℹ️  First name column already exists, skipping...");
      } else {
        throw err;
      }
    }

    // Add last_name column
    console.log("\n2. Adding last_name column to users table...");
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN last_name VARCHAR(100) DEFAULT NULL AFTER first_name
      `);
      console.log("✅ Last name column added");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("ℹ️  Last name column already exists, skipping...");
      } else {
        throw err;
      }
    }

    console.log("\n✅ All user name fields added successfully!");
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
addUserNameFields();

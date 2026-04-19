const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addProfileSupport() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Add profile_picture column to users table
    console.log("\n1. Adding profile_picture column to users table...");
    try {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN profile_picture VARCHAR(500) DEFAULT NULL AFTER email
      `);
      console.log("✅ Profile picture column added");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("ℹ️ Profile picture column already exists");
      } else {
        throw err;
      }
    }

    console.log("\n✅ Profile support added successfully!");
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

addProfileSupport();

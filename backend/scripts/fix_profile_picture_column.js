const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function fixProfilePictureColumn() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    console.log("\n1. Changing profile_picture column to TEXT...");
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN profile_picture TEXT
    `);
    console.log("✅ Profile picture column updated to TEXT");

    console.log("\n✅ Profile picture column fixed successfully!");
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

fixProfilePictureColumn();


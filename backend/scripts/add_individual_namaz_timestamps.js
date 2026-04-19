const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addIndividualNamazTimestamps() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Add individual updated_at columns for each namaz
    const namazTypes = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    
    for (const namaz of namazTypes) {
      const columnName = `${namaz}_updated_at`;
      try {
        await connection.query(`
          ALTER TABLE qaza_namaz 
          ADD COLUMN ${columnName} TIMESTAMP NULL DEFAULT NULL
        `);
        console.log(`✅ Added column: ${columnName}`);
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log(`ℹ️  Column ${columnName} already exists, skipping...`);
        } else {
          throw err;
        }
      }
    }

    console.log("\n✅ All individual namaz timestamp columns added successfully!");
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
addIndividualNamazTimestamps();

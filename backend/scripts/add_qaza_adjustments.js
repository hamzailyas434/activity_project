const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function addQazaAdjustments() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Add adjustment columns to qaza_namaz table
    console.log("\nAdding adjustment columns to qaza_namaz table...");
    
    const adjustments = [
      { column: "fajr_adjustment", defaultValue: 0 },
      { column: "zuhr_adjustment", defaultValue: 0 },
      { column: "asr_adjustment", defaultValue: 0 },
      { column: "maghrib_adjustment", defaultValue: 0 },
      { column: "isha_adjustment", defaultValue: 0 },
    ];

    for (const adj of adjustments) {
      try {
        await connection.query(`
          ALTER TABLE qaza_namaz 
          ADD COLUMN ${adj.column} INT DEFAULT ${adj.defaultValue}
        `);
        console.log(`✅ Added column: ${adj.column}`);
      } catch (error) {
        if (error.code === "ER_DUP_FIELDNAME" || error.code === "ER_DUP_KEYNAME") {
          console.log(`⚠️  Column ${adj.column} already exists, skipping...`);
        } else {
          console.error(`❌ Error adding column ${adj.column}:`, error.message);
          throw error;
        }
      }
    }

    await connection.end();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

addQazaAdjustments();

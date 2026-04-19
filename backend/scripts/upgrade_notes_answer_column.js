const mysql = require("mysql2/promise");
require("dotenv").config();

async function upgradeAnswerColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const connection = await pool.getConnection();
    console.log("Connected to database...");

    try {
      await connection.beginTransaction();

      // Check if answer column exists and its current type
      const [columns] = await connection.query(`
        SELECT DATA_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notes' 
        AND COLUMN_NAME = 'answer'
      `);

      if (columns.length === 0) {
        console.log("⚠️ Notes table or answer column not found");
        return;
      }

      if (columns[0].DATA_TYPE === 'text') {
        console.log("Upgrading answer column from TEXT to LONGTEXT for larger content...");
        await connection.query(`
          ALTER TABLE notes MODIFY COLUMN answer LONGTEXT NOT NULL
        `);
        console.log("✅ Answer column upgraded to LONGTEXT");
      } else {
        console.log(`ℹ️ Answer column is already ${columns[0].DATA_TYPE.toUpperCase()}`);
      }

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error upgrading column:", err);
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

upgradeAnswerColumn();

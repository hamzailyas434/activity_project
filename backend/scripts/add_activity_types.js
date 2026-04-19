const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const connection = await pool.getConnection();
    console.log('Connected to database...');

    try {
      // 1. Add 'type' to activities
      const [actColumns] = await connection.query("SHOW COLUMNS FROM activities LIKE 'type'");
      if (actColumns.length === 0) {
        console.log('Adding type column to activities...');
        await connection.query(
          "ALTER TABLE activities ADD COLUMN type ENUM('checkbox', 'number', 'text') DEFAULT 'checkbox' AFTER name"
        );
        console.log('✅ Activity Type added');
      }

      // 2. Add 'value' to activity_completions
      const [compColumns] = await connection.query("SHOW COLUMNS FROM activity_completions LIKE 'value'");
      if (compColumns.length === 0) {
        console.log('Adding value column to completions...');
        await connection.query(
          "ALTER TABLE activity_completions ADD COLUMN value TEXT AFTER is_completed"
        );
        console.log('✅ Completion Value added');
      }
      
    } catch (err) {
      console.error('Error modifying tables:', err);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();

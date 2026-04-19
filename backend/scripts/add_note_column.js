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
      // Check if column exists
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM activity_completions LIKE 'note'"
      );

      if (columns.length === 0) {
        console.log('Adding note column...');
        await connection.query(
          "ALTER TABLE activity_completions ADD COLUMN note TEXT"
        );
        console.log('✅ Note column added successfully');
      } else {
        console.log('ℹ️ Note column already exists');
      }
    } catch (err) {
      console.error('Error modifying table:', err);
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

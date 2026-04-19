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
      console.log('Creating daily_tasks table...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS daily_tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_date DATE NOT NULL,
          description VARCHAR(255) NOT NULL,
          type ENUM('checkbox', 'number', 'text') DEFAULT 'checkbox',
          is_completed BOOLEAN DEFAULT FALSE,
          value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Daily Tasks table created');
      
    } catch (err) {
      console.error('Error creating table:', err);
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

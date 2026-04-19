const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCompletionColor() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Checking activity_completions schema...');

    const [cols] = await connection.query(
      "SHOW COLUMNS FROM activity_completions LIKE 'completion_color'"
    );

    if (cols.length === 0) {
      console.log('Adding completion_color column...');
      await connection.query(
        "ALTER TABLE activity_completions ADD COLUMN completion_color VARCHAR(16) NULL AFTER value"
      );
      console.log('✅ Added completion_color column');
    } else {
      console.log('completion_color column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

addCompletionColor().catch(console.error);

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Checking current schema...');
    
    // Check if user_id column exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM activities LIKE 'user_id'"
    );
    
    if (columns.length > 0) {
      console.log('Found user_id column, removing it...');
      
      // First, check for foreign keys
      const [foreignKeys] = await connection.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'activities' 
        AND COLUMN_NAME = 'user_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [process.env.DB_NAME]);
      
      // Drop foreign key constraints first
      for (const fk of foreignKeys) {
        console.log(`Dropping foreign key: ${fk.CONSTRAINT_NAME}`);
        await connection.query(`ALTER TABLE activities DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
      }
      
      // Check for indexes
      const [indexes] = await connection.query(`
        SELECT DISTINCT INDEX_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'activities'
        AND COLUMN_NAME = 'user_id'
        AND INDEX_NAME != 'PRIMARY'
      `, [process.env.DB_NAME]);
      
      // Drop indexes
      for (const idx of indexes) {
        console.log(`Dropping index: ${idx.INDEX_NAME}`);
        await connection.query(`ALTER TABLE activities DROP INDEX ${idx.INDEX_NAME}`);
      }
      
      // Now drop the column
      await connection.query('ALTER TABLE activities DROP COLUMN user_id');
      console.log('✅ Removed user_id column');
    } else {
      console.log('No user_id column found');
    }
    
    // Check if type column exists
    const [typeColumns] = await connection.query(
      "SHOW COLUMNS FROM activities LIKE 'type'"
    );
    
    if (typeColumns.length === 0) {
      console.log('Adding type column...');
      await connection.query(
        "ALTER TABLE activities ADD COLUMN type VARCHAR(20) DEFAULT 'checkbox' AFTER name"
      );
      console.log('✅ Added type column');
    } else {
      console.log('Type column already exists');
    }
    
    // Check if value column exists in activity_completions
    const [valueColumns] = await connection.query(
      "SHOW COLUMNS FROM activity_completions LIKE 'value'"
    );
    
    if (valueColumns.length === 0) {
      console.log('Adding value column to activity_completions...');
      await connection.query(
        "ALTER TABLE activity_completions ADD COLUMN value TEXT AFTER note"
      );
      console.log('✅ Added value column');
    } else {
      console.log('Value column already exists');
    }
    
    console.log('\n✅ Schema fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fixSchema().catch(console.error);

const mysql = require("mysql2/promise");
require("dotenv").config();

async function migrate() {
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

      // 1. Create users table
      console.log("Creating users table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ Users table created");

      // 2. Add user_id to activities table
      console.log("Adding user_id to activities table...");
      try {
        await connection.query(`
          ALTER TABLE activities 
          ADD COLUMN user_id INT
        `);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          throw err;
        }
      }

      // Add foreign key if it doesn't exist
      try {
        const [fkCheck] = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'activities' 
          AND COLUMN_NAME = 'user_id' 
          AND REFERENCED_TABLE_NAME = 'users'
        `);

        if (fkCheck.length === 0) {
          await connection.query(`
            ALTER TABLE activities 
            ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          `);
        }
      } catch (err) {
        if (!err.message.includes("Duplicate foreign key")) {
          throw err;
        }
      }

      // Update unique constraint to be per user
      try {
        await connection.query(`ALTER TABLE activities DROP INDEX name`);
      } catch (err) {
        // Index might not exist, that's okay
      }

      try {
        await connection.query(`
          ALTER TABLE activities 
          ADD UNIQUE KEY unique_user_activity (user_id, name)
        `);
      } catch (err) {
        if (!err.message.includes("Duplicate key name")) {
          throw err;
        }
      }

      console.log("✅ Added user_id to activities table");

      // 3. Add user_id to activity_completions table
      console.log("Adding user_id to activity_completions table...");
      try {
        await connection.query(`
          ALTER TABLE activity_completions 
          ADD COLUMN user_id INT
        `);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          throw err;
        }
      }

      // Add foreign key if it doesn't exist
      try {
        const [fkCheck] = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'activity_completions' 
          AND COLUMN_NAME = 'user_id' 
          AND REFERENCED_TABLE_NAME = 'users'
        `);

        if (fkCheck.length === 0) {
          await connection.query(`
            ALTER TABLE activity_completions 
            ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          `);
        }
      } catch (err) {
        if (!err.message.includes("Duplicate foreign key")) {
          throw err;
        }
      }

      // Update unique constraint to be per user
      try {
        await connection.query(
          `ALTER TABLE activity_completions DROP INDEX unique_activity_date`
        );
      } catch (err) {
        // Index might not exist, that's okay
      }

      try {
        await connection.query(`
          ALTER TABLE activity_completions 
          ADD UNIQUE KEY unique_user_activity_date (user_id, activity_id, completion_date)
        `);
      } catch (err) {
        if (!err.message.includes("Duplicate key name")) {
          throw err;
        }
      }

      console.log("✅ Added user_id to activity_completions table");

      // 4. Add user_id to daily_tasks table
      console.log("Adding user_id to daily_tasks table...");
      try {
        await connection.query(`
          ALTER TABLE daily_tasks 
          ADD COLUMN user_id INT
        `);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          throw err;
        }
      }

      // Add foreign key if it doesn't exist
      try {
        const [fkCheck] = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'daily_tasks' 
          AND COLUMN_NAME = 'user_id' 
          AND REFERENCED_TABLE_NAME = 'users'
        `);

        if (fkCheck.length === 0) {
          await connection.query(`
            ALTER TABLE daily_tasks 
            ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          `);
        }
      } catch (err) {
        if (!err.message.includes("Duplicate foreign key")) {
          throw err;
        }
      }

      console.log("✅ Added user_id to daily_tasks table");

      // 5. Create indexes for better performance
      console.log("Creating indexes...");
      try {
        await connection.query(
          `CREATE INDEX idx_activities_user_id ON activities(user_id)`
        );
      } catch (err) {
        if (!err.message.includes("Duplicate key name")) {
          throw err;
        }
      }

      try {
        await connection.query(
          `CREATE INDEX idx_completions_user_id ON activity_completions(user_id)`
        );
      } catch (err) {
        if (!err.message.includes("Duplicate key name")) {
          throw err;
        }
      }

      try {
        await connection.query(
          `CREATE INDEX idx_tasks_user_id ON daily_tasks(user_id)`
        );
      } catch (err) {
        if (!err.message.includes("Duplicate key name")) {
          throw err;
        }
      }

      console.log("✅ Indexes created");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Migration failed:", err);
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();

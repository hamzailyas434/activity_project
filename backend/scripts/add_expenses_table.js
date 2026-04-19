const mysql = require("mysql2/promise");
require("dotenv").config();

async function addExpensesTables() {
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

      console.log("Creating expense_budgets table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS expense_budgets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          month INT NOT NULL,
          year INT NOT NULL,
          total_income DECIMAL(15,2) DEFAULT 0,
          UNIQUE KEY uk_user_month_year (user_id, year, month),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ expense_budgets table created");

      console.log("Creating expenses table...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          category ENUM('home_bills', 'home_person', 'other') NOT NULL,
          name VARCHAR(200) NOT NULL,
          amount DECIMAL(15,2) NOT NULL DEFAULT 0,
          note TEXT,
          month INT NOT NULL,
          year INT NOT NULL,
          display_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_month_year (user_id, year, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ expenses table created");

      await connection.commit();
      console.log("✅ Migration completed successfully");
    } catch (err) {
      await connection.rollback();
      console.error("❌ Error during migration:", err);
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

addExpensesTables();

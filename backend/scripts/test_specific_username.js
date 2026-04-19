const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function testSpecificUsername() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database\n");

    // Find user with @gmail.com username
    const [users] = await connection.query(
      "SELECT id, username, email FROM users WHERE username = ?",
      ["@gmail.com"]
    );

    if (users.length === 0) {
      console.log("User with username '@gmail.com' not found");
      return;
    }

    const userId = users[0].id;
    console.log(`Found user: ID=${userId}, username='${users[0].username}', email='${users[0].email}'`);

    // Check if new username exists
    const [existing] = await connection.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      ["hamzailyas434", userId]
    );
    console.log(`\nUsers with username 'hamzailyas434' (excluding current): ${existing.length}`);

    // Try to update
    console.log("\nAttempting update...");
    try {
      const [result] = await connection.query(
        "UPDATE users SET username = ? WHERE id = ?",
        ["hamzailyas434", userId]
      );
      console.log("✅ Update successful!");
      console.log("Rows affected:", result.affectedRows);

      // Verify
      const [updated] = await connection.query(
        "SELECT username FROM users WHERE id = ?",
        [userId]
      );
      console.log(`Updated username: '${updated[0].username}'`);

      // Revert
      await connection.query(
        "UPDATE users SET username = ? WHERE id = ?",
        ["@gmail.com", userId]
      );
      console.log(`✅ Reverted to: '@gmail.com'`);
    } catch (err) {
      console.error("❌ Update failed!");
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error("Error SQL state:", err.sqlState);
      console.error("Full error:", err);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSpecificUsername();


const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "activity_tracker",
};

async function testUsernameUpdate() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database\n");

    // Get first user
    const [users] = await connection.query("SELECT id, username FROM users LIMIT 1");
    if (users.length === 0) {
      console.log("No users found");
      return;
    }

    const userId = users[0].id;
    const oldUsername = users[0].username;
    const newUsername = oldUsername + "_test";

    console.log(`Testing username update for user ID: ${userId}`);
    console.log(`Current username: ${oldUsername}`);
    console.log(`New username: ${newUsername}\n`);

    // Check if new username exists
    const [existing] = await connection.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [newUsername, userId]
    );
    console.log(`Users with this username (excluding current): ${existing.length}`);

    // Try to update
    try {
      await connection.query(
        "UPDATE users SET username = ? WHERE id = ?",
        [newUsername, userId]
      );
      console.log("✅ Update successful!");

      // Verify
      const [updated] = await connection.query(
        "SELECT username FROM users WHERE id = ?",
        [userId]
      );
      console.log(`Updated username: ${updated[0].username}`);

      // Revert
      await connection.query(
        "UPDATE users SET username = ? WHERE id = ?",
        [oldUsername, userId]
      );
      console.log(`✅ Reverted to: ${oldUsername}`);
    } catch (err) {
      console.error("❌ Update failed:", err.message);
      console.error("Error code:", err.code);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testUsernameUpdate();


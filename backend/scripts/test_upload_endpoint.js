const mysql = require("mysql2/promise");
require("dotenv").config();

async function testUploadEndpoint() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to database\n");

    // Test 1: Check if notes table exists and has correct structure
    console.log("📋 Test 1: Checking notes table structure...");
    try {
      const [columns] = await connection.query("DESCRIBE notes");
      const answerColumn = columns.find(col => col.Field === 'answer');
      if (answerColumn) {
        console.log(`✅ Answer column type: ${answerColumn.Type}`);
        if (answerColumn.Type.includes('text') && !answerColumn.Type.includes('long')) {
          console.log("⚠️  WARNING: Answer column is TEXT, should be LONGTEXT for large content");
          console.log("   Run: node scripts/upgrade_notes_answer_column.js");
        } else {
          console.log("✅ Answer column supports large content");
        }
      }
    } catch (err) {
      console.log("❌ Notes table doesn't exist or error:", err.message);
    }

    // Test 2: Check note_attachments table
    console.log("\n📋 Test 2: Checking note_attachments table...");
    try {
      const [columns] = await connection.query("DESCRIBE note_attachments");
      console.log("✅ note_attachments table exists with columns:");
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    } catch (err) {
      console.log("ℹ️  note_attachments table doesn't exist (this is OK, files stored as data URLs)");
    }

    // Test 3: Test base64 conversion
    console.log("\n📋 Test 3: Testing base64 conversion...");
    try {
      const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const buffer = Buffer.from(testBase64, "base64");
      console.log(`✅ Base64 conversion works, buffer size: ${buffer.length} bytes`);
    } catch (err) {
      console.log("❌ Base64 conversion failed:", err.message);
    }

    // Test 4: Check if there are any notes
    console.log("\n📋 Test 4: Checking existing notes...");
    try {
      const [notes] = await connection.query("SELECT id, user_id, category, LENGTH(answer) as answer_length FROM notes LIMIT 5");
      console.log(`✅ Found ${notes.length} notes`);
      notes.forEach(note => {
        console.log(`   - Note ID ${note.id}, Category: ${note.category}, Answer length: ${note.answer_length} bytes`);
      });
    } catch (err) {
      console.log("❌ Error checking notes:", err.message);
    }

    console.log("\n✅ All tests completed!");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testUploadEndpoint();

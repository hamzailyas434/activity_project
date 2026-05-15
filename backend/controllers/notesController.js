const db = require("../config/database");

// Get all notes with filters
exports.getAllNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, search, limit = 100 } = req.query;

    let query = "SELECT * FROM notes WHERE user_id = ?";
    const params = [userId];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND (question LIKE ? OR answer LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const [notes] = await db.query(query, params);
    
    // Fetch answers for each note
    for (let note of notes) {
      const [answers] = await db.query(
        "SELECT * FROM note_answers WHERE note_id = ? ORDER BY is_very_good DESC, display_order ASC, created_at ASC",
        [note.id]
      );
      note.answers = answers || [];
    }
    
    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

// Get single note by ID
exports.getNoteById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [notes] = await db.query(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (notes.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    const note = notes[0];
    
    // Fetch answers for this note
    const [answers] = await db.query(
      "SELECT * FROM note_answers WHERE note_id = ? ORDER BY is_very_good DESC, display_order ASC, created_at ASC",
      [note.id]
    );
    note.answers = answers || [];
    
    res.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
};

// Create new note
exports.createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category = "general", question, answer, answers } = req.body;



    if (!question || (typeof question === 'string' && question.trim() === "")) {
      console.error("Validation failed: Question is missing or empty");
      console.error("Received question:", question, "Type:", typeof question);
      return res.status(400).json({ 
        error: "Question is required",
        received: { question, questionType: typeof question }
      });
    }

    // Support both old format (single answer) and new format (multiple answers)

    if (answerList.length === 0) {
      console.error("Validation failed: No answers provided");
      return res.status(400).json({ 
        error: "At least one answer is required",
        received: {
          answers: answers,
          answer: answer,
          answerListLength: answerList.length
        }
      });
    }

    // Validate that at least one answer has content
    const answersWithContent = answerList.filter(a => {
      const text = a.answer ? String(a.answer).trim() : "";
      // Remove HTML tags and check for actual text
      const textContent = text.replace(/<[^>]*>/g, '').trim();
      return textContent.length > 0 || text.length > 0;
    });

    if (answersWithContent.length === 0) {
      console.error("Validation failed: All answers are empty after processing");
      return res.status(400).json({ 
        error: "At least one answer must have content",
        received: {
          answerListLength: answerList.length,
          answersWithContent: answersWithContent.length
        }
      });
    }

    // Create note with legacy answer field (for backward compatibility)
    const legacyAnswer = answersWithContent[0].answer ? String(answersWithContent[0].answer).trim() : "";
    const [result] = await db.query(
      "INSERT INTO notes (user_id, category, question, answer) VALUES (?, ?, ?, ?)",
      [userId, category.trim(), question.trim(), legacyAnswer]
    );

    const noteId = result.insertId;

    // Insert multiple answers - use answersWithContent instead of answerList
    let insertedCount = 0;
    for (let i = 0; i < answersWithContent.length; i++) {
      const ans = answersWithContent[i];
      // Handle both string and object answers
      const answerText = ans.answer ? String(ans.answer).trim() : "";
      const isVeryGood = ans.is_very_good || false;
      
      // Skip only if answer is completely empty (shouldn't happen after filtering, but double-check)
      if (answerText.length === 0) {
        continue;
      }
      
      try {
        const [answerResult] = await db.query(
          "INSERT INTO note_answers (note_id, user_id, answer, is_very_good, display_order) VALUES (?, ?, ?, ?, ?)",
          [noteId, userId, answerText, isVeryGood, i]
        );
        insertedCount++;
      } catch (answerError) {
        console.error(`❌ Error inserting answer ${i + 1}:`, answerError);
        console.error("Error details:", answerError.code, answerError.message, answerError.sql);
        // If table doesn't exist, provide helpful error
        if (answerError.code === 'ER_NO_SUCH_TABLE' || answerError.code === '42S02') {
          return res.status(500).json({ 
            error: "Database table not found",
            details: "Please run the migration script: node scripts/add_note_answers_table.js",
            code: answerError.code
          });
        }
        throw answerError;
      }
    }

    const [newNote] = await db.query(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [noteId, userId]
    );

    // Fetch answers
    const [answersData] = await db.query(
      "SELECT * FROM note_answers WHERE note_id = ? ORDER BY is_very_good DESC, display_order ASC, created_at ASC",
      [noteId]
    );
    newNote[0].answers = answersData || [];

    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to create note." });
  }
};

// Update note
exports.updateNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, question, answer, answers } = req.body;

    // First check if note exists
    const [existing] = await db.query(
      "SELECT id FROM notes WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    const updates = [];
    const values = [];

    if (category !== undefined && category !== null) {
      updates.push("category = ?");
      values.push(String(category).trim());
    }

    if (question !== undefined && question !== null) {
      updates.push("question = ?");
      values.push(String(question).trim());
    }

    if (answer !== undefined && answer !== null) {
      // Don't trim HTML content as it might break formatting
      // Convert to string and preserve HTML
      const answerValue = String(answer);
      updates.push("answer = ?");
      values.push(answerValue);
    }

    if (updates.length > 0) {
      values.push(id, userId);
      try {
        await db.query(
          `UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
          values
        );
      } catch (updateError) {
        // If error is about data too long, suggest upgrading column
        if (updateError.code === 'ER_DATA_TOO_LONG' || updateError.message.includes('Data too long')) {
          console.error("Data too long for TEXT column. Run: node scripts/upgrade_notes_answer_column.js");
          return res.status(500).json({ 
            error: "Answer content is too large. Please run database migration script: node scripts/upgrade_notes_answer_column.js",
            details: updateError.message 
          });
        }
        throw updateError;
      }
    }

    // Update answers if provided
    if (answers !== undefined && Array.isArray(answers)) {
      
      // Delete existing answers
      try {
        await db.query("DELETE FROM note_answers WHERE note_id = ? AND user_id = ?", [id, userId]);
      } catch (deleteError) {
        console.error("Error deleting existing answers:", deleteError);
        if (deleteError.code === 'ER_NO_SUCH_TABLE' || deleteError.code === '42S02') {
          return res.status(500).json({ 
            error: "Database table not found",
            details: "Please run the migration script: node scripts/add_note_answers_table.js",
            code: deleteError.code
          });
        }
        throw deleteError;
      }
      
      // Insert new answers
      for (let i = 0; i < answers.length; i++) {
        const ans = answers[i];
        const answerText = ans.answer ? String(ans.answer).trim() : "";
        const isVeryGood = ans.is_very_good || false;
        
        // Only skip if answer is completely empty (allow HTML with just whitespace)
        if (answerText.length === 0 && (!ans.answer || String(ans.answer).trim().length === 0)) {
          continue;
        }
        
        try {
          const [answerResult] = await db.query(
            "INSERT INTO note_answers (note_id, user_id, answer, is_very_good, display_order) VALUES (?, ?, ?, ?, ?)",
            [id, userId, answerText || "", isVeryGood, i]
          );
        } catch (insertError) {
          console.error(`❌ Error inserting answer ${i + 1}:`, insertError);
          console.error("Error details:", insertError.code, insertError.message);
          if (insertError.code === 'ER_NO_SUCH_TABLE' || insertError.code === '42S02') {
            return res.status(500).json({ 
              error: "Database table not found",
              details: "Please run the migration script: node scripts/add_note_answers_table.js",
              code: insertError.code
            });
          }
          throw insertError;
        }
      }
    }

    const [updated] = await db.query(
      "SELECT * FROM notes WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: "Note not found after update" });
    }

    const note = updated[0];
    
    // Fetch answers
    const [answersData] = await db.query(
      "SELECT * FROM note_answers WHERE note_id = ? ORDER BY is_very_good DESC, display_order ASC, created_at ASC",
      [id]
    );
    note.answers = answersData || [];

    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to update note." });
  }
};

// Delete note
exports.deleteNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM notes WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

// Get all categories for a user
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    const [categories] = await db.query(
      "SELECT DISTINCT category FROM notes WHERE user_id = ? ORDER BY category",
      [userId]
    );

    const categoryList = categories.map(c => c.category);
    res.json(categoryList);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// Upload file (images or other files)
// Returns data URL for embedding in note content
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

// Magic-byte signatures for each allowed MIME type
const MAGIC_BYTES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

function hasValidMagicBytes(buffer, mimeType) {
  const sigs = MAGIC_BYTES[mimeType];
  if (!sigs) return true;
  return sigs.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

exports.uploadFile = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error("Upload: User not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if body is parsed correctly
    if (!req.body || typeof req.body !== 'object') {
      console.error("Upload: Invalid request body", typeof req.body);
      return res.status(400).json({ error: "Invalid request body" });
    }

    const userId = req.user.id;
    const { fileData, fileName, mimeType, type, noteId } = req.body;

    if (!fileData) {
      console.error("No file data in request body");
      return res.status(400).json({ error: "No file data provided" });
    }

    // Validate declared MIME type against allowlist
    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({
        error: "Unsupported file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed.",
      });
    }

    // Extract base64 data
    let base64Data = fileData;
    if (typeof fileData === 'string' && fileData.startsWith("data:")) {
      const parts = fileData.split(",");
      base64Data = parts.length > 1 ? parts[1] : fileData;
    }

    // Validate base64 data
    if (!base64Data || base64Data.length === 0) {
      console.error("Invalid or empty base64 data");
      return res.status(400).json({ error: "Invalid file data" });
    }

    try {
      // Convert base64 to buffer to check size
      const fileBuffer = Buffer.from(base64Data, "base64");
      const fileSize = fileBuffer.length;

      // Limit file size to 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return res.status(400).json({ error: "File size exceeds 10MB limit" });
      }

      // Validate file content matches declared MIME type
      if (!hasValidMagicBytes(fileBuffer, mimeType)) {
        return res.status(400).json({ error: "File content does not match declared type." });
      }

      // Always return data URL - files are stored in the answer field as base64
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Return data URL (files will be stored in the answer field when note is saved)
      res.json({
        url: dataUrl,
        filename: fileName || "uploaded-file",
        type: type || "file",
      });
    } catch (bufferError) {
      console.error("Buffer conversion error:", bufferError);
      console.error("Error stack:", bufferError.stack);
      return res.status(400).json({ error: "Invalid file data format." });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to upload file." });
  }
};

// Get attachment file
exports.getAttachment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [attachments] = await db.query(
      `SELECT file_data, file_name, file_type, file_size 
       FROM note_attachments 
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = attachments[0];
    res.setHeader("Content-Type", attachment.file_type);
    const safeName = encodeURIComponent(attachment.file_name).replace(/['()]/g, encodeURIComponent);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${safeName}`);
    res.setHeader("Content-Length", attachment.file_size);
    res.send(attachment.file_data);
  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).json({ error: "Failed to fetch attachment" });
  }
};

// Create a new answer for a note
exports.createAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { noteId } = req.params;
    const { answer, is_very_good = false } = req.body;

    if (!answer || answer.trim() === "") {
      return res.status(400).json({ error: "Answer is required" });
    }

    // Verify note exists and belongs to user
    const [notes] = await db.query(
      "SELECT id FROM notes WHERE id = ? AND user_id = ?",
      [noteId, userId]
    );

    if (notes.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Get current max display_order
    const [maxOrder] = await db.query(
      "SELECT COALESCE(MAX(display_order), -1) as max_order FROM note_answers WHERE note_id = ?",
      [noteId]
    );
    const nextOrder = (maxOrder[0]?.max_order || -1) + 1;

    const [result] = await db.query(
      "INSERT INTO note_answers (note_id, user_id, answer, is_very_good, display_order) VALUES (?, ?, ?, ?, ?)",
      [noteId, userId, answer.trim(), is_very_good, nextOrder]
    );

    const [newAnswer] = await db.query(
      "SELECT * FROM note_answers WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(newAnswer[0]);
  } catch (error) {
    console.error("Error creating answer:", error);
    res.status(500).json({ error: "Failed to create answer" });
  }
};

// Update an answer
exports.updateAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answerId } = req.params;
    const { answer, is_very_good, display_order } = req.body;

    // Verify answer exists and belongs to user
    const [existing] = await db.query(
      "SELECT * FROM note_answers WHERE id = ? AND user_id = ?",
      [answerId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Answer not found" });
    }

    const updates = [];
    const values = [];

    if (answer !== undefined && answer !== null) {
      updates.push("answer = ?");
      values.push(String(answer).trim());
    }

    if (is_very_good !== undefined) {
      updates.push("is_very_good = ?");
      values.push(Boolean(is_very_good));
    }

    if (display_order !== undefined && display_order !== null) {
      updates.push("display_order = ?");
      values.push(parseInt(display_order));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(answerId, userId);

    await db.query(
      `UPDATE note_answers SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    const [updated] = await db.query(
      "SELECT * FROM note_answers WHERE id = ?",
      [answerId]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating answer:", error);
    res.status(500).json({ error: "Failed to update answer" });
  }
};

// Delete an answer
exports.deleteAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answerId } = req.params;

    const [result] = await db.query(
      "DELETE FROM note_answers WHERE id = ? AND user_id = ?",
      [answerId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Answer not found" });
    }

    res.json({ message: "Answer deleted successfully" });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ error: "Failed to delete answer" });
  }
};

// Toggle is_very_good status for an answer
exports.toggleVeryGood = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answerId } = req.params;

    // Verify answer exists and belongs to user
    const [existing] = await db.query(
      "SELECT is_very_good FROM note_answers WHERE id = ? AND user_id = ?",
      [answerId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Answer not found" });
    }

    const newStatus = !existing[0].is_very_good;

    await db.query(
      "UPDATE note_answers SET is_very_good = ? WHERE id = ? AND user_id = ?",
      [newStatus, answerId, userId]
    );

    const [updated] = await db.query(
      "SELECT * FROM note_answers WHERE id = ?",
      [answerId]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error("Error toggling very good status:", error);
    res.status(500).json({ error: "Failed to toggle very good status" });
  }
};
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/database");

// ── Multer setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/books");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.pdf`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

// ── Controllers ──────────────────────────────────────────────────────────────

// GET /api/books
const listBooks = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.title, b.author, b.total_pages, b.cover_data, b.created_at,
              COALESCE(p.current_page, 1) AS current_page,
              COALESCE(p.last_read_date, NULL) AS last_read_date,
              COALESCE(p.pages_read_today, 0) AS pages_read_today,
              COALESCE(p.last_read_date, NULL) AS last_read_date
       FROM books b
       LEFT JOIN book_progress p ON p.book_id = b.id AND p.user_id = ?
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("listBooks error:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
};

// POST /api/books  (multipart)
const uploadBook = [
  upload.single("pdf"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "PDF file required" });
      const { title, author, total_pages } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const filePath = `uploads/books/${req.file.filename}`;
      const [result] = await db.query(
        "INSERT INTO books (user_id, title, author, total_pages, file_path) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, title, author || null, parseInt(total_pages) || 0, filePath]
      );
      res.status(201).json({ id: result.insertId, title, author, total_pages: parseInt(total_pages) || 0, current_page: 1 });
    } catch (err) {
      console.error("uploadBook error:", err);
      res.status(500).json({ error: "Failed to upload book" });
    }
  },
];

// DELETE /api/books/:id
const deleteBook = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT file_path FROM books WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Book not found" });

    const fullPath = path.join(__dirname, "../", rows[0].file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await db.query("DELETE FROM books WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteBook error:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
};

// GET /api/books/:id/file  — stream PDF
const getBookFile = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT file_path FROM books WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Book not found" });

    const fullPath = path.join(__dirname, "../", rows[0].file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found on disk" });

    const stat = fs.statSync(fullPath);
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "application/pdf",
      });
      fs.createReadStream(fullPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "application/pdf",
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(fullPath).pipe(res);
    }
  } catch (err) {
    console.error("getBookFile error:", err);
    res.status(500).json({ error: "Failed to stream file" });
  }
};

// PUT /api/books/:id/progress
const updateProgress = async (req, res) => {
  try {
    const { current_page, total_pages } = req.body;
    const bookId = req.params.id;
    const userId = req.user.id;
    const todayDate = today();

    // Ensure book belongs to user
    const [book] = await db.query(
      "SELECT id, total_pages FROM books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );
    if (!book.length) return res.status(404).json({ error: "Book not found" });

    // Update total_pages if provided
    if (total_pages && parseInt(total_pages) > 0) {
      await db.query("UPDATE books SET total_pages = ? WHERE id = ?", [parseInt(total_pages), bookId]);
    }

    // Upsert progress
    const [existing] = await db.query(
      "SELECT id, pages_read_today, last_read_date, current_page FROM book_progress WHERE user_id = ? AND book_id = ?",
      [userId, bookId]
    );

    if (existing.length) {
      const prev = existing[0];
      let pagesReadToday = prev.pages_read_today || 0;

      // Reset daily counter if last read was a different day
      if (prev.last_read_date !== todayDate) {
        pagesReadToday = 0;
      }

      const delta = Math.max(0, (current_page || 1) - (prev.current_page || 1));
      pagesReadToday += delta;

      await db.query(
        "UPDATE book_progress SET current_page = ?, pages_read_today = ?, last_read_date = ? WHERE user_id = ? AND book_id = ?",
        [current_page || 1, pagesReadToday, todayDate, userId, bookId]
      );
      res.json({ current_page, pages_read_today: pagesReadToday });
    } else {
      await db.query(
        "INSERT INTO book_progress (user_id, book_id, current_page, pages_read_today, last_read_date) VALUES (?, ?, ?, 0, ?)",
        [userId, bookId, current_page || 1, todayDate]
      );
      res.json({ current_page, pages_read_today: 0 });
    }
  } catch (err) {
    console.error("updateProgress error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
};

// GET /api/books/:id/highlights
const getHighlights = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM book_highlights WHERE book_id = ? AND user_id = ? ORDER BY page_number, created_at",
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch highlights" });
  }
};

// POST /api/books/:id/highlights
const addHighlight = async (req, res) => {
  try {
    const { page_number, selected_text, note, color } = req.body;
    if (!selected_text || !page_number) return res.status(400).json({ error: "page_number and selected_text required" });

    const [result] = await db.query(
      "INSERT INTO book_highlights (user_id, book_id, page_number, selected_text, note, color) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, req.params.id, page_number, selected_text, note || null, color || "#fef08a"]
    );
    res.status(201).json({ id: result.insertId, page_number, selected_text, note, color });
  } catch (err) {
    res.status(500).json({ error: "Failed to add highlight" });
  }
};

// DELETE /api/books/highlights/:highlightId
const deleteHighlight = async (req, res) => {
  try {
    await db.query(
      "DELETE FROM book_highlights WHERE id = ? AND user_id = ?",
      [req.params.highlightId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete highlight" });
  }
};

// GET /api/books/reading-goal
const getReadingGoal = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT daily_pages_goal FROM reading_goals WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ daily_pages_goal: rows.length ? rows[0].daily_pages_goal : 10 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reading goal" });
  }
};

// PUT /api/books/reading-goal
const setReadingGoal = async (req, res) => {
  try {
    const { daily_pages_goal } = req.body;
    await db.query(
      "INSERT INTO reading_goals (user_id, daily_pages_goal) VALUES (?, ?) ON DUPLICATE KEY UPDATE daily_pages_goal = ?",
      [req.user.id, daily_pages_goal, daily_pages_goal]
    );
    res.json({ daily_pages_goal });
  } catch (err) {
    res.status(500).json({ error: "Failed to set reading goal" });
  }
};

// GET /api/books/dashboard-summary
const dashboardSummary = async (req, res) => {
  try {
    const todayDate = today();
    const userId = req.user.id;

    // Total pages read today across all books
    const [pagesRows] = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN last_read_date = ? THEN pages_read_today ELSE 0 END), 0) AS pages_today
       FROM book_progress WHERE user_id = ?`,
      [todayDate, userId]
    );

    // Daily goal
    const [goalRows] = await db.query(
      "SELECT daily_pages_goal FROM reading_goals WHERE user_id = ?",
      [userId]
    );

    // Currently reading book (most recently updated)
    const [currentBook] = await db.query(
      `SELECT b.title, COALESCE(p.current_page, 1) AS current_page, b.total_pages
       FROM books b
       LEFT JOIN book_progress p ON p.book_id = b.id AND p.user_id = ?
       WHERE b.user_id = ?
       ORDER BY p.updated_at DESC LIMIT 1`,
      [userId, userId]
    );

    res.json({
      pages_today: pagesRows[0].pages_today || 0,
      daily_pages_goal: goalRows.length ? goalRows[0].daily_pages_goal : 10,
      current_book: currentBook.length ? currentBook[0] : null,
    });
  } catch (err) {
    console.error("dashboardSummary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
};

// ── Per-page notes ────────────────────────────────────────────────────────────

// GET /api/books/:id/page-notes/:page
const getPageNotes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, content, is_favourite, created_at, updated_at
       FROM book_page_notes
       WHERE user_id = ? AND book_id = ? AND page_number = ?
       ORDER BY created_at ASC`,
      [req.user.id, req.params.id, req.params.page]
    );
    res.json(rows);
  } catch (err) {
    console.error("getPageNotes error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

// POST /api/books/:id/page-notes
const createPageNote = async (req, res) => {
  try {
    const { page_number, title = "", content = "" } = req.body;
    if (!page_number) return res.status(400).json({ error: "page_number required" });
    const [result] = await db.query(
      "INSERT INTO book_page_notes (user_id, book_id, page_number, title, content) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, req.params.id, page_number, title, content]
    );
    res.status(201).json({ id: result.insertId, title, content, page_number, created_at: new Date(), updated_at: new Date() });
  } catch (err) {
    console.error("createPageNote error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
};

// PUT /api/books/page-notes/:noteId
const updatePageNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const fields = [];
    const vals = [];
    if (title !== undefined) { fields.push("title = ?"); vals.push(title); }
    if (content !== undefined) { fields.push("content = ?"); vals.push(content); }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
    vals.push(req.params.noteId, req.user.id);
    await db.query(
      `UPDATE book_page_notes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      vals
    );
    res.json({ success: true });
  } catch (err) {
    console.error("updatePageNote error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
};

// DELETE /api/books/page-notes/:noteId
const deletePageNote = async (req, res) => {
  try {
    await db.query(
      "DELETE FROM book_page_notes WHERE id = ? AND user_id = ?",
      [req.params.noteId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("deletePageNote error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

// PUT /api/books/:id/cover
const updateCover = async (req, res) => {
  try {
    const { cover_data } = req.body;
    if (!cover_data) return res.status(400).json({ error: "cover_data required" });
    const [result] = await db.query(
      "UPDATE books SET cover_data = ? WHERE id = ? AND user_id = ?",
      [cover_data, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Book not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("updateCover error:", err);
    res.status(500).json({ error: "Failed to update cover" });
  }
};

const randomPageNote = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.book_id, n.page_number, n.content, n.is_favourite, b.title AS book_title
       FROM book_page_notes n
       JOIN books b ON b.id = n.book_id
       WHERE n.user_id = ?
         AND TRIM(n.content) != ''
         AND n.content NOT IN ('<br>', '<br/>', '<p><br></p>')
       ORDER BY RAND() LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    console.error("randomPageNote error:", err);
    res.status(500).json({ error: "Failed to fetch random note" });
  }
};

const notesSummary = async (req, res) => {
  try {
    const EMPTY = ["''", "''", "'<br>'", "'<br/>'", "'<p><br></p>'"];
    const [rows] = await db.query(
      `SELECT b.id, b.title,
         COUNT(n.id) AS note_count
       FROM books b
       JOIN book_page_notes n ON n.book_id = b.id
       WHERE b.user_id = ?
         AND TRIM(n.content) != ''
         AND n.content NOT IN ('','<br>','<br/>','<p><br></p>')
       GROUP BY b.id, b.title
       ORDER BY b.title ASC`,
      [req.user.id]
    );
    const total = rows.reduce((s, r) => s + Number(r.note_count), 0);
    res.json({ total, books: rows });
  } catch (err) {
    console.error("notesSummary error:", err);
    res.status(500).json({ error: "Failed to fetch notes summary" });
  }
};

const getAllPageNotes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.book_id, n.page_number, n.content, n.is_favourite, n.created_at,
         b.title AS book_title
       FROM book_page_notes n
       JOIN books b ON b.id = n.book_id
       WHERE n.book_id = ? AND n.user_id = ?
         AND TRIM(n.content) != ''
         AND n.content NOT IN ('','<br>','<br/>','<p><br></p>')
       ORDER BY n.created_at ASC`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getAllPageNotes error:", err);
    res.status(500).json({ error: "Failed to fetch book notes" });
  }
};

// GET /api/books/:id/favourite-pages
const getFavouritePages = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT page_number FROM book_favourite_pages
       WHERE user_id = ? AND book_id = ?
       ORDER BY page_number ASC`,
      [req.user.id, req.params.id]
    );
    res.json(rows.map(r => r.page_number));
  } catch (err) {
    console.error("getFavouritePages error:", err);
    res.status(500).json({ error: "Failed to fetch favourite pages" });
  }
};

// POST /api/books/:id/favourite-pages  — toggles a page in/out of favourites
const toggleFavouritePage = async (req, res) => {
  try {
    const { page_number } = req.body;
    if (!page_number) return res.status(400).json({ error: "page_number required" });
    const bookId = req.params.id;
    const userId = req.user.id;

    const [existing] = await db.query(
      `SELECT id FROM book_favourite_pages WHERE user_id = ? AND book_id = ? AND page_number = ?`,
      [userId, bookId, page_number]
    );

    if (existing.length) {
      await db.query(
        `DELETE FROM book_favourite_pages WHERE user_id = ? AND book_id = ? AND page_number = ?`,
        [userId, bookId, page_number]
      );
      res.json({ favourited: false, page_number });
    } else {
      await db.query(
        `INSERT INTO book_favourite_pages (user_id, book_id, page_number) VALUES (?, ?, ?)`,
        [userId, bookId, page_number]
      );
      res.json({ favourited: true, page_number });
    }
  } catch (err) {
    console.error("toggleFavouritePage error:", err);
    res.status(500).json({ error: "Failed to toggle favourite page" });
  }
};

// PATCH /api/books/page-notes/:noteId/favourite
const toggleFavourite = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;
    await db.query(
      `UPDATE book_page_notes
       SET is_favourite = 1 - is_favourite
       WHERE id = ? AND user_id = ?`,
      [noteId, userId]
    );
    const [[row]] = await db.query(
      `SELECT is_favourite FROM book_page_notes WHERE id = ?`,
      [noteId]
    );
    res.json({ is_favourite: row ? row.is_favourite : 0 });
  } catch (err) {
    console.error("toggleFavourite error:", err);
    res.status(500).json({ error: "Failed to toggle favourite" });
  }
};

// GET /api/books/favourite-notes
const getFavouriteNotes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.book_id, n.page_number, n.content, n.is_favourite, n.created_at,
              b.title AS book_title
       FROM book_page_notes n
       JOIN books b ON b.id = n.book_id
       WHERE n.user_id = ? AND n.is_favourite = 1
         AND TRIM(n.content) != ''
         AND n.content NOT IN ('','<br>','<br/>','<p><br></p>')
       ORDER BY n.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getFavouriteNotes error:", err);
    res.status(500).json({ error: "Failed to fetch favourite notes" });
  }
};

module.exports = {
  upload,
  listBooks,
  updateCover,
  getPageNotes,
  createPageNote,
  updatePageNote,
  deletePageNote,
  toggleFavourite,
  getFavouriteNotes,
  getFavouritePages,
  toggleFavouritePage,
  uploadBook,
  deleteBook,
  getBookFile,
  updateProgress,
  getHighlights,
  addHighlight,
  deleteHighlight,
  getReadingGoal,
  setReadingGoal,
  dashboardSummary,
  randomPageNote,
  notesSummary,
  getAllPageNotes,
};

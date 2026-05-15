import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useAuth } from "../contexts/AuthContext";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { API_BASE_URL as API } from "../config";
const HIGHLIGHT_COLORS = ["#fef08a", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74"];

const NOTE_FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];

// ── Single note editor card ───────────────────────────────────────────────────
function NoteCard({ note, onDelete, authHeaders, fontSize, onEditorFocus }) {
  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const [isFav, setIsFav] = useState(!!note.is_favourite);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note.content || "";
  }, []); // eslint-disable-line

  const scheduleSave = useCallback((newContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`${API}/books/page-notes/${note.id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ title: "", content: newContent }),
        });
      } catch (e) { console.error("note save error", e); }
    }, 800);
  }, [authHeaders, note.id]);

  const handleToggleFav = async () => {
    try {
      const res = await fetch(`${API}/books/page-notes/${note.id}/favourite`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFav(!!data.is_favourite);
      }
    } catch (e) { console.error("toggle favourite error", e); }
  };

  return (
    <div className="group relative rounded-lg border border-edge bg-canvas overflow-hidden flex flex-col">
      {/* Action buttons — appear on hover */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleToggleFav}
          title={isFav ? "Remove from favourites" : "Mark as favourite"}
          className={`w-5 h-5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors text-sm leading-none ${
            isFav ? "text-rose-400 opacity-100 !opacity-100" : "text-ink-muted hover:text-rose-400"
          }`}
          style={isFav ? { opacity: 1 } : {}}
        >
          {isFav ? "♥" : "♡"}
        </button>
        <button
          onClick={() => onDelete(note.id)}
          title="Delete note"
          className="w-5 h-5 flex items-center justify-center rounded text-ink-muted hover:text-red-500 hover:bg-red-50/60 bg-transparent border-none cursor-pointer transition-all text-base"
        >
          ×
        </button>
      </div>
      {/* Heart always visible when favourited (not just on hover) */}
      {isFav && (
        <button
          onClick={handleToggleFav}
          title="Remove from favourites"
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-rose-400 text-sm leading-none group-hover:hidden z-10"
        >
          ♥
        </button>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => onEditorFocus?.(editorRef.current)}
        onInput={() => scheduleSave(editorRef.current?.innerHTML || "")}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "b") {
            e.preventDefault();
            document.execCommand("bold", false, null);
          }
        }}
        data-placeholder="Start typing your note…"
        style={{ fontSize }}
        className="min-h-[80px] max-h-[360px] overflow-y-auto px-3 py-2 pr-7 leading-relaxed text-ink outline-none break-words
          empty:before:content-[attr(data-placeholder)] empty:before:text-ink-muted empty:before:pointer-events-none"
      />
    </div>
  );
}

// ── Notes Panel ───────────────────────────────────────────────────────────────
function NotesPanel({ bookId, currentPage, onClose, authHeaders }) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);

  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem("books-notes-font-size") || "14", 10);
  });
  const [panelWidth, setPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem("books-notes-width") || "300", 10);
  });
  const resizeDrag = useRef(null);
  // Tracks the last focused NoteCard editor so toolbar buttons target the right one
  const activeEditorRef = useRef(null);

  const execOnActive = (cmd) => {
    const el = activeEditorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, null);
  };

  const changeFontSize = (delta) => {
    setFontSize(prev => {
      const idx  = NOTE_FONT_SIZES.indexOf(prev);
      const next = NOTE_FONT_SIZES[Math.max(0, Math.min(NOTE_FONT_SIZES.length - 1, idx + delta))];
      localStorage.setItem("books-notes-font-size", next);
      return next;
    });
  };

  const onResizeMouseDown = (e) => {
    e.preventDefault();
    resizeDrag.current = { startX: e.clientX, startW: panelWidth };
    const onMove = (ev) => {
      const delta = resizeDrag.current.startX - ev.clientX; // drag left = wider
      const newW  = Math.max(220, Math.min(600, resizeDrag.current.startW + delta));
      setPanelWidth(newW);
      localStorage.setItem("books-notes-width", newW);
    };
    const onUp = () => {
      resizeDrag.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/books/${bookId}/page-notes/${currentPage}`, { headers: authHeaders() });
      if (res.ok) setNotes(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [bookId, currentPage, authHeaders]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async () => {
    try {
      const res = await fetch(`${API}/books/${bookId}/page-notes`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ page_number: currentPage, title: "", content: "" }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [...prev, newNote]);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (noteId) => {
    await fetch(`${API}/books/page-notes/${noteId}`, { method: "DELETE", headers: authHeaders() });
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return (
    <div
      style={{ width: panelWidth }}
      className="notes-side kit-notes-side shrink-0 bg-surface border border-edge rounded-2xl flex flex-col max-h-[calc(100vh-180px)] sticky top-20 animate-slide-right overflow-hidden relative"
    >
      {/* Left-edge resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-[5px] cursor-ew-resize z-20 hover:bg-primary/20 transition-colors"
        title="Drag to resize panel"
      />

      {/* Header */}
      <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-edge shrink-0 gap-1">
        <span className="text-[0.8rem] font-semibold text-ink-sub shrink-0">📝 p.{currentPage}</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {/* A− / A+ font size */}
          <button
            onClick={() => changeFontSize(-1)}
            disabled={NOTE_FONT_SIZES.indexOf(fontSize) === 0}
            title="Decrease font size"
            className="w-7 h-7 flex items-center justify-center rounded text-[0.68rem] font-bold text-ink-sub border border-transparent hover:bg-gtint-hov hover:border-edge transition-all cursor-pointer bg-transparent disabled:opacity-30 disabled:cursor-default"
          >
            A−
          </button>
          <span className="text-[0.65rem] text-ink-muted w-6 text-center">{fontSize}</span>
          <button
            onClick={() => changeFontSize(1)}
            disabled={NOTE_FONT_SIZES.indexOf(fontSize) === NOTE_FONT_SIZES.length - 1}
            title="Increase font size"
            className="w-7 h-7 flex items-center justify-center rounded text-[0.8rem] font-bold text-ink-sub border border-transparent hover:bg-gtint-hov hover:border-edge transition-all cursor-pointer bg-transparent disabled:opacity-30 disabled:cursor-default"
          >
            A+
          </button>

          {/* Bold — acts on current selection */}
          <button
            onMouseDown={e => { e.preventDefault(); execOnActive("bold"); }}
            title="Bold selection (Ctrl+B)"
            className="w-7 h-7 flex items-center justify-center rounded text-[0.82rem] font-bold text-ink-sub border border-transparent hover:bg-gtint-hov hover:border-edge transition-all cursor-pointer bg-transparent"
          >
            B
          </button>

          {/* Bullet list */}
          <button
            onMouseDown={e => { e.preventDefault(); execOnActive("insertUnorderedList"); }}
            title="Bullet list"
            className="w-7 h-7 flex items-center justify-center rounded text-[0.85rem] text-ink-sub border border-transparent hover:bg-gtint-hov hover:border-edge transition-all cursor-pointer bg-transparent"
          >
            •≡
          </button>

          {/* Numbered list */}
          <button
            onMouseDown={e => { e.preventDefault(); execOnActive("insertOrderedList"); }}
            title="Numbered list"
            className="w-7 h-7 flex items-center justify-center rounded text-[0.75rem] text-ink-sub border border-transparent hover:bg-gtint-hov hover:border-edge transition-all cursor-pointer bg-transparent"
          >
            1≡
          </button>

          <div className="w-px h-4 bg-edge mx-1 shrink-0" />

          <button
            onClick={handleAdd}
            className="px-2 py-1 text-[0.72rem] font-medium bg-primary text-white rounded-lg border-none cursor-pointer hover:opacity-85 transition-opacity whitespace-nowrap"
          >
            + Add
          </button>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-lg leading-none bg-transparent border-none cursor-pointer transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-gtint-hov ml-0.5"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {loading ? (
          <p className="text-[0.8rem] text-ink-muted text-center py-4">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-2xl">📝</span>
            <p className="text-[0.8rem] text-ink-muted text-center">No notes for this page yet.</p>
            <button
              onClick={handleAdd}
              className="mt-1 px-3 py-1 text-[0.75rem] font-medium bg-primary text-white rounded-lg border-none cursor-pointer hover:opacity-85 transition-opacity"
            >
              + Add First Note
            </button>
          </div>
        ) : (
          notes.map(n => (
            <NoteCard
              key={n.id}
              note={n}
              bookId={bookId}
              onDelete={handleDelete}
              authHeaders={authHeaders}
              fontSize={`${fontSize}px`}
              onEditorFocus={el => { activeEditorRef.current = el; }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Books Component ──────────────────────────────────────────────────────
function Books() {
  const { token } = useAuth();
  const [view, setView] = useState("library");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [pagesToday, setPagesToday] = useState(0);

  // Reader state
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.2);
  const [highlights, setHighlights] = useState([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [favPages, setFavPages] = useState([]);
  const [showFavPages, setShowFavPages] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [highlightToolbar, setHighlightToolbar] = useState(null);
  const [highlightNote, setHighlightNote] = useState("");
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const progressDebounce = useRef(null);
  const containerRef = useRef(null);
  const coverCanvasRef = useRef(null);
  const thumbnailSavedRef = useRef(new Set());

  // Upload form state
  const [uploadForm, setUploadForm] = useState({ title: "", author: "" });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ── Fetch library ───────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/books`, { headers: authHeaders() });
      if (res.ok) setBooks(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authHeaders]);

  const fetchGoalAndProgress = useCallback(async () => {
    try {
      const [goalRes, summaryRes] = await Promise.all([
        fetch(`${API}/books/reading-goal`, { headers: authHeaders() }),
        fetch(`${API}/books/dashboard-summary`, { headers: authHeaders() }),
      ]);
      if (goalRes.ok) { const d = await goalRes.json(); setDailyGoal(d.daily_pages_goal || 10); }
      if (summaryRes.ok) { const d = await summaryRes.json(); setPagesToday(d.pages_today || 0); }
    } catch (e) { console.error(e); }
  }, [authHeaders]);

  useEffect(() => { fetchBooks(); fetchGoalAndProgress(); }, [fetchBooks, fetchGoalAndProgress]);

  // Auto-open a book if the dashboard "Open →" link was clicked
  useEffect(() => {
    if (view !== "library" || books.length === 0) return;
    const raw = localStorage.getItem("pending-open-book");
    if (!raw) return;
    try {
      const { bookId, page } = JSON.parse(raw);
      localStorage.removeItem("pending-open-book");
      const book = books.find(b => b.id === bookId);
      if (!book) return;
      openBook({ ...book, current_page: page });
    } catch {}
  }, [view, books]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", uploadFile);
      fd.append("title", uploadForm.title);
      fd.append("author", uploadForm.author);
      const res = await fetch(`${API}/books`, { method: "POST", headers: authHeaders(), body: fd });
      if (res.ok) {
        setShowUpload(false);
        setUploadForm({ title: "", author: "" });
        setUploadFile(null);
        await fetchBooks();
      }
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  // ── Delete book ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this book and all its highlights?")) return;
    await fetch(`${API}/books/${id}`, { method: "DELETE", headers: authHeaders() });
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  // ── Open reader ─────────────────────────────────────────────────────────────
  const openBook = async (book) => {
    setSelectedBook(book);
    setCurrentPage(book.current_page || 1);
    setPageInput(String(book.current_page || 1));
    setNumPages(null);
    setHighlights([]);
    setShowHighlights(false);
    setShowNotes(false);
    setFavPages([]);
    setShowFavPages(false);
    setView("reader");
    const [hlRes, fpRes] = await Promise.all([
      fetch(`${API}/books/${book.id}/highlights`,      { headers: authHeaders() }),
      fetch(`${API}/books/${book.id}/favourite-pages`, { headers: authHeaders() }),
    ]);
    if (hlRes.ok) setHighlights(await hlRes.json());
    if (fpRes.ok) setFavPages(await fpRes.json());
  };

  const toggleFavPage = async () => {
    if (!selectedBook) return;
    const res = await fetch(`${API}/books/${selectedBook.id}/favourite-pages`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_number: currentPage }),
    });
    if (res.ok) {
      const data = await res.json();
      setFavPages(prev =>
        data.favourited
          ? [...prev, currentPage].sort((a, b) => a - b)
          : prev.filter(p => p !== currentPage)
      );
    }
  };

  const toggleFavPageDirect = async (pageNum) => {
    if (!selectedBook) return;
    const res = await fetch(`${API}/books/${selectedBook.id}/favourite-pages`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ page_number: pageNum }),
    });
    if (res.ok) {
      const data = await res.json();
      setFavPages(prev =>
        data.favourited
          ? [...prev, pageNum].sort((a, b) => a - b)
          : prev.filter(p => p !== pageNum)
      );
    }
  };

  // ── Save progress (debounced) ────────────────────────────────────────────────
  const saveProgress = useCallback((bookId, page, total) => {
    if (progressDebounce.current) clearTimeout(progressDebounce.current);
    progressDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/books/${bookId}/progress`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ current_page: page, total_pages: total }),
        });
        if (res.ok) {
          const data = await res.json();
          setPagesToday(data.pages_read_today || 0);
          setBooks(prev => prev.map(b => b.id === bookId ? { ...b, current_page: page } : b));
        }
      } catch (e) { console.error(e); }
    }, 600);
  }, [authHeaders]);

  const saveThumbnail = useCallback(async (bookId) => {
    if (thumbnailSavedRef.current.has(bookId)) return;
    const canvas = coverCanvasRef.current;
    if (!canvas) return;
    try {
      const thumb = document.createElement("canvas");
      const maxW = 300;
      const ratio = Math.min(1, maxW / canvas.width);
      thumb.width  = Math.round(canvas.width  * ratio);
      thumb.height = Math.round(canvas.height * ratio);
      thumb.getContext("2d").drawImage(canvas, 0, 0, thumb.width, thumb.height);
      const dataUrl = thumb.toDataURL("image/jpeg", 0.7);
      const res = await fetch(`${API}/books/${bookId}/cover`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ cover_data: dataUrl }),
      });
      if (res.ok) {
        thumbnailSavedRef.current.add(bookId);
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, cover_data: dataUrl } : b));
      }
    } catch (e) { console.error("thumbnail save error", e); }
  }, [authHeaders]);

  const goToPage = (p) => {
    const n = Math.max(1, Math.min(numPages || 1, p));
    setCurrentPage(n);
    setPageInput(String(n));
    saveProgress(selectedBook.id, n, numPages);
  };

  // Auto-open notes panel when navigating to a page that has notes
  useEffect(() => {
    if (view !== "reader" || !selectedBook) return;
    fetch(`${API}/books/${selectedBook.id}/page-notes/${currentPage}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(notes => { if (notes.length > 0) { setShowNotes(true); setShowHighlights(false); } })
      .catch(() => {});
  }, [currentPage, view, selectedBook?.id]); // eslint-disable-line

  // Keyboard navigation (skip when focus is inside a note editor)
  useEffect(() => {
    if (view !== "reader") return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.target.contentEditable === "true") return;
      if (e.key === "Escape") { setFullscreen(false); setShowFavPages(false); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goToPage(currentPage - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, currentPage, numPages]); // eslint-disable-line

  // ── Text selection for highlights ───────────────────────────────────────────
  const handleMouseUp = () => {
    // Don't trigger highlight toolbar when inside the notes panel
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setHighlightToolbar(null); return; }
    const anchorNode = sel.anchorNode;
    if (anchorNode?.parentElement?.closest?.(".notes-panel")) return;
    if (anchorNode?.parentElement?.closest?.("[contenteditable]")) return;
    const text = sel.toString().trim();
    if (!text) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setHighlightNote("");
    setHighlightColor("#fef08a");
    setHighlightToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top  - containerRect.top - 8,
      text,
    });
  };

  const saveHighlight = async () => {
    if (!highlightToolbar) return;
    try {
      const res = await fetch(`${API}/books/${selectedBook.id}/highlights`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          page_number: currentPage,
          selected_text: highlightToolbar.text,
          note: highlightNote || null,
          color: highlightColor,
        }),
      });
      if (res.ok) {
        const h = await res.json();
        setHighlights(prev => [...prev, h]);
      }
    } catch (e) { console.error(e); }
    setHighlightToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = async (highlightId) => {
    await fetch(`${API}/books/highlights/${highlightId}`, { method: "DELETE", headers: authHeaders() });
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  };

  const pctRead = (book) => {
    if (!book.total_pages || book.total_pages === 0) return 0;
    return Math.round(((book.current_page - 1) / book.total_pages) * 100);
  };

  // Memoize PDF file object (must be above any early return)
  const pdfFile = useMemo(() => {
    if (!selectedBook) return null;
    return {
      url: `${API}/books/${selectedBook.id}/file`,
      httpHeaders: { Authorization: `Bearer ${token}` },
    };
  }, [selectedBook?.id, token]); // eslint-disable-line

  // ── LIBRARY VIEW ────────────────────────────────────────────────────────────
  if (view === "library") {
    const goalPct = Math.min(100, Math.round((pagesToday / dailyGoal) * 100));
    const continueBook = books.find(
      (b) => b.total_pages > 0 && (b.current_page || 1) < b.total_pages
    ) || books[0];
    return (
      <div className="books-page">
        <div className="books-lib-hero">
          <div className="books-lib-hero-inner">
            <div className="books-lib-hero-left">
              <h1 className="books-lib-title">My Books</h1>
              <p className="books-lib-tagline">Upload PDFs, read, and track your progress</p>
              <div className="books-lib-stats-row">
                <div className="books-lib-stat">
                  <span className="books-lib-stat-val">{books.length}</span>
                  <span className="books-lib-stat-label">In library</span>
                </div>
                <div className="books-lib-stat-div" aria-hidden />
                <div className="books-lib-stat">
                  <span className="books-lib-stat-val">
                    {pagesToday} / {dailyGoal}
                  </span>
                  <span className="books-lib-stat-label">Pages today</span>
                </div>
                <div className="books-lib-stat-div" aria-hidden />
                <div className="reading-goal-bar-wrap books-lib-goal">
                  <span className="reading-goal-label">Daily goal</span>
                  <div className="reading-goal-track">
                    <div className="reading-goal-fill" style={{ width: `${goalPct}%` }} />
                  </div>
                  <button
                    type="button"
                    className="reading-goal-edit"
                    title="Set daily goal"
                    onClick={async () => {
                      const v = prompt("Daily reading goal (pages):", dailyGoal);
                      if (!v || isNaN(v)) return;
                      setDailyGoal(parseInt(v));
                      await fetch(`${API}/books/reading-goal`, {
                        method: "PUT",
                        headers: { ...authHeaders(), "Content-Type": "application/json" },
                        body: JSON.stringify({ daily_pages_goal: parseInt(v) }),
                      });
                    }}
                  >
                    ✎
                  </button>
                </div>
              </div>
            </div>
            <div className="books-lib-hero-right">
              <button type="button" className="books-btn-upload" onClick={() => setShowUpload(true)}>
                + Upload Book
              </button>
            </div>
          </div>
        </div>

        {continueBook && books.length > 0 && (
          <div className="books-current-wrap">
            <div className="section-label">Continue reading</div>
            <button
              type="button"
              className="books-cr-card"
              onClick={() => openBook(continueBook)}
            >
              <div className="books-cr-cover">
                {continueBook.cover_data ? (
                  <img src={continueBook.cover_data} alt="" />
                ) : (
                  <div className="books-cr-cover-placeholder" aria-hidden>
                    <span className="books-cr-spine" />
                    <span className="books-cr-shimmer" />
                    <span className="books-cr-mini-title">{continueBook.title}</span>
                  </div>
                )}
              </div>
              <div className="books-cr-info">
                <div className="books-cr-title">{continueBook.title}</div>
                <div className="books-cr-meta">
                  {continueBook.total_pages > 0
                    ? `p.${continueBook.current_page || 1} / ${continueBook.total_pages} · ${pctRead(continueBook)}%`
                    : `p.${continueBook.current_page || 1}`}
                </div>
                <div className="books-cr-prog-wrap">
                  <div className="books-cr-prog-bar">
                    <div
                      className="books-cr-prog-fill"
                      style={{ width: `${pctRead(continueBook)}%` }}
                    />
                  </div>
                  <span className="books-cr-pct">{pctRead(continueBook)}%</span>
                </div>
              </div>
              <span className="books-cr-open">Open →</span>
            </button>
          </div>
        )}

        {showUpload && (
          <div className="modal-overlay" onClick={() => setShowUpload(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Upload PDF Book</h2>
                <button className="close-btn" onClick={() => setShowUpload(false)}>×</button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Book Title *</label>
                    <input type="text" value={uploadForm.title} required
                      onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Sahih Al-Bukhari" />
                  </div>
                  <div className="form-group">
                    <label>Author</label>
                    <input type="text" value={uploadForm.author}
                      onChange={e => setUploadForm(p => ({ ...p, author: e.target.value }))}
                      placeholder="e.g. Imam Bukhari" />
                  </div>
                  <div className="form-group">
                    <label>PDF File *</label>
                    <input type="file" accept=".pdf,application/pdf" required
                      onChange={e => {
                        const f = e.target.files[0];
                        setUploadFile(f);
                        if (f && !uploadForm.title)
                          setUploadForm(p => ({ ...p, title: f.name.replace(/\.pdf$/i, "") }));
                      }} />
                    <small style={{ color: "var(--text-muted)" }}>Max 100 MB</small>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                      {uploading ? "Uploading…" : "📤 Upload"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /><p>Loading books…</p></div>
        ) : books.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📚</div>
            <h3>No books yet</h3>
            <p>Upload your first PDF to get started</p>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setShowUpload(true)}>
              + Upload Book
            </button>
          </div>
        ) : (
          <div className="books-all">
            <div className="section-label">All books</div>
            <div className="book-grid kit-book-grid">
              {books.map((book) => (
                <div key={book.id} className="book-card kit-book-card" onClick={() => openBook(book)}>
                  <div className="book-cover-3d">
                    {book.cover_data ? (
                      <div className="bk-inner bk-inner--img">
                        <img src={book.cover_data} alt="" className="kit-book-cover-img" />
                      </div>
                    ) : (
                      <div className="bk-inner bk-inner--placeholder">
                        <span className="bk-spine" aria-hidden />
                        <span className="bk-shimmer" aria-hidden />
                        <span className="bk-name">{book.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="book-meta-row kit-book-meta-row">
                    <div className="book-meta-title">{book.title}</div>
                    {book.author && <div className="book-meta-author">{book.author}</div>}
                    <div className="book-meta-sub">
                      {book.total_pages > 0
                        ? `p.${book.current_page} / ${book.total_pages} · ${pctRead(book)}%`
                        : `p.${book.current_page}`}
                    </div>
                    <div className="bk-prog">
                      <div
                        className="bk-prog-fill"
                        style={{ width: `${pctRead(book)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="book-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(book.id);
                    }}
                    title="Delete book"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── READER VIEW ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`book-reader kit-reader${fullscreen ? " book-reader--fullscreen" : ""}`}
      ref={containerRef}
      onMouseUp={handleMouseUp}
    >
      {/* Top bar — Book.html reader-bar */}
      <div className="book-reader-bar kit-reader-bar">
        <button
          type="button"
          className="book-back-btn kit-r-back"
          onClick={() => {
            setView("library");
            setSelectedBook(null);
          }}
        >
          ← Library
        </button>
        <span className="kit-r-sep" aria-hidden />
        <div className="book-reader-title kit-r-title-wrap">
          <span className="kit-r-title-strong">{selectedBook?.title}</span>
          {selectedBook?.author && (
            <span className="book-reader-author kit-r-title-sub">by {selectedBook.author}</span>
          )}
        </div>
        <div className="book-reader-controls kit-r-controls">
          {/* Favourite pages picker */}
          <div className="relative" style={{ position: "relative" }}>
            <button
              className={`book-highlights-toggle${showFavPages ? " active" : ""}`}
              onClick={() => { setShowFavPages(p => !p); setShowHighlights(false); setShowNotes(false); }}
              title="Favourite pages"
              style={{ fontSize: "1rem" }}
            >
              {favPages.includes(currentPage) ? "♥" : "♡"}
              {favPages.length > 0 && (
                <span className="book-highlights-count">{favPages.length}</span>
              )}
            </button>

            {showFavPages && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", left: "50%",
                  transform: "translateX(-50%)", zIndex: 100,
                  background: "var(--surface, #fff)", border: "1px solid var(--edge, #e2e8f0)",
                  borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  padding: "0.6rem", minWidth: "160px",
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem", paddingBottom: "0.4rem", borderBottom: "1px solid var(--edge, #e2e8f0)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-sub, #64748b)" }}>♥ Favourite Pages</span>
                  <button
                    onClick={toggleFavPage}
                    style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "999px", border: "1px solid", cursor: "pointer", background: "transparent",
                      color: favPages.includes(currentPage) ? "#f43f5e" : "var(--ink-muted, #94a3b8)",
                      borderColor: favPages.includes(currentPage) ? "#f43f5e" : "var(--edge, #e2e8f0)",
                    }}
                    title={favPages.includes(currentPage) ? "Remove p." + currentPage : "Save p." + currentPage}
                  >
                    {favPages.includes(currentPage) ? "♥ p." + currentPage : "♡ p." + currentPage}
                  </button>
                </div>
                {favPages.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--ink-muted, #94a3b8)", margin: 0, textAlign: "center", padding: "0.4rem 0" }}>
                    No favourite pages yet.<br />Click ♡ to save this page.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "220px", overflowY: "auto" }}>
                    {favPages.map(pg => (
                      <button
                        key={pg}
                        onClick={() => { goToPage(pg); setShowFavPages(false); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.35rem 0.5rem", borderRadius: "7px", border: "none", cursor: "pointer",
                          background: pg === currentPage ? "rgba(244,63,94,0.08)" : "transparent",
                          color: pg === currentPage ? "#f43f5e" : "var(--ink, #0f172a)",
                          fontSize: "0.82rem", fontWeight: pg === currentPage ? 700 : 400,
                          textAlign: "left",
                        }}
                      >
                        <span>p. {pg}</span>
                        <button
                          onClick={e => { e.stopPropagation(); toggleFavPageDirect(pg); }}
                          style={{ fontSize: "0.7rem", color: "#f43f5e", background: "transparent", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                          title="Remove"
                        >×</button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="book-nav-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
            ‹ Prev
          </button>
          <div className="book-page-input-wrap">
            <input type="number" className="book-page-input" value={pageInput}
              min={1} max={numPages || 9999}
              onChange={e => setPageInput(e.target.value)}
              onBlur={() => goToPage(parseInt(pageInput) || 1)}
              onKeyDown={e => { if (e.key === "Enter") goToPage(parseInt(pageInput) || 1); }} />
            {numPages && <span className="book-page-total">/ {numPages}</span>}
          </div>
          <button className="book-nav-btn" onClick={() => goToPage(currentPage + 1)}
            disabled={numPages && currentPage >= numPages}>Next ›</button>
          <div className="book-zoom-controls">
            <button className="book-zoom-btn" onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}>−</button>
            <span className="book-zoom-label">{Math.round(scale * 100)}%</span>
            <button className="book-zoom-btn" onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}>+</button>
          </div>

          {/* Highlights toggle */}
          <button
            className={`book-highlights-toggle${showHighlights ? " active" : ""}`}
            onClick={() => { setShowHighlights(p => !p); setShowNotes(false); }}
            title="Highlights">
            ✏ {highlights.length > 0 && <span className="book-highlights-count">{highlights.length}</span>}
          </button>

          {/* Notes toggle */}
          <button
            className={`book-highlights-toggle${showNotes ? " active" : ""}`}
            onClick={() => { setShowNotes(p => !p); setShowHighlights(false); }}
            title="Page Notes">
            📝
          </button>

          {/* Fullscreen toggle */}
          <button
            className={`book-highlights-toggle${fullscreen ? " active" : ""}`}
            onClick={() => setFullscreen(p => !p)}
            title={fullscreen ? "Exit full page (Esc)" : "Full page preview"}
          >
            {fullscreen ? "⊡" : "⊞"}
          </button>
        </div>
      </div>

      <div className="book-reader-body kit-reader-body">
        {/* PDF canvas */}
        <div className="book-pdf-area kit-pdf-pane">
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              if (selectedBook && (!selectedBook.total_pages || selectedBook.total_pages === 0)) {
                saveProgress(selectedBook.id, currentPage, n);
              }
            }}
            onLoadError={e => console.error("PDF load error", e)}
            loading={<div className="loading-container"><div className="spinner" /><p>Loading PDF…</p></div>}
          >
            <Page pageNumber={currentPage} scale={scale} renderTextLayer renderAnnotationLayer />

            {selectedBook && !selectedBook.cover_data && !thumbnailSavedRef.current.has(selectedBook.id) && (
              <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0 }}>
                <Page pageNumber={1} scale={0.5} renderTextLayer={false} renderAnnotationLayer={false}
                  canvasRef={coverCanvasRef}
                  onRenderSuccess={() => saveThumbnail(selectedBook.id)} />
              </div>
            )}
          </Document>
        </div>

        {/* Highlights panel */}
        {showHighlights && (
          <div className="highlights-panel kit-highlights-side">
            <div className="highlights-panel-header">
              <span>✏ Highlights ({highlights.length})</span>
              <button className="close-btn" onClick={() => setShowHighlights(false)}>×</button>
            </div>
            <div className="highlights-panel-body">
              {highlights.length === 0 ? (
                <p className="empty-msg">No highlights yet. Select text to add one.</p>
              ) : (
                [...highlights].sort((a, b) => a.page_number - b.page_number).map(h => (
                  <div key={h.id} className="highlight-item" style={{ borderLeftColor: h.color }}>
                    <div className="highlight-item-page" onClick={() => goToPage(h.page_number)}>
                      p.{h.page_number}
                    </div>
                    <div className="highlight-item-text">"{h.selected_text}"</div>
                    {h.note && <div className="highlight-item-note">{h.note}</div>}
                    <button className="highlight-item-delete" onClick={() => deleteHighlight(h.id)} title="Delete">×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Notes panel */}
        {showNotes && selectedBook && (
          <NotesPanel
            key={`${selectedBook.id}-${currentPage}`}
            bookId={selectedBook.id}
            currentPage={currentPage}
            onClose={() => setShowNotes(false)}
            authHeaders={authHeaders}
          />
        )}
      </div>

      {/* Floating highlight toolbar */}
      {highlightToolbar && (
        <div className="highlight-toolbar"
          style={{ left: highlightToolbar.x, top: highlightToolbar.y }}
          onMouseDown={e => e.preventDefault()}>
          <div className="highlight-toolbar-colors">
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c}
                className={`highlight-color-btn${highlightColor === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => setHighlightColor(c)} />
            ))}
          </div>
          <input className="highlight-note-input" placeholder="Add note (optional)…"
            value={highlightNote}
            onChange={e => setHighlightNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveHighlight(); }} />
          <div className="highlight-toolbar-actions">
            <button className="btn btn-primary btn-small" onClick={saveHighlight}>Save</button>
            <button className="btn btn-small" onClick={() => { setHighlightToolbar(null); window.getSelection()?.removeAllRanges(); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Books;

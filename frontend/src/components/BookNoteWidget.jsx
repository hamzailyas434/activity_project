import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { API_BASE_URL as API } from "../config";

const EMPTY_CONTENT = ["", "<br>", "<br/>", "<p><br></p>"];
const isEmpty = (c) => !c || EMPTY_CONTENT.includes(c.trim());

const stripHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText || div.textContent || "";
};

// ── Full-page zoom modal ───────────────────────────────────────────────────────
function PageZoomModal({ pdfFile, pageNumber, bookTitle, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mt-10 mb-10 w-[min(780px,92vw)] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <span className="text-[0.82rem] font-semibold text-gray-700">
            {bookTitle} — p.{pageNumber}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 bg-transparent border-none cursor-pointer text-lg leading-none transition-colors"
            title="Close (Esc)"
          >×</button>
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          <Document
            file={pdfFile}
            loading={<div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading page…</div>}
            error={<div className="flex items-center justify-center py-16 text-gray-400 text-sm">Could not load PDF.</div>}
          >
            <Page
              pageNumber={pageNumber}
              width={Math.min(780, window.innerWidth * 0.92) - 2}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}

const FAV_BOOK = { id: "favourites", title: "♥ Favourites" };

// ── Main widget ───────────────────────────────────────────────────────────────
export default function BookNoteWidget({ token, onOpenBook }) {
  // Summary (total + books list)
  const [summary, setSummary]   = useState({ total: 0, books: [] });
  const [favCount, setFavCount] = useState(0);

  // All-books mode: random notes via idx bump
  const [randomNote, setRandomNote]   = useState(null);
  const [randomLoading, setRandomLoading] = useState(true);
  const [randomIdx, setRandomIdx]     = useState(0);

  // Per-book / favourites mode
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookNotes, setBookNotes]       = useState([]);
  const [noteIndex, setNoteIndex]       = useState(0);
  const [bookLoading, setBookLoading]   = useState(false);

  // UI
  const [zoomed, setZoomed]           = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const previewRef                    = useRef(null);
  const pickerRef                     = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch notes summary on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/books/notes-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { total: 0, books: [] })
      .then(data => setSummary(data))
      .catch(() => {});
    fetch(`${API}/books/favourite-notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setFavCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [token]);

  // Fetch random note (all-books mode)
  useEffect(() => {
    if (!token || selectedBook) return;
    setRandomLoading(true);
    fetch(`${API}/books/random-page-note`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setRandomNote(data))
      .catch(() => setRandomNote(null))
      .finally(() => setRandomLoading(false));
  }, [randomIdx, token, selectedBook]);

  // Fetch all notes for selected book (or favourites)
  const fetchBookNotes = useCallback(async (book) => {
    setBookLoading(true);
    setBookNotes([]);
    setNoteIndex(0);
    try {
      const url = book.id === "favourites"
        ? `${API}/books/favourite-notes`
        : `${API}/books/${book.id}/page-notes-all`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(n => !isEmpty(n.content));
        setBookNotes(filtered);
        if (book.id === "favourites") setFavCount(filtered.length);
      }
    } catch(e) { console.error(e); }
    finally { setBookLoading(false); }
  }, [token]);

  const selectBook = (book) => {
    setSelectedBook(book);
    setShowPicker(false);
    setZoomed(false);
    fetchBookNotes(book);
  };

  const selectFavourites = () => {
    setSelectedBook(FAV_BOOK);
    setShowPicker(false);
    setZoomed(false);
    fetchBookNotes(FAV_BOOK);
  };

  const selectAllBooks = () => {
    setSelectedBook(null);
    setShowPicker(false);
    setZoomed(false);
    setRandomIdx(i => i + 1);
  };

  // Navigation
  const goNext = () => {
    if (selectedBook) {
      setNoteIndex(i => Math.min(i + 1, bookNotes.length - 1));
      setZoomed(false);
    } else {
      setRandomIdx(i => i + 1);
      setZoomed(false);
    }
  };

  const goPrev = () => {
    if (selectedBook) {
      setNoteIndex(i => Math.max(i - 1, 0));
      setZoomed(false);
    } else {
      setRandomIdx(i => i + 1); // random mode: prev also fetches new random
      setZoomed(false);
    }
  };

  // Derive current note
  const note      = selectedBook ? (bookNotes[noteIndex] ?? null) : randomNote;
  const isLoading = selectedBook ? bookLoading : randomLoading;

  const pdfFile = useMemo(() => {
    if (!note) return null;
    return {
      url: `${API}/books/${note.book_id}/file`,
      httpHeaders: { Authorization: `Bearer ${token}` },
    };
  }, [note?.book_id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Counts for display
  const totalLabel = selectedBook
    ? `${bookNotes.length} note${bookNotes.length !== 1 ? "s" : ""}`
    : `${summary.total} note${summary.total !== 1 ? "s" : ""}`;

  const positionLabel = selectedBook && bookNotes.length > 0
    ? `${noteIndex + 1} / ${bookNotes.length}`
    : null;

  const canPrev = selectedBook ? noteIndex > 0 : true;
  const canNext = selectedBook ? noteIndex < bookNotes.length - 1 : true;

  return (
    <>
      <div className="glass rounded-xl h-full box-border flex flex-col px-6 py-4 min-h-[180px]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 shrink-0 relative" ref={pickerRef}>
          {/* Book selector button */}
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1.5 text-[0.78rem] font-bold text-ink hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 max-w-[55%] text-left"
            title="Filter by book"
          >
            <span>{selectedBook?.id === "favourites" ? "♥" : "📖"}</span>
            <span className="truncate">
              {selectedBook ? selectedBook.title : "All Books"}
            </span>
            <span className="text-ink-muted font-normal shrink-0">({totalLabel})</span>
            <span className="text-ink-muted text-[0.65rem] shrink-0">▾</span>
          </button>

          {/* Book picker dropdown */}
          {showPicker && (
            <div className="absolute top-full left-0 z-50 bg-surface border border-edge rounded-xl shadow-glass p-1.5 w-64 flex flex-col gap-0.5 mt-1 max-h-[240px] overflow-y-auto thin-scroll">
              {/* All Books */}
              <button
                onClick={selectAllBooks}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[0.78rem] border-none cursor-pointer transition-colors ${
                  !selectedBook
                    ? "bg-primary text-white font-semibold"
                    : "bg-transparent text-ink hover:bg-gtint-hov"
                }`}
              >
                All Books
                <span className="ml-1 text-[0.7rem] opacity-70">({summary.total})</span>
              </button>

              {/* Favourites */}
              <button
                onClick={selectFavourites}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[0.78rem] border-none cursor-pointer transition-colors ${
                  selectedBook?.id === "favourites"
                    ? "bg-rose-500 text-white font-semibold"
                    : "bg-transparent text-rose-500 hover:bg-rose-50/60"
                }`}
              >
                ♥ Favourites
                <span className="ml-1 text-[0.7rem] opacity-70">({favCount})</span>
              </button>

              {summary.books.length > 0 && (
                <div className="border-t border-edge/40 my-0.5" />
              )}
              {summary.books.length === 0 && (
                <p className="text-[0.73rem] text-ink-muted italic px-2.5 py-1">No notes saved yet.</p>
              )}
              {summary.books.map(b => (
                <button
                  key={b.id}
                  onClick={() => selectBook(b)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[0.78rem] border-none cursor-pointer transition-colors ${
                    selectedBook?.id === b.id
                      ? "bg-primary text-white font-semibold"
                      : "bg-transparent text-ink hover:bg-gtint-hov"
                  }`}
                >
                  <span className="truncate block">{b.title}</span>
                  <span className={`text-[0.68rem] ${selectedBook?.id === b.id ? "opacity-75" : "text-ink-muted"}`}>
                    {b.note_count} note{b.note_count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {positionLabel && (
              <span className="text-[0.7rem] text-ink-muted font-medium">{positionLabel}</span>
            )}
            <button
              onClick={goPrev}
              disabled={!canPrev}
              title="Previous note"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gborder-sub bg-gtint-surf text-ink-muted text-[0.75rem] cursor-pointer hover:text-primary hover:border-primary transition-colors disabled:opacity-25 disabled:cursor-default"
            >◀</button>
            <button
              onClick={goNext}
              disabled={!canNext}
              title="Next note"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gborder-sub bg-gtint-surf text-ink-muted text-[0.75rem] cursor-pointer hover:text-primary hover:border-primary transition-colors disabled:opacity-25 disabled:cursor-default"
            >▶</button>
          </div>
        </div>

        {/* ── Body: note text (left) + page preview (right) ── */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

          {/* Left: note text */}
          <div className="flex-1 overflow-y-auto thin-scroll min-w-0">
            {isLoading ? (
              <p className="text-[0.8rem] text-ink-muted italic">Loading…</p>
            ) : !note ? (
              <p className="text-[0.8rem] text-ink-muted italic">
                {selectedBook
                  ? "No notes found for this book."
                  : "No book notes yet. Start reading and add notes to see them here."}
              </p>
            ) : (
              <div
                className="text-[0.85rem] leading-[1.6] text-ink break-words"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content) }}
              />
            )}
          </div>

          {/* Right: PDF page thumbnail — small fixed size */}
          {note && !isLoading && pdfFile && (
            <div
              ref={previewRef}
              className="shrink-0 w-[110px] overflow-hidden rounded-lg border border-edge shadow-sm flex items-start justify-center bg-white/70 cursor-zoom-in relative group self-start"
              onClick={() => setZoomed(true)}
              title="Click to read full page"
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/20 rounded-lg z-10 pointer-events-none">
                <span className="text-white text-[0.65rem] font-medium">🔍</span>
              </div>
              <Document
                file={pdfFile}
                loading={
                  <div className="w-[110px] h-[140px] flex items-center justify-center">
                    <span className="text-[0.65rem] text-ink-muted">…</span>
                  </div>
                }
                error={
                  <div className="w-[110px] h-[80px] flex items-center justify-center px-2">
                    <span className="text-[0.6rem] text-ink-muted text-center">N/A</span>
                  </div>
                }
              >
                <Page
                  pageNumber={note.page_number}
                  width={110}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {note && !isLoading && (
          <div className="mt-3 pt-2 border-t border-gborder-sub shrink-0 flex items-center justify-between gap-2">
            <span className="text-[0.72rem] text-ink-muted leading-tight">
              {selectedBook?.id === "favourites" && (
                <span className="text-rose-400 font-semibold mr-1">♥ Favourite</span>
              )}
              From <span className="font-semibold text-ink-sub">{note.book_title}</span>
              {" · "}p.{note.page_number}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomed(true)}
                className="text-[0.72rem] px-2 py-[0.2rem] rounded-full bg-gtint-surf text-ink-muted border border-gborder-sub hover:text-primary hover:border-primary transition-colors cursor-pointer font-medium whitespace-nowrap"
              >
                🔍 Read page
              </button>
              <button
                onClick={() => onOpenBook(note.book_id, note.page_number)}
                className="text-[0.72rem] px-2 py-[0.2rem] rounded-full bg-primary text-white border-none cursor-pointer hover:opacity-85 transition-opacity font-medium whitespace-nowrap"
              >
                Open →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-page zoom modal */}
      {zoomed && note && pdfFile && (
        <PageZoomModal
          pdfFile={pdfFile}
          pageNumber={note.page_number}
          bookTitle={note.book_title}
          onClose={() => setZoomed(false)}
        />
      )}
    </>
  );
}

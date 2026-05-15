import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL as API } from "../config";
import { Icon } from "./rhythm/RhythmAtoms";
import "./FavouriteNoteModal.css";

function stripHtml(html) {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || d.innerText || "";
}

function noteSnippet(note, max = 52) {
  const raw = stripHtml(note.content || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return "—";
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

function noteHeading(note) {
  const raw = stripHtml(note.content || "").trim();
  const line = raw.split(/\n/)[0] || "Note";
  return line.length > 140 ? `${line.slice(0, 140)}…` : line;
}

export default function FavouriteNoteModal({
  open,
  activeNote,
  bookSiblings,
  onClose,
  onOpenBookPage,
  onFavouritesChanged,
}) {
  const { token } = useAuth();
  const [displayNote, setDisplayNote] = useState(activeNote);
  const [liked, setLiked] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (activeNote) {
      setDisplayNote(activeNote);
      setLiked(!!activeNote.is_favourite);
    }
  }, [activeNote]);

  const sortedSiblings = useMemo(() => {
    return [...(bookSiblings || [])].sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
  }, [bookSiblings]);

  const idx = sortedSiblings.findIndex(n => n.id === displayNote?.id);
  const currentPage = displayNote?.page_number ?? 0;

  useEffect(() => {
    if (!open) return;
    const onEsc = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !displayNote) return null;

  const bookTitle = displayNote.book_title || "Book";

  const goPrev = () => {
    if (idx <= 0) return;
    setDisplayNote(sortedSiblings[idx - 1]);
  };

  const goNext = () => {
    if (idx < 0 || idx >= sortedSiblings.length - 1) return;
    setDisplayNote(sortedSiblings[idx + 1]);
  };

  const handleToggleFavourite = async () => {
    if (!token || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`${API}/books/page-notes/${displayNote.id}/favourite`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const now = !!data.is_favourite;
        setLiked(now);
        onFavouritesChanged?.();
        if (!now) onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  const handleOpenInBooks = () => {
    const bookId = displayNote.book_id;
    const page = displayNote.page_number || 1;
    localStorage.setItem("pending-open-book", JSON.stringify({ bookId, page }));
    onOpenBookPage?.();
    onClose();
  };

  return (
    <div className="fnm-backdrop" onClick={onClose} role="presentation">
      <div
        className="fnm-shell"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fnm-dialog-title"
      >
        <div className="fnm-top">
          <div className="fnm-crumb">
            <span>Books</span>
            <span className="dot" />
            <strong>{bookTitle}</strong>
            <span className="dot" />
            <span>p.{currentPage}</span>
          </div>
          <div className="fnm-top-right">
            <button
              type="button"
              className={`fnm-heart-btn${liked ? " on" : ""}`}
              onClick={handleToggleFavourite}
              disabled={toggling}
            >
              <span aria-hidden>{liked ? "♥" : "♡"}</span>
              {liked ? "Favourited" : "Favourite"}
            </button>
            <button type="button" className="fnm-close" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="fnm-body">
          <section className="fnm-left">
            <div className="fnm-left-head">
              <h2 id="fnm-dialog-title" className="fnm-h">
                <span className="pin" aria-hidden>
                  📌
                </span>
                {noteHeading(displayNote)}
              </h2>
              <div className="fnm-sub">
                <span className="fnm-chip-soft">Favourite note</span>
                <span>{bookTitle}</span>
              </div>
            </div>
            <div
              className="fnm-text rhythm-note-html"
              dangerouslySetInnerHTML={{ __html: displayNote.content || "<p>—</p>" }}
            />
          </section>

          <aside className="fnm-right">
            <div className="fnm-cover-wrap">
              <div className="fnm-cover">
                <div className="bkmark">Book</div>
                <div>
                  <div className="bktitle">{bookTitle.slice(0, 42)}</div>
                </div>
                <div className="bkvol">Page notes</div>
              </div>
            </div>
            <div className="fnm-cover-meta">
              <div className="fnm-cover-title">{bookTitle}</div>
              <div className="fnm-cover-sub">Favourite notes on this book</div>
            </div>

            <div className="fnm-pages-head">
              <span>Notes in this book</span>
              <span>{sortedSiblings.length}</span>
            </div>
            <div className="fnm-pages">
              {sortedSiblings.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={`fnm-page${n.id === displayNote.id ? " current" : ""}`}
                  onClick={() => setDisplayNote(n)}
                >
                  <span className="fnm-page-num">p.{n.page_number ?? "—"}</span>
                  <span className="fnm-page-label">{noteSnippet(n, 48)}</span>
                  <span className="fnm-page-arrow" aria-hidden>
                    <Icon name="chevron" size={14} />
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="fnm-footer">
          <div className="fnm-footer-left">
            <div className="fnm-nav">
              <button type="button" onClick={goPrev} disabled={idx <= 0} aria-label="Previous note">
                <Icon name="chevronL" size={14} />
              </button>
              <button type="button" onClick={goNext} disabled={idx >= sortedSiblings.length - 1} aria-label="Next note">
                <Icon name="chevron" size={14} />
              </button>
            </div>
            <div className="fnm-current-pg">
              Open page{" "}
              <strong>
                p.{currentPage}
              </strong>
            </div>
          </div>
          <button type="button" className="fnm-open" onClick={handleOpenInBooks}>
            <Icon name="book" size={16} />
            Open page on the book
          </button>
        </div>
      </div>
    </div>
  );
}

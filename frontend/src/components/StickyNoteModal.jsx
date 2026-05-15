import { useEffect, useId, useRef } from "react";
import StickyNoteEditor from "./StickyNoteEditor";
import { Icon } from "./rhythm/RhythmAtoms";

export default function StickyNoteModal({
  open,
  note,
  stickyColors,
  onClose,
  onStickyChange,
  onStickyColor,
  onDeleteSticky,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && panelRef.current) {
      const t = setTimeout(() => panelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, note?.id]);

  if (!open || !note) return null;

  return (
    <div
      className="sticky-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="sticky-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <header className="sticky-modal-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Pinned
            </div>
            <h2 id={titleId} className="sticky-modal-title">
              Sticky note
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn sticky-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div
          className="sticky-modal-body"
          style={{
            background: note.color,
            borderRadius: "var(--r-md)",
            boxShadow:
              "inset 0 0 0 1px color-mix(in srgb, var(--fg) 10%, transparent)",
          }}
        >
          <StickyNoteEditor
            noteId={note.id}
            value={note.text}
            onChange={txt => onStickyChange(note.id, txt)}
            defaultEditorHeight={240}
          />
        </div>

        <footer className="sticky-modal-foot">
          <div className="sticky-modal-colors" aria-label="Note color">
            {stickyColors.map(c => (
              <button
                key={c}
                type="button"
                className={`color-dot${note.color === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => onStickyColor(note.id, c)}
                title="Color"
              />
            ))}
          </div>
          <div className="sticky-modal-actions">
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => {
                onDeleteSticky(note.id);
                onClose();
              }}
            >
              Delete
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useAuth } from "../contexts/AuthContext";
import RichTextEditor from "./RichTextEditor";
import { useToast } from "./ToastContainer";
import { API_BASE_URL } from "../config";

/* ── Inline icons ── */
const IcoSearch  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
const IcoPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoEdit    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoTrash   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14"/></svg>;
const IcoX       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCat     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7h18M3 12h18M3 17h12"/></svg>;
const IcoQ       = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.7.5-1.5 1.2-1.5 2.5"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>;
const IcoAns     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const IcoCheck   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m5 12 5 5L20 7"/></svg>;
const IcoBulb    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21h6v-1H9zm3-19a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>;
const IcoDoc     = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><rect x="4" y="2" width="14" height="20" rx="2"/><line x1="8" y1="10" x2="14" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>;

const SANITIZE_OPTS = { FORBID_ATTR: ["style"], FORBID_TAGS: ["font", "iframe", "object", "embed"] };
const sanitize = html => DOMPurify.sanitize(html || "", SANITIZE_OPTS);

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ── Notes component ── */
function Notes() {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [notes, setNotes]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [view, setView]           = useState("list"); // "list" | "form"
  const [editingNote, setEditingNote] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [fullActiveNote, setFullActiveNote] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [newCategoryName, setNewCategoryName]     = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const [formData, setFormData] = useState({
    category: "",
    question: "",
    answers: [{ answer: "", is_very_good: false }],
  });

  /* ── Auth fetch ── */
  const authFetch = (url, opts = {}) =>
    fetch(url, {
      ...opts,
      headers: {
        ...opts.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": opts.headers?.["Content-Type"] || "application/json",
      },
    });

  /* ── Data fetching ── */
  useEffect(() => { fetchNotes(); fetchCategories(); }, [token, selectedCategory, searchTerm]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams();
      if (selectedCategory) p.append("category", selectedCategory);
      if (searchTerm)        p.append("search", searchTerm);
      p.append("limit", "200");
      const r = await authFetch(`${API_BASE_URL}/notes?${p}`);
      if (r.ok) setNotes(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const r = await authFetch(`${API_BASE_URL}/notes/categories`);
      if (r.ok) setCategories(await r.json());
    } catch (e) { console.error(e); }
  };

  /* ── Load full note for reading pane ── */
  const activeNote = notes.find(n => n.id === activeNoteId) ?? notes[0] ?? null;

  useEffect(() => {
    if (!activeNote) { setFullActiveNote(null); return; }
    authFetch(`${API_BASE_URL}/notes/${activeNote.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setFullActiveNote(d))
      .catch(() => setFullActiveNote(activeNote));
  }, [activeNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayedNote = fullActiveNote?.id === activeNote?.id ? fullActiveNote : activeNote;

  /* ── Form helpers ── */
  const startCreate = () => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answers: [{ answer: "", is_very_good: false }] });
    setView("form");
  };

  const startEdit = note => {
    const answers = note.answers?.length > 0
      ? note.answers.map(a => ({ answer: a.answer || "", is_very_good: a.is_very_good || false }))
      : [{ answer: note.answer || "", is_very_good: false }];
    setEditingNote(note);
    setFormData({ category: note.category || "", question: note.question || "", answers });
    setView("form");
  };

  const cancelForm = () => {
    setView("list");
    setEditingNote(null);
    setShowNewCategoryInput(false);
    setNewCategoryName("");
    setFormData({ category: "", question: "", answers: [{ answer: "", is_very_good: false }] });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const valid = formData.answers.filter(a => {
      const txt = String(a.answer || "").replace(/<[^>]*>/g, "").trim();
      return txt.length > 0 || String(a.answer || "").trim().length > 0;
    });
    if (!valid.length)              { showToast("At least one answer is required", "error"); return; }
    if (!formData.category?.trim()) { showToast("Category is required", "error"); return; }
    if (!formData.question?.trim()) { showToast("Question is required", "error"); return; }

    try {
      const savedId = editingNote?.id;
      const url     = editingNote ? `${API_BASE_URL}/notes/${editingNote.id}` : `${API_BASE_URL}/notes`;
      const method  = editingNote ? "PUT" : "POST";
      const r = await authFetch(url, {
        method,
        body: JSON.stringify({ category: formData.category.trim(), question: formData.question.trim(), answers: valid }),
      });
      if (r.ok) {
        await fetchNotes();
        fetchCategories();
        setFullActiveNote(null);       // clear stale cache so reading pane shows fresh data
        if (savedId) setActiveNoteId(savedId); // keep same note selected
        cancelForm();
        showToast(editingNote ? "Note updated!" : "Note created!", "success");
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (e) { showToast(`Error: ${e.message}`, "error"); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this note?")) return;
    try {
      const r = await authFetch(`${API_BASE_URL}/notes/${id}`, { method: "DELETE" });
      if (r.ok) {
        if (activeNoteId === id) setActiveNoteId(null);
        fetchNotes();
        fetchCategories();
        if (view === "form") setView("list");
        showToast("Note deleted!", "success");
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (e) { showToast(`Error: ${e.message}`, "error"); }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) { setShowNewCategoryInput(false); return; }
    const cat = newCategoryName.trim();
    if (!categories.includes(cat)) setCategories(prev => [...prev, cat].sort());
    setFormData(f => ({ ...f, category: cat }));
    setNewCategoryName("");
    setShowNewCategoryInput(false);
  };

  /* ══════════════════════════════════════════
     FORM VIEW
  ══════════════════════════════════════════ */
  if (view === "form") {
    return (
      <div className="notes-form-view">
        <ToastContainer />

        {/* Breadcrumb */}
        <div className="nf-crumb">
          <a className="nf-crumb-link" onClick={() => setView("list")}>Notes</a>
          {editingNote && (
            <>
              <span className="nf-crumb-sep">/</span>
              <a className="nf-crumb-link" onClick={() => setView("list")}>{editingNote.category}</a>
            </>
          )}
          <span className="nf-crumb-sep">/</span>
          <span className="nf-crumb-current">{editingNote ? "Edit" : "New note"}</span>
        </div>

        {/* Page head */}
        <div className="nf-page-head">
          <div>
            <div className={`eyebrow nf-eyebrow${editingNote ? " nf-eyebrow-edit" : ""}`}>
              {editingNote && <span className="nf-eyebrow-dot" />}
              {editingNote ? "Editing note" : "Notes & Q&A"}
            </div>
            <div className="nf-h1">
              {editingNote ? "Edit note" : "Create a new note"}
              {editingNote && (
                <span className="nf-h1-q">
                  &ldquo;{editingNote.question.length > 60 ? editingNote.question.slice(0, 60) + "…" : editingNote.question}&rdquo;
                </span>
              )}
            </div>
            {!editingNote && (
              <div className="nf-sub">
                Capture a question and one or more answers. Keep them private and search them later.
              </div>
            )}
          </div>
          <div className="nf-head-actions">
            {showNewCategoryInput ? (
              <div className="nf-cat-input-row">
                <input
                  type="text"
                  className="nf-cat-input"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setShowNewCategoryInput(false); setNewCategoryName(""); }
                  }}
                  autoFocus
                />
                <button type="button" className="nf-btn-ghost" onClick={handleAddCategory}>Add</button>
                <button type="button" className="nf-btn-ghost" onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(""); }}>
                  <IcoX />
                </button>
              </div>
            ) : (
              <button type="button" className="nf-btn-ghost" onClick={() => setShowNewCategoryInput(true)}>
                <IcoPlus /> Category
              </button>
            )}
            {editingNote && (
              <button type="button" className="nf-btn-ghost nf-btn-ghost-danger" onClick={() => handleDelete(editingNote.id)}>
                <IcoTrash /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <form className="nf-form-card" onSubmit={handleSubmit}>
          <div className="nf-form-card-head">
            <div className="nf-form-card-title">
              <div className={`nf-title-icon${editingNote ? " nf-title-icon-edit" : " nf-title-icon-create"}`}>
                {editingNote
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                }
              </div>
              {editingNote ? "Edit details" : "New note"}
            </div>
            <button type="button" className="icon-btn" onClick={cancelForm} title="Close"><IcoX /></button>
          </div>

          <div className="nf-form-card-body">
            {/* Category */}
            <div className="nf-field">
              <div className="nf-field-label"><IcoCat /> Category</div>
              <select
                className="fi-select"
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                required
              >
                <option value="">Select a category…</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {!editingNote && (
                <div className="nf-field-tip">
                  <span className="nf-field-tip-bulb"><IcoBulb /></span>
                  Tip — add a new category with the &quot;+ Category&quot; button above.
                </div>
              )}
            </div>

            {/* Question */}
            <div className="nf-field">
              <div className="nf-field-label"><IcoQ /> Question</div>
              <textarea
                className="fi-textarea"
                placeholder="What's your question? — keep it short and specific."
                value={formData.question}
                onChange={e => setFormData(f => ({ ...f, question: e.target.value }))}
                required
              />
            </div>

            {/* Answers */}
            <div className="nf-field">
              <div className="nf-field-label" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IcoAns /> Answers</span>
                <span style={{ textTransform: "none", color: "var(--fg-faint)", letterSpacing: ".02em", fontWeight: 400 }}>
                  {formData.answers.length} total · {formData.answers.filter(a => a.is_very_good).length} marked &quot;very good&quot;
                </span>
              </div>
              {!editingNote && (
                <div className="nf-field-tip" style={{ marginBottom: 10 }}>
                  <span className="nf-field-tip-bulb"><IcoBulb /></span>
                  Add multiple answers — mark the best one as{" "}
                  <strong style={{ color: "var(--mineral-400)" }}>Very good</strong>.
                </div>
              )}
              <div className="nf-answers-list">
                {formData.answers.map((ans, i) => (
                  <div key={i} className={`nf-answer-card${ans.is_very_good ? " very-good" : ""}`}>
                    <div className="nf-answer-card-head">
                      <span className="nf-answer-num">
                        <span className="nf-answer-num-badge">{i + 1}</span>
                        Answer
                      </span>
                      <div className="nf-answer-card-actions">
                        <label className={`nf-very-good-toggle${ans.is_very_good ? " on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={ans.is_very_good || false}
                            onChange={e => {
                              const next = [...formData.answers];
                              next[i] = { ...next[i], is_very_good: e.target.checked };
                              setFormData(f => ({ ...f, answers: next }));
                            }}
                          />
                          <IcoCheck /> Very good
                        </label>
                        {formData.answers.length > 1 && (
                          <button
                            type="button"
                            className="nf-remove-btn"
                            onClick={() => {
                              const next = formData.answers.filter((_, idx) => idx !== i);
                              setFormData(f => ({ ...f, answers: next.length ? next : [{ answer: "", is_very_good: false }] }));
                            }}
                            title="Remove answer"
                          >
                            <IcoTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    <RichTextEditor
                      value={ans.answer}
                      onChange={answer => {
                        const next = [...formData.answers];
                        next[i] = { ...next[i], answer };
                        setFormData(f => ({ ...f, answers: next }));
                      }}
                      placeholder={`Enter answer ${i + 1}… Use the toolbar to format text.`}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="nf-add-another"
                onClick={() => setFormData(f => ({ ...f, answers: [...f.answers, { answer: "", is_very_good: false }] }))}
              >
                <IcoPlus /> Add another answer
              </button>
            </div>
          </div>

          <div className="nf-form-card-foot">
            <div className="nf-foot-hint">
              <kbd>Esc</kbd> to discard
            </div>
            <div className="nf-foot-actions">
              <button type="button" className="nf-btn-cancel" onClick={cancelForm}>
                <IcoX /> Discard
              </button>
              <button type="submit" className="nf-btn-save">
                <span className="nf-sparkle">✦</span>
                {editingNote ? "Save changes" : "Create note"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     LIST VIEW  (3-column)
  ══════════════════════════════════════════ */
  const allCats = ["All", ...categories];

  return (
    <div className="notes-page">
      <ToastContainer />
      <div className="notes-3col">

        {/* ── Sidebar ── */}
        <aside className="notes-sidebar">
          <div className="notes-sidebar-head">
            <div className="notes-sidebar-title">Notes</div>
            <div className="notes-search-box">
              <IcoSearch />
              <input
                placeholder="Search…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="notes-sidebar-cats">
            <div className="notes-cat-label">Categories</div>
            {allCats.map(cat => {
              const val   = cat === "All" ? "" : cat;
              const count = cat === "All" ? notes.length : notes.filter(n => n.category === cat).length;
              return (
                <button
                  key={cat}
                  className={`notes-cat-btn${selectedCategory === val ? " active" : ""}`}
                  onClick={() => setSelectedCategory(val)}
                >
                  <span>{cat}</span>
                  <span className="notes-cat-count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="notes-sidebar-foot">
            <button className="notes-btn-new" onClick={startCreate}>
              <IcoPlus /> New note
            </button>
          </div>
        </aside>

        {/* ── List pane ── */}
        <div className="notes-list-pane">
          <div className="notes-list-head">
            <span className="notes-list-head-label">{selectedCategory || "All"}</span>
            <span className="notes-list-head-count">{notes.length}</span>
          </div>
          <div className="notes-list-scroll thin-scroll">
            {loading && notes.length === 0 ? (
              <div className="notes-list-empty">Loading…</div>
            ) : notes.length === 0 ? (
              <div className="notes-list-empty">No notes found.</div>
            ) : (
              notes.map(note => {
                const isActive = activeNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    className={`notes-row${isActive ? " active" : ""}`}
                    onClick={() => setActiveNoteId(note.id)}
                  >
                    <div className="notes-row-cat">{note.category}</div>
                    <div className="notes-row-q">{note.question}</div>
                    <div className="notes-row-meta">
                      <span>{fmtDate(note.created_at)}</span>
                      <span className="notes-row-dot" />
                      <span>{note.answers?.length ?? 0} ans</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Reading pane ── */}
        <div className="notes-reading-pane">
          {!displayedNote ? (
            <div className="notes-reading-empty">
              <IcoDoc />
              <span>Select a note to read</span>
            </div>
          ) : (
            <>
              <div className="notes-reading-head">
                <div className="notes-reading-cat">{displayedNote.category}</div>
                <div className="notes-reading-question">{displayedNote.question}</div>
                <div className="notes-reading-date">{fmtDate(displayedNote.created_at)}</div>
              </div>

              <div className="notes-answers-section">
                <div className="notes-section-rule">
                  <div className="notes-rule-line" />
                  <div className="notes-rule-label">
                    Answers · {displayedNote.answers?.length ?? 0}
                  </div>
                  <div className="notes-rule-line" />
                </div>
              </div>

              <div className="notes-reading-scroll thin-scroll">
                {(displayedNote.answers?.length > 0
                  ? [...displayedNote.answers].sort((a, b) => {
                      if (a.is_very_good && !b.is_very_good) return -1;
                      if (!a.is_very_good && b.is_very_good) return 1;
                      return (a.display_order || 0) - (b.display_order || 0);
                    })
                  : displayedNote.answer
                    ? [{ id: "legacy", answer: displayedNote.answer, is_very_good: false }]
                    : []
                ).map((ans, i) => (
                  <div key={ans.id ?? i} className={`notes-answer-card${ans.is_very_good ? " very-good" : ""}`}>
                    <div className="notes-answer-num">
                      Answer {i + 1}
                      {ans.is_very_good && <span className="notes-vg-badge"> · Very good</span>}
                    </div>
                    <div
                      className="notes-answer-body answer-content-full"
                      dangerouslySetInnerHTML={{ __html: sanitize(ans.answer) }}
                    />
                  </div>
                ))}
                {!displayedNote.answers?.length && !displayedNote.answer && (
                  <p style={{ color: "var(--fg-faint)", fontSize: 13 }}>No answers yet.</p>
                )}
              </div>

              <div className="notes-reading-toolbar">
                <button className="notes-tb-btn" onClick={() => startEdit(displayedNote)}>
                  <IcoEdit /> Edit
                </button>
                <button className="notes-tb-btn notes-tb-btn-danger" onClick={() => handleDelete(displayedNote.id)}>
                  <IcoTrash /> Delete
                </button>
                <div style={{ flex: 1 }} />
                <span className="notes-reading-ts">
                  {displayedNote.updated_at && displayedNote.updated_at !== displayedNote.created_at
                    ? `Edited ${fmtDate(displayedNote.updated_at)}`
                    : `Created ${fmtDate(displayedNote.created_at)}`
                  }
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Notes;

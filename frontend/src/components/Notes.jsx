import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useAuth } from "../contexts/AuthContext";
import RichTextEditor from "./RichTextEditor";
import { useToast } from "./ToastContainer";

import { API_BASE_URL } from "../config";

function Notes() {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(100);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [modalNote, setModalNote] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    question: "",
    answer: "",
    answers: [{ answer: "", is_very_good: false }],
  });
  const [editingAnswerId, setEditingAnswerId] = useState(null);

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": options.headers?.["Content-Type"] || "application/json",
      },
    });
  };

  useEffect(() => {
    fetchNotes();
    fetchCategories();
  }, [token, selectedCategory, searchTerm, limit]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      if (limit) params.append("limit", limit);

      const res = await authFetch(
        `${API_BASE_URL}/notes?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/notes/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };


  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setShowNewCategoryInput(false);
      return;
    }

    const category = newCategoryName.trim();
    // Categories are created automatically when notes are added, so just update local state
    if (!categories.includes(category)) {
      setCategories([...categories, category].sort());
    }
    setFormData({ ...formData, category });
    setNewCategoryName("");
    setShowNewCategoryInput(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const url = editingNote
        ? `${API_BASE_URL}/notes/${editingNote.id}`
        : `${API_BASE_URL}/notes`;
      const method = editingNote ? "PUT" : "POST";

      // Filter out completely empty answers (but keep answers with HTML/whitespace)
      const validAnswers = formData.answers.filter(a => {
        if (!a.answer) return false;
        const answerStr = String(a.answer);
        // Remove HTML tags and check if there's actual content
        const textContent = answerStr.replace(/<[^>]*>/g, '').trim();
        // Keep if there's text content OR if the original string has any length (might be HTML)
        const hasContent = textContent.length > 0 || answerStr.trim().length > 0;
        console.log("Filtering answer:", {
          originalLength: answerStr.length,
          textContentLength: textContent.length,
          trimmedLength: answerStr.trim().length,
          hasContent,
          preview: answerStr.substring(0, 50)
        });
        return hasContent;
      });
      
      if (validAnswers.length === 0) {
        showToast("At least one answer is required", "error");
        return;
      }
      
      console.log("Valid answers after filtering:", validAnswers.length, "out of", formData.answers.length);

      // Ensure category is not empty
      if (!formData.category || formData.category.trim() === "") {
        showToast("Category is required", "error");
        return;
      }

      // Ensure question is not empty
      if (!formData.question || formData.question.trim() === "") {
        showToast("Question is required", "error");
        return;
      }

      const payload = {
        category: formData.category.trim(),
        question: formData.question.trim(),
        answers: validAnswers,
      };

      console.log("Submitting note:", { 
        editing: !!editingNote, 
        category: payload.category,
        question: payload.question.substring(0, 50),
        answersCount: validAnswers.length,
        answers: validAnswers.map(a => ({ 
          answerLength: a.answer?.length || 0,
          answerPreview: String(a.answer || "").substring(0, 30),
          is_very_good: a.is_very_good 
        }))
      });

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchNotes();
        fetchCategories();
        setShowForm(false);
        setEditingNote(null);
        setFormData({ category: "", question: "", answer: "", answers: [{ answer: "", is_very_good: false }] });
        showToast(editingNote ? "Note updated successfully!" : "Note created successfully!", "success");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error response:", { status: res.status, errorData });
        const errorMessage = errorData.error || errorData.details || `Server error (${res.status})`;
        console.error("Full error details:", JSON.stringify(errorData, null, 2));
        console.error("Error message:", errorMessage);
        console.error("Error details:", errorData.details);
        console.error("Error received:", errorData.received);
        showToast(`Failed to save note: ${errorMessage}`, "error");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      showToast(`Error: ${error.message || "Failed to save note"}`, "error");
    }
  };

  const handleEdit = note => {
    setEditingNote(note);
    // Use answers array if available, otherwise use legacy answer field
    const answers = note.answers && note.answers.length > 0
      ? note.answers.map(a => ({ answer: a.answer || "", is_very_good: a.is_very_good || false }))
      : (note.answer ? [{ answer: note.answer, is_very_good: false }] : [{ answer: "", is_very_good: false }]);
    
    setFormData({
      category: note.category || "",
      question: note.question || "",
      answer: note.answer || "",
      answers: answers,
    });
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.querySelector(".note-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async id => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/notes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchNotes();
        fetchCategories();
        showToast("Note deleted successfully!", "success");
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(`Failed to delete note: ${errorData.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      showToast(`Error: ${error.message || "Failed to delete note"}`, "error");
    }
  };

  const toggleExpand = id => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const openModal = async note => {
    // If note doesn't have answers array, fetch full note details
    if (!note.answers || note.answers.length === 0) {
      try {
        const res = await authFetch(`${API_BASE_URL}/notes/${note.id}`);
        if (res.ok) {
          const fullNote = await res.json();
          setModalNote(fullNote);
        } else {
          // Fallback to the note we have
          setModalNote(note);
        }
      } catch (error) {
        console.error("Error fetching full note:", error);
        // Fallback to the note we have
        setModalNote(note);
      }
    } else {
      setModalNote(note);
    }
  };

  const closeModal = () => {
    setModalNote(null);
  };

  const renderAnswer = answer => {
    if (!answer) return "";
    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answer) }} />;
  };

  if (loading && notes.length === 0) {
    return (
      <div className="notes-loading">
        <div className="loading-spinner"></div>
        <p>Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="notes-section">
      <ToastContainer />
      <div className="section-header">
        <div className="section-title">
          <h2>📝 Notes</h2>
          <p className="section-subtitle">
            Organize your questions and answers by category
          </p>
        </div>
        <div className="section-header-actions">
          <div className="category-manager">
            {showNewCategoryInput ? (
              <div className="new-category-input">
                <input
                  type="text"
                  placeholder="Category name (e.g., Python)"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === "Enter") {
                      handleAddCategory();
                    } else if (e.key === "Escape") {
                      setShowNewCategoryInput(false);
                      setNewCategoryName("");
                    }
                  }}
                  className="category-input"
                  autoFocus
                />
                <button
                  onClick={handleAddCategory}
                  className="btn btn-small btn-primary"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryName("");
                  }}
                  className="btn btn-small btn-secondary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowNewCategoryInput(true);
                  setShowForm(true);
                }}
                className="btn btn-secondary btn-small"
                title="Add New Category"
              >
                + Category
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingNote(null);
              setFormData({ category: "", question: "", answer: "", answers: [{ answer: "", is_very_good: false }] });
            }}
            className="btn btn-primary btn-large"
          >
            + Add Note
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="notes-filters">
        <div className="filter-group">
          <label>
            <span className="filter-icon">📁</span> Category
          </label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-group-search">
          <label>
            <span className="filter-icon">🔍</span> Search
          </label>
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>
            <span className="filter-icon">📊</span> Limit
          </label>
          <select
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="note-form">
          <div className="form-header">
            <h3>
              {editingNote ? "Edit Note" : "Add New Note"}
            </h3>
            <button
              type="button"
              onClick={() => {
              setShowForm(false);
              setEditingNote(null);
              setFormData({ category: "", question: "", answer: "", answers: [{ answer: "", is_very_good: false }] });
              setShowNewCategoryInput(false);
              }}
              className="btn-close-form"
            >
              &times;
            </button>
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">📁</span> Category
            </label>
            <div className="category-selector">
              <select
                value={formData.category}
                onChange={e =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="form-select"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {!formData.category && (
                <div className="category-help">
                  <small>💡 Tip: Add a new category using "+ Category" button above</small>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">❓</span> Question
            </label>
            <textarea
              value={formData.question}
              onChange={e =>
                setFormData({ ...formData, question: e.target.value })
              }
              placeholder="Enter your question..."
              required
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">💬</span> Answers
            </label>
            <div className="editor-help">
              <small>
                💡 You can add multiple answers. Use toolbar buttons to format text (bold, italic, headings, lists, links)
              </small>
            </div>
            {formData.answers.map((ans, index) => (
              <div key={index} className="answer-item">
                <div className="answer-item-header">
                  <label className="answer-number">Answer {index + 1}</label>
                  <div className="answer-item-actions">
                    <label className="very-good-checkbox">
                      <input
                        type="checkbox"
                        checked={ans.is_very_good || false}
                        onChange={e => {
                          const newAnswers = [...formData.answers];
                          newAnswers[index].is_very_good = e.target.checked;
                          setFormData({ ...formData, answers: newAnswers });
                        }}
                      />
                      <span className="checkmark">✓</span>
                      <span className="very-good-label">Very Good</span>
                    </label>
                    {formData.answers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newAnswers = formData.answers.filter((_, i) => i !== index);
                          setFormData({ ...formData, answers: newAnswers.length > 0 ? newAnswers : [{ answer: "", is_very_good: false }] });
                        }}
                        className="btn-icon-small btn-icon-danger"
                        title="Remove Answer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <RichTextEditor
                  value={ans.answer}
                  onChange={answer => {
                    const newAnswers = [...formData.answers];
                    newAnswers[index].answer = answer;
                    setFormData({ ...formData, answers: newAnswers });
                  }}
                  placeholder={`Enter answer ${index + 1}... Use toolbar to format text (bold, italic, lists, headings, links)`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  answers: [...formData.answers, { answer: "", is_very_good: false }],
                });
              }}
              className="btn btn-secondary btn-small"
              style={{ marginTop: "0.5rem" }}
            >
              + Add Another Answer
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-large">
              {editingNote ? "💾 Update Note" : "✨ Create Note"}
            </button>
            <button
              type="button"
              onClick={() => {
              setShowForm(false);
              setEditingNote(null);
              setFormData({ category: "", question: "", answer: "", answers: [{ answer: "", is_very_good: false }] });
              setShowNewCategoryInput(false);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="empty-notes">
          <div className="empty-icon">📝</div>
          <h3>No notes found</h3>
          <p>
            {selectedCategory
              ? `No notes in "${selectedCategory}" category.`
              : "Create your first note to get started!"}
          </p>
          <button
            onClick={() => {
              setShowForm(true);
            }}
            className="btn btn-primary"
          >
            + Add Your First Note
          </button>
        </div>
      ) : (
        <div className="notes-list">
          {notes
            .filter(note => editingNote?.id !== note.id) // Hide note being edited
            .map((note, index) => {
            return (
              <div key={note.id} className="note-card" onClick={() => openModal(note)} style={{ cursor: "pointer" }}>
                <div className="note-header">
                  <div className="note-category-badge">
                    <span className="category-icon-small">📁</span>
                    {note.category}
                  </div>
                  <div className="note-actions">
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(note); }}
                      className="btn-icon-small"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                      className="btn-icon-small btn-icon-danger"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="note-question">
                  <span className="question-label">Q:</span>
                  <span className="question-text">{note.question}</span>
                </div>

                {/* Answers — always clamped, modal opens for full view */}
                <div className="note-answers-list">
                  {note.answers && note.answers.length > 0 ? (
                    note.answers.map((ans, ansIndex) => (
                      <div key={ans.id || ansIndex} className={`note-answer${ans.is_very_good ? " very-good-answer" : ""}`}>
                        <div className="answer-header">
                          <span className="answer-label">A{note.answers.length > 1 ? ` ${ansIndex + 1}` : ""}:</span>
                          {ans.is_very_good && (
                            <span className="very-good-badge" title="Very Good Answer">
                              ✓ Very Good
                            </span>
                          )}
                        </div>
                        <div className="answer-text answer-clamped">
                          {renderAnswer(ans.answer)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="note-answer">
                      <div className="answer-text answer-clamped">
                        {renderAnswer(note.answer || "")}
                      </div>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); openModal(note); }} className="btn btn-link btn-see-more">
                    See More →
                  </button>
                </div>

                <div className="note-footer">
                  <small className="note-date">
                    📅 Created: {new Date(note.created_at).toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </small>
                  {note.updated_at !== note.created_at && (
                    <small className="note-updated">
                      ✏️ Updated: {new Date(note.updated_at).toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric', 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Full Note View */}
      {modalNote && (
        <div className="modal-overlay fade-in" onClick={closeModal}>
          <div
            className="modal-content modal-large"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Note Details</h2>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-note-category">
                <span className="category-icon-small">📁</span>
                {modalNote.category}
              </div>

              <div className="modal-note-question">
                <h3>
                  <span className="question-label">Q:</span> {modalNote.question}
                </h3>
              </div>

              <div className="modal-note-answer">
                <h3>Answers:</h3>
                {modalNote.answers && modalNote.answers.length > 0 ? (
                  <div className="modal-answers-list">
                    {/* Sort answers: very good ones first, then by display_order */}
                    {[...modalNote.answers]
                      .sort((a, b) => {
                        // Very good answers first
                        if (a.is_very_good && !b.is_very_good) return -1;
                        if (!a.is_very_good && b.is_very_good) return 1;
                        // Then by display_order
                        if (a.display_order !== b.display_order) {
                          return (a.display_order || 0) - (b.display_order || 0);
                        }
                        // Finally by created_at
                        return new Date(a.created_at) - new Date(b.created_at);
                      })
                      .map((ans, ansIndex) => (
                        <div key={ans.id || ansIndex} className={`modal-answer-item ${ans.is_very_good ? 'very-good-answer' : ''}`}>
                          <div className="answer-header">
                            <span className="answer-label">Answer {ansIndex + 1}:</span>
                            {ans.is_very_good && (
                              <span className="very-good-badge" title="Very Good Answer">
                                ✓ Very Good
                              </span>
                            )}
                          </div>
                          <div className="answer-content-full">
                            {renderAnswer(ans.answer)}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="answer-content-full">
                    {renderAnswer(modalNote.answer || "")}
                  </div>
                )}
              </div>

              <div className="modal-note-footer">
                <small>
                  📅 Created:{" "}
                  {new Date(modalNote.created_at).toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </small>
                {modalNote.updated_at !== modalNote.created_at && (
                  <small>
                    ✏️ Updated:{" "}
                    {new Date(modalNote.updated_at).toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </small>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => {
                    closeModal();
                    handleEdit(modalNote);
                  }}
                  className="btn btn-primary"
                >
                  ✏️ Edit Note
                </button>
                <button
                  onClick={() => {
                    closeModal();
                    handleDelete(modalNote.id);
                  }}
                  className="btn btn-danger"
                >
                  🗑️ Delete Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notes;

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import DayDetailsModal from "./DayDetailsModal";

// Helper component for Input Cells
function CellInput({ type, value, onSave, placeholder }) {
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <input
      type={type}
      className="cell-input"
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      onClick={e => e.stopPropagation()} // Prevent double click trigger mostly
    />
  );
}

function Calendar({
  activities,
  completions,
  year,
  month,
  onToggleCompletion,
  onSaveNote,
  onValueChange,
  onActivityReorder,
}) {
  const [editingNote, setEditingNote] = useState(null);
  const [notesList, setNotesList] = useState([]); // Array of notes
  const [noteAccentColor, setNoteAccentColor] = useState(""); // Color picker in note dialog
  const [selectedDayModal, setSelectedDayModal] = useState(null); // { day: number, date: string }
  const [draggedActivityId, setDraggedActivityId] = useState(null);
  const [dragOverActivityId, setDragOverActivityId] = useState(null);
  const dialogRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const todayHeaderRef = useRef(null);

  // Get number of days in the month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Determine today
  const todayDate = new Date();
  const isCurrentMonth =
    todayDate.getMonth() + 1 === month && todayDate.getFullYear() === year;
  const todayDay = isCurrentMonth ? todayDate.getDate() : null;

  // Auto-scroll calendar so today's column is visible when we're past day 15
  useEffect(() => {
    if (!isCurrentMonth || todayDay == null || todayDay < 15) return;
    const el = todayHeaderRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      try {
        el.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      } catch (_) {
        // ignore scroll errors
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [year, month, isCurrentMonth, todayDay]);

  const handleCheckboxChange = useCallback(
    (activityId, day) => {
      onToggleCompletion(activityId, day);
    },
    [onToggleCompletion]
  );

  const completionKey = (day, activityId) => `${Number(day)}-${Number(activityId)}`;

  const getCompletionData = (activityId, day) => {
    const key = completionKey(day, activityId);
    const data = completions[key];
    if (typeof data === "object" && data !== null) {
      // Parse notes if it's a string (JSON array)
      let notes = [];
      if (data.note) {
        try {
          notes =
            typeof data.note === "string" ? JSON.parse(data.note) : data.note;
          if (!Array.isArray(notes)) {
            // Legacy: single note string, convert to array
            notes = data.note.trim() ? [data.note] : [];
          }
        } catch {
          // If not JSON, treat as single note
          notes = data.note.trim() ? [data.note] : [];
        }
      }
      return { ...data, notes };
    }
    return {
      isCompleted: data === 1 || data === true,
      note: "",
      notes: [],
      value: "",
      completionColor: "",
    };
  };

  const handleDoubleClick = (activityId, day) => {
    const data = getCompletionData(activityId, day);
    setEditingNote({ activityId, day });
    setNoteAccentColor(data.completionColor || "");
    // Initialize notes list - use notes array if available, otherwise convert note string to array
    const notes =
      data.notes && Array.isArray(data.notes) && data.notes.length > 0
        ? [...data.notes]
        : data.note && data.note.trim()
        ? [data.note]
        : [""];
    setNotesList(notes);
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const handleDayClick = day => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    setSelectedDayModal({ day, date: dateStr });
  };

  const handleSaveNote = () => {
    if (editingNote) {
      // Filter out empty notes and save as JSON string
      const validNotes = notesList.filter(note => note.trim() !== "");
      const notesJson = JSON.stringify(validNotes);
      onSaveNote(editingNote.activityId, editingNote.day, notesJson, noteAccentColor);
      handleCloseDialog();
    }
  };

  const handleCloseDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    setEditingNote(null);
    setNotesList([]);
    setNoteAccentColor("");
  };

  const handleAddNoteRow = () => {
    setNotesList([...notesList, ""]);
  };

  const handleRemoveNoteRow = index => {
    const newNotes = notesList.filter((_, i) => i !== index);
    setNotesList(newNotes.length > 0 ? newNotes : [""]);
  };

  const handleNoteChange = (index, value) => {
    const newNotes = [...notesList];
    newNotes[index] = value;
    setNotesList(newNotes);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, id) => {
    console.log("Drag started", id);
    setDraggedActivityId(id);
    // Required for Firefox
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
    // Make the ghost image a bit transparent
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = e => {
    console.log("Drag ended");
    e.currentTarget.style.opacity = "1";
    setDraggedActivityId(null);
    setDragOverActivityId(null);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault(); // Necessary for Allow Drop
    if (draggedActivityId === id) return;
    setDragOverActivityId(id);
  };

  const handleDrop = (e, targetId) => {
    console.log("Dropped on", targetId);
    e.preventDefault();

    if (draggedActivityId && draggedActivityId !== targetId) {
      const sourceIndex = activities.findIndex(a => a.id === draggedActivityId);
      const targetIndex = activities.findIndex(a => a.id === targetId);

      console.log("Reordering from", sourceIndex, "to", targetIndex);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newActivities = [...activities];
        const [moved] = newActivities.splice(sourceIndex, 1);
        newActivities.splice(targetIndex, 0, moved);

        if (onActivityReorder) {
          onActivityReorder(newActivities);
        }
      }
    }
    setDraggedActivityId(null);
    setDragOverActivityId(null);
  };

  if (activities.length === 0) {
    return (
      <div className="calendar-wrapper empty-state fade-in">
        <h3>No activities to track</h3>
        <p>Add some activities above to start tracking!</p>
      </div>
    );
  }

  return (
    <>
      <div className="calendar-wrapper fade-in">
        <div ref={scrollContainerRef} className="calendar-scroll">
          <table className="calendar-table">
            <thead>
              <tr>
                <th className="routine-header" style={{ zIndex: 60 }}>
                  Routine
                </th>
                {days.map(day => {
                  const date = new Date(year, month - 1, day);
                  const dayOfWeek = date.getDay();
                  const dayAbbr = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][
                    dayOfWeek
                  ];
                  const isToday = day === todayDay;
                  return (
                    <th
                      key={day}
                      ref={isToday ? todayHeaderRef : undefined}
                      className={isToday ? "is-today-header" : ""}
                    >
                      <div className="day-header-simple">
                        <span className="day-abbr">{dayAbbr}</span>
                        <span className="day-number">{day}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, activityIndex) => (
                <tr
                  key={activity.id}
                  draggable
                  onDragStart={e => handleDragStart(e, activity.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, activity.id)}
                  onDrop={e => handleDrop(e, activity.id)}
                  style={{
                    opacity: draggedActivityId === activity.id ? 0.4 : 1,
                    backgroundColor:
                      dragOverActivityId === activity.id
                        ? "var(--surface-hover)"
                        : "",
                  }}
                >
                  <td
                    className="routine-cell"
                    style={dragOverActivityId === activity.id ? { borderRight: "3px solid var(--primary-color)" } : undefined}
                    title="Drag to reorder"
                  >
                    <div className="routine-cell-inner">
                      <span className="cal-drag-handle" aria-hidden>⋮⋮</span>
                      <span className="routine-cell-name">{activity.name}</span>
                      {activity.type !== "checkbox" && (
                        <span className="header-type-badge">
                          {activity.type === "number" ? "#" : "T"}
                        </span>
                      )}
                    </div>
                  </td>
                  {days.map(day => {
                    const data = getCompletionData(activity.id, day);
                    const { isCompleted, note, notes, value, completionColor } = data;
                    const isInput =
                      activity.type === "number" || activity.type === "text";
                    const isToday = day === todayDay;
                    const hasNotes =
                      (notes && Array.isArray(notes) && notes.length > 0) ||
                      (note && note.trim());
                    const notePreview =
                      notes && Array.isArray(notes) && notes.length > 0
                        ? notes[0].substring(0, 50) +
                          (notes[0].length > 50 ? "..." : "")
                        : note && note.length > 50
                        ? note.substring(0, 50) + "..."
                        : note;

                    return (
                      <td
                        key={`${day}-${activity.id}`}
                        className={`checkbox-cell ${
                          isToday ? "is-today-cell" : ""
                        }`}
                        onDoubleClick={() =>
                          handleDoubleClick(activity.id, day)
                        }
                        onClick={e => {
                          // Only open day modal if clicking on the cell itself, not on checkbox/input
                          if (
                            e.target === e.currentTarget ||
                            e.target.classList.contains("checkbox-cell")
                          ) {
                            if (isToday) {
                              handleDayClick(day);
                            }
                          }
                        }}
                        title={
                          isToday
                            ? "Click to manage daily tasks"
                            : hasNotes
                            ? `Notes: ${notePreview || "View notes"}`
                            : isInput
                            ? "Enter value"
                            : "Double-click to add notes"
                        }
                      >
                        <div
                          className="checkbox-container"
                          onClick={e => e.stopPropagation()}
                        >
                          {isInput ? (
                            <CellInput
                              type={activity.type}
                              value={value}
                              onSave={val =>
                                onValueChange &&
                                onValueChange(activity.id, day, val)
                              }
                              placeholder="-"
                            />
                          ) : (
                            <button
                              type="button"
                              className={`cal-check${isCompleted ? " cal-check--done" : ""}`}
                              style={isCompleted && completionColor ? { backgroundColor: completionColor, borderColor: completionColor } : undefined}
                              onClick={e => {
                                e.stopPropagation();
                                handleCheckboxChange(activity.id, day);
                              }}
                              aria-pressed={isCompleted}
                              aria-label={`Mark ${activity.name} as completed for day ${day}`}
                            />
                          )}
                          {hasNotes && <div className="note-indicator" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-Day Progress Strip */}
        <div className="cal-progress-strip-wrapper">
          <div className="cal-progress-strip-label">Daily %</div>
          <div className="cal-progress-strip">
            {days.map(day => {
              const completed = activities.filter(activity => {
                const { isCompleted } = getCompletionData(activity.id, day);
                return isCompleted;
              }).length;
              const pct = activities.length > 0
                ? Math.round((completed / activities.length) * 100)
                : 0;
              const color = pct >= 80
                ? "var(--success)"
                : pct >= 40
                ? "var(--warning)"
                : pct > 0
                ? "var(--danger-color)"
                : "var(--border)";
              const isToday = day === todayDay;
              return (
                <div
                  key={day}
                  className={`cal-progress-cell${isToday ? " cal-progress-cell--today" : ""}`}
                  title={`Day ${day}: ${pct}% (${completed}/${activities.length})`}
                >
                  <div
                    className="cal-progress-bar"
                    style={{ height: `${Math.max(pct, 2)}%`, background: color }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Graph */}
        <div className="progress-graph">
          <div className="progress-graph-label">Monthly trend</div>
          <svg
            className="progress-chart"
            viewBox={`0 0 ${days.length * 40} 100`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--secondary-color)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--secondary-color)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines at 25%, 50%, 75% */}
            {[25, 50, 75].map(pct => (
              <line
                key={pct}
                x1="0"
                y1={100 - pct}
                x2={days.length * 40}
                y2={100 - pct}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* Area fill */}
            <polygon
              fill="url(#chartGradient)"
              points={[
                `0,100`,
                ...days.map((day, index) => {
                  const completed = activities.filter(activity => {
                    const { isCompleted } = getCompletionData(activity.id, day);
                    return isCompleted;
                  }).length;
                  const percentage = activities.length > 0 ? completed / activities.length : 0;
                  return `${index * 40 + 20},${100 - percentage * 98}`;
                }),
                `${(days.length - 1) * 40 + 20},100`,
              ].join(" ")}
            />

            {/* Line */}
            <polyline
              fill="none"
              stroke="var(--secondary-color)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={days
                .map((day, index) => {
                  const completed = activities.filter(activity => {
                    const { isCompleted } = getCompletionData(activity.id, day);
                    return isCompleted;
                  }).length;
                  const percentage =
                    activities.length > 0 ? completed / activities.length : 0;
                  return `${index * 40 + 20},${100 - percentage * 98}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      </div>

      <dialog ref={dialogRef} className="note-dialog">
        <div className="note-dialog-content">
          {/* Header */}
          <div className="note-dialog-header">
            <div className="note-dialog-icon">📝</div>
            <div className="note-dialog-title">
              <h3>Notes</h3>
              {editingNote && (() => {
                const act = activities.find(a => a.id === editingNote.activityId);
                const date = new Date(year, month - 1, editingNote.day);
                const dateStr = date.toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
                return <p className="note-context">{act?.name ?? "Activity"} · {dateStr}</p>;
              })()}
            </div>
            <button className="note-dialog-close" onClick={handleCloseDialog} type="button" aria-label="Close">✕</button>
          </div>

          {/* Notes body */}
          <div className="note-dialog-body">
            {notesList.map((note, index) => (
              <div key={index} className="note-row">
                <div className="note-row-num">{index + 1}</div>
                <textarea
                  value={note}
                  onChange={e => handleNoteChange(index, e.target.value)}
                  placeholder={`Add note ${index + 1}…`}
                  rows={3}
                  autoFocus={index === notesList.length - 1 && notesList.length > 0}
                />
                {notesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNoteRow(index)}
                    className="btn-remove-note"
                    title="Remove note"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Color accent row */}
          <div className="note-color-row">
            <span className="note-color-label">Color</span>
            <div className="note-color-swatches">
              {["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"].map(color => (
                <button
                  key={color || "default"}
                  type="button"
                  className={`note-color-swatch${noteAccentColor === color ? " note-color-swatch--active" : ""}`}
                  style={color ? { backgroundColor: color, borderColor: color } : undefined}
                  title={color || "Default (theme)"}
                  onClick={() => setNoteAccentColor(color)}
                >
                  {!color && <span className="note-color-default-icon">✕</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="note-dialog-actions">
            <button onClick={handleAddNoteRow} className="btn btn-secondary" type="button">
              + Add Note
            </button>
            <div className="note-dialog-actions-right">
              <button onClick={handleCloseDialog} className="btn">Cancel</button>
              <button onClick={handleSaveNote} className="btn btn-primary">💾 Save</button>
            </div>
          </div>
        </div>
      </dialog>

      <DayDetailsModal
        isOpen={!!selectedDayModal}
        onClose={() => setSelectedDayModal(null)}
        date={selectedDayModal?.date}
        dayNumber={selectedDayModal?.day}
        note="" // Not implemented globally yet
        onSaveNote={() => {}} // Placeholder
      />
    </>
  );
}

export default Calendar;

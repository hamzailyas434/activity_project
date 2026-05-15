import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import DayDetailsModal from "./DayDetailsModal";
import TrendSpark from "./TrendSpark";
import { Icon } from "./rhythm/RhythmAtoms";

const WEEK_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Per-cell completion color from notes modal → CSS `--mx-user-completion` + `.mx-has-user-completion` for Rhythm overrides. */
function userCompletionClassAndStyle(completionColor) {
  const s =
    completionColor != null && String(completionColor).trim()
      ? String(completionColor).trim()
      : "";
  if (!s) return { extraClass: "", mxStyle: undefined };
  return {
    extraClass: " mx-has-user-completion",
    mxStyle: { "--mx-user-completion": s },
  };
}

function rowStatsFromCodes(codes, statsDayIdx) {
  if (statsDayIdx < 0) {
    return { done: 0, elig: 0, streak: 0, pct: 0 };
  }
  let done = 0;
  let elig = 0;
  for (let i = 0; i <= statsDayIdx; i++) {
    const c = codes[i];
    if (c === 3 || c === 4) continue;
    elig++;
    if (c === 1) done++;
    else if (c === 2) done += 0.5;
  }
  let streak = 0;
  for (let i = statsDayIdx; i >= 0; i--) {
    const c = codes[i];
    if (c === 1 || c === 2) streak++;
    else if (c === 3) continue;
    else break;
  }
  return { done, elig, streak, pct: elig ? done / elig : 0 };
}

function DailyBarFaithful({ v, isToday }) {
  if (v == null) {
    return <div className="mx-sum-cell future" />;
  }
  const pct = Math.max(0.08, v);
  const good = v >= 0.7;
  return (
    <div className={`mx-sum-cell${good ? " good" : " low"}${isToday ? " today" : ""}`}>
      <div className="mx-sum-fill" style={{ height: `${(pct * 100).toFixed(1)}%` }} />
    </div>
  );
}

function RhythmDailyCell({ v, isToday }) {
  if (v == null) {
    return <div className="mx-r-daily future" />;
  }
  const pct = Math.round(v * 100);
  const tone = v >= 0.8 ? "high" : v >= 0.5 ? "mid" : "low";
  return (
    <div className={`mx-r-daily ${tone}${isToday ? " today" : ""}`}>
      <span className="mx-r-daily-num num">{pct}</span>
    </div>
  );
}

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
  /** paint drag for Classic / Rhythm (ref = reliable on mouseenter) */
  const paintDragRef = useRef(null);
  const [matrixVariant, setMatrixVariant] = useState(() => {
    try {
      return localStorage.getItem("actmx-variant") || "rhythm";
    } catch {
      return "rhythm";
    }
  });
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

  useEffect(() => {
    try {
      localStorage.setItem("actmx-variant", matrixVariant);
    } catch {
      /* ignore */
    }
  }, [matrixVariant]);

  const isFutureDay = useCallback(
    day => {
      const d = new Date(year, month - 1, day);
      const now = new Date();
      d.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      return d > now;
    },
    [year, month]
  );

  const statsDayIdx = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month - 1, daysInMonth);
    first.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    if (last < now) return daysInMonth - 1;
    if (first > now) return -1;
    return todayDay != null ? todayDay - 1 : 0;
  }, [year, month, daysInMonth, todayDay]);

  const todayColumnIdx =
    isCurrentMonth && todayDay != null ? todayDay - 1 : -1;

  const weekdayForDay = day =>
    WEEK_SHORT[new Date(year, month - 1, day).getDay()];

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

  const getCellCode = (activity, day) => {
    if (isFutureDay(day)) return 4;
    const data = getCompletionData(activity.id, day);
    if (activity.type === "checkbox") {
      return data.isCompleted ? 1 : 0;
    }
    const v = data.value;
    const filled = v != null && String(v).trim() !== "";
    return filled ? 1 : 0;
  };

  const daily = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      if (isFutureDay(day)) return null;
      let done = 0;
      let total = 0;
      activities.forEach(activity => {
        const c = getCellCode(activity, day);
        if (c === 3 || c === 4) return;
        total++;
        if (c === 1) done += 1;
        else if (c === 2) done += 0.5;
      });
      return total ? done / total : 0;
    });
  }, [activities, daysInMonth, isFutureDay, completions, year, month]);

  const trend = useMemo(() => {
    return daily.map((_, i) => {
      const w = daily.slice(Math.max(0, i - 6), i + 1).filter(v => v != null);
      return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });
  }, [daily]);

  const monthAveragePct = useMemo(() => {
    const vals = daily.filter(v => v != null);
    if (!vals.length) return 0;
    return Math.round(
      (vals.reduce((a, b) => a + b, 0) / vals.length) * 100
    );
  }, [daily]);

  const applyPaintIfNeeded = (activity, day) => {
    const drag = paintDragRef.current;
    if (!drag || activity.type !== "checkbox") return;
    const v = getCellCode(activity, day);
    if (v === 4) return;
    const data = getCompletionData(activity.id, day);
    const done = data.isCompleted;
    if (drag.mode === "on" && !done) {
      handleCheckboxChange(activity.id, day);
    } else if (drag.mode === "off" && done) {
      handleCheckboxChange(activity.id, day);
    }
  };

  const endPaintDrag = () => {
    paintDragRef.current = null;
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

  const handleCloseDialog = useCallback(() => {
    setEditingNote(null);
    setNotesList([]);
    setNoteAccentColor("");
  }, []);

  useEffect(() => {
    if (!editingNote) return;
    const onKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseDialog();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [editingNote, handleCloseDialog]);

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
    setDraggedActivityId(id);
    // Required for Firefox
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
    // Make the ghost image a bit transparent
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = e => {
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
    e.preventDefault();

    if (draggedActivityId && draggedActivityId !== targetId) {
      const sourceIndex = activities.findIndex(a => a.id === draggedActivityId);
      const targetIndex = activities.findIndex(a => a.id === targetId);

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

  const daysSpan = Math.max(1, daysInMonth - 1);

  return (
    <>
      <div className="calendar-matrix-root fade-in">
        <div className="calendar-matrix-toolbar">
          <div className="acts-variant-switch" role="tablist" aria-label="Calendar layout">
            {[
              { key: "faithful", label: "Classic" },
              { key: "rhythm", label: "Rhythm" },
              { key: "dots", label: "Dots" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={matrixVariant === key}
                className={`actsv-btn${matrixVariant === key ? " on" : ""}`}
                onClick={() => setMatrixVariant(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {matrixVariant === "faithful" && (
          <div className="mx-wrap mx-faithful">
            <div
              ref={scrollContainerRef}
              className="mx-scroll"
              onMouseLeave={endPaintDrag}
            >
              <div
                className="mx-grid"
                style={{
                  gridTemplateColumns: `220px repeat(${daysInMonth}, 36px)`,
                }}
              >
                <div className="mx-head-routine">Routine</div>
                {days.map(day => {
                  const di = day - 1;
                  const wd = weekdayForDay(day);
                  const isTodayCol = di === todayColumnIdx;
                  return (
                    <div
                      key={day}
                      ref={isTodayCol ? todayHeaderRef : undefined}
                      className={`mx-head-day${isTodayCol ? " today" : ""}${
                        wd === "Sa" || wd === "Su" ? " wk" : ""
                      }`}
                      onClick={() => isTodayCol && handleDayClick(day)}
                      onKeyDown={e => {
                        if (isTodayCol && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          handleDayClick(day);
                        }
                      }}
                      role={isTodayCol ? "button" : undefined}
                      tabIndex={isTodayCol ? 0 : undefined}
                    >
                      <div className="mx-head-dow">{wd}</div>
                      <div className="mx-head-num">{day}</div>
                    </div>
                  );
                })}
                {activities.map(activity => {
                  const codes = Array.from({ length: daysInMonth }, (_, i) =>
                    getCellCode(activity, i + 1)
                  );
                  const rowStat = rowStatsFromCodes(codes, statsDayIdx);
                  return (
                    <Fragment key={activity.id}>
                      <div
                        className="mx-row-name"
                        draggable
                        onDragStart={e => handleDragStart(e, activity.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOver(e, activity.id)}
                        onDrop={e => handleDrop(e, activity.id)}
                        style={{
                          opacity: draggedActivityId === activity.id ? 0.4 : 1,
                          outline:
                            dragOverActivityId === activity.id
                              ? "2px solid var(--primary-color)"
                              : undefined,
                        }}
                        title="Drag to reorder"
                      >
                        <span className="mx-drag" aria-hidden>
                          ⋮⋮
                        </span>
                        <span className="mx-rn-text">{activity.name}</span>
                        <span className="mx-rn-meta num">
                          {Math.round(rowStat.pct * 100)}%
                        </span>
                      </div>
                      {days.map(day => {
                        const di = day - 1;
                        const v = getCellCode(activity, day);
                        const data = getCompletionData(activity.id, day);
                        const isInput =
                          activity.type === "number" || activity.type === "text";
                        const hasNotes =
                          (data.notes && data.notes.length > 0) ||
                          (data.note && data.note.trim());
                        const { extraClass: ucExtra, mxStyle: ucStyle } =
                          userCompletionClassAndStyle(data.completionColor);
                        if (isInput) {
                          return (
                            <div
                              key={day}
                              className={`mxc mxc-f has-input s-${v}${
                                di === todayColumnIdx ? " today" : ""
                              }`}
                              onDoubleClick={() => handleDoubleClick(activity.id, day)}
                            >
                              <CellInput
                                type={activity.type}
                                value={data.value}
                                onSave={val =>
                                  onValueChange && onValueChange(activity.id, day, val)
                                }
                                placeholder="-"
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={day}
                            className={`mxc mxc-f s-${v}${
                              di === todayColumnIdx ? " today" : ""
                            }${ucExtra}`}
                            style={ucStyle}
                            role="gridcell"
                            onMouseDown={() => {
                              if (v === 4) return;
                              paintDragRef.current = {
                                mode: v === 1 ? "off" : "on",
                              };
                              handleCheckboxChange(activity.id, day);
                            }}
                            onMouseEnter={() => applyPaintIfNeeded(activity, day)}
                            onMouseUp={endPaintDrag}
                            onDoubleClick={e => {
                              e.preventDefault();
                              handleDoubleClick(activity.id, day);
                            }}
                          >
                            {(v === 1 || v === 2) && (
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="m5 12 5 5L20 7" />
                              </svg>
                            )}
                            {hasNotes ? <div className="note-indicator" /> : null}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
                <div className="mx-sum-label">Daily %</div>
                {daily.map((v, di) => (
                  <DailyBarFaithful
                    key={di}
                    v={v}
                    isToday={di === todayColumnIdx}
                  />
                ))}
              </div>
            </div>
            <div className="mx-trend-card">
              <div className="mx-trend-head">
                <div className="eyebrow">Monthly trend</div>
                <div className="mx-trend-legend">
                  <span className="num">{monthAveragePct}%</span>
                  <span className="muted">month average</span>
                </div>
              </div>
              <TrendSpark trend={trend} daysInMonth={daysInMonth} tone="faithful" />
            </div>
          </div>
        )}

        {matrixVariant === "rhythm" && (
          <div className="mx-wrap mx-rhythm">
            <div
              ref={scrollContainerRef}
              className="mx-scroll"
              onMouseLeave={endPaintDrag}
            >
              <div
                className="mx-grid"
                style={{
                  gridTemplateColumns: `240px repeat(${daysInMonth}, 30px) 64px`,
                }}
              >
                <div className="mx-head-routine">Routine</div>
                {days.map(day => {
                  const di = day - 1;
                  const wd = weekdayForDay(day);
                  const isTodayCol = di === todayColumnIdx;
                  return (
                    <div
                      key={day}
                      ref={isTodayCol ? todayHeaderRef : undefined}
                      className={`mx-head-day${isTodayCol ? " today" : ""}${
                        wd === "Sa" || wd === "Su" ? " wk" : ""
                      }`}
                      onClick={() => isTodayCol && handleDayClick(day)}
                      onKeyDown={e => {
                        if (isTodayCol && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          handleDayClick(day);
                        }
                      }}
                      role={isTodayCol ? "button" : undefined}
                      tabIndex={isTodayCol ? 0 : undefined}
                    >
                      <div className="mx-head-num">{day}</div>
                      <div className="mx-head-dow">{wd.slice(0, 1)}</div>
                    </div>
                  );
                })}
                <div className="mx-head-stat">%</div>
                {activities.map(activity => {
                  const codes = Array.from({ length: daysInMonth }, (_, i) =>
                    getCellCode(activity, i + 1)
                  );
                  const rowStat = rowStatsFromCodes(codes, statsDayIdx);
                  return (
                    <Fragment key={activity.id}>
                      <div
                        className="mx-row-name"
                        draggable
                        onDragStart={e => handleDragStart(e, activity.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOver(e, activity.id)}
                        onDrop={e => handleDrop(e, activity.id)}
                        style={{
                          opacity: draggedActivityId === activity.id ? 0.4 : 1,
                          outline:
                            dragOverActivityId === activity.id
                              ? "2px solid var(--primary-color)"
                              : undefined,
                        }}
                        title="Drag to reorder"
                      >
                        <span className="mx-drag" aria-hidden>
                          ⋮⋮
                        </span>
                        <span className="mx-rn-text">{activity.name}</span>
                        {rowStat.streak >= 3 ? (
                          <span className="mx-streak num">{rowStat.streak}</span>
                        ) : null}
                      </div>
                      {days.map(day => {
                        const di = day - 1;
                        const wd = weekdayForDay(day);
                        const v = getCellCode(activity, day);
                        const data = getCompletionData(activity.id, day);
                        const isInput =
                          activity.type === "number" || activity.type === "text";
                        const wkEnd = wd === "Sa" || wd === "Su";
                        const { extraClass: ucExtraR, mxStyle: ucStyleR } =
                          userCompletionClassAndStyle(data.completionColor);
                        if (isInput) {
                          return (
                            <div
                              key={day}
                              className={`mxc mxc-r has-input s-${v}${
                                di === todayColumnIdx ? " today" : ""
                              }${wkEnd ? " wk" : ""}`}
                              onDoubleClick={() => handleDoubleClick(activity.id, day)}
                            >
                              <CellInput
                                type={activity.type}
                                value={data.value}
                                onSave={val =>
                                  onValueChange && onValueChange(activity.id, day, val)
                                }
                                placeholder="-"
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={day}
                            className={`mxc mxc-r s-${v}${
                              di === todayColumnIdx ? " today" : ""
                            }${wkEnd ? " wk" : ""}${ucExtraR}`}
                            style={ucStyleR}
                            role="gridcell"
                            onMouseDown={() => {
                              if (v === 4) return;
                              paintDragRef.current = {
                                mode: v === 1 ? "off" : "on",
                              };
                              handleCheckboxChange(activity.id, day);
                            }}
                            onMouseEnter={() => applyPaintIfNeeded(activity, day)}
                            onMouseUp={endPaintDrag}
                            onDoubleClick={e => {
                              e.preventDefault();
                              handleDoubleClick(activity.id, day);
                            }}
                          >
                            {v === 2 ? <span className="mxc-r-half" /> : null}
                          </div>
                        );
                      })}
                      <div className="mx-row-stat num">
                        {Math.round(rowStat.pct * 100)}
                      </div>
                    </Fragment>
                  );
                })}
                <div className="mx-sum-label">Day</div>
                {daily.map((v, di) => (
                  <RhythmDailyCell
                    key={di}
                    v={v}
                    isToday={di === todayColumnIdx}
                  />
                ))}
                <div className="mx-sum-stat num">{monthAveragePct}</div>
              </div>
            </div>
            <div className="mx-trend-card">
              <div className="mx-trend-head">
                <div className="eyebrow">Monthly trend · 7-day rolling</div>
              </div>
              <TrendSpark trend={trend} daysInMonth={daysInMonth} tone="faithful" />
            </div>
          </div>
        )}

        {matrixVariant === "dots" && (
          <div className="mx-wrap mx-dots">
            <div className="mxd-ruler">
              <div className="mxd-ruler-spacer" />
              <div className="mxd-ruler-track">
                {Array.from({ length: daysInMonth }, (_, di) => (
                  <div
                    key={di}
                    className={`mxd-ruler-tick${
                      di === todayColumnIdx ? " today" : ""
                    }${(di + 1) % 5 === 0 ? " major" : ""}`}
                    style={{ left: `${(di / daysSpan) * 100}%` }}
                  >
                    {((di + 1) % 5 === 0 || di === 0) && (
                      <span className="mxd-ruler-num num">{di + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mxd-ruler-stat">
                this
                <br />
                month
              </div>
            </div>
            <div className="mxd-rows">
              {activities.map(activity => {
                const codes = Array.from({ length: daysInMonth }, (_, i) =>
                  getCellCode(activity, i + 1)
                );
                const rowStat = rowStatsFromCodes(codes, statsDayIdx);
                return (
                  <div className="mxd-row" key={activity.id}>
                    <div className="mxd-row-head">
                      <div className="mxd-row-name">{activity.name}</div>
                      <div className="mxd-row-meta">
                        <span className="num big">{Math.round(rowStat.pct * 100)}</span>
                        <span className="muted">%</span>
                        {rowStat.streak >= 3 ? (
                          <span className="mxd-streak num">· {rowStat.streak}d streak</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mxd-track">
                      <div className="mxd-rule" />
                      {days.map(day => {
                        const di = day - 1;
                        const leftPct = (di / daysSpan) * 100;
                        const v = getCellCode(activity, day);
                        const data = getCompletionData(activity.id, day);
                        const isInput =
                          activity.type === "number" || activity.type === "text";
                        const { extraClass: ucExtraD, mxStyle: ucStyleD } =
                          userCompletionClassAndStyle(data.completionColor);
                        if (isInput) {
                          return (
                            <div
                              key={day}
                              className="mxd-cell-input-wrap"
                              style={{ left: `${leftPct}%` }}
                              onDoubleClick={e => {
                                e.stopPropagation();
                                handleDoubleClick(activity.id, day);
                              }}
                            >
                              <CellInput
                                type={activity.type}
                                value={data.value}
                                onSave={val =>
                                  onValueChange && onValueChange(activity.id, day, val)
                                }
                                placeholder="—"
                              />
                            </div>
                          );
                        }
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`mxd-dot s-${v}${
                              di === todayColumnIdx ? " today" : ""
                            }${ucExtraD}`}
                            style={{ left: `${leftPct}%`, ...(ucStyleD || {}) }}
                            disabled={v === 4}
                            onClick={() => v !== 4 && handleCheckboxChange(activity.id, day)}
                            onDoubleClick={e => {
                              e.preventDefault();
                              handleDoubleClick(activity.id, day);
                            }}
                            aria-label={`${activity.name} day ${day}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mxd-foot">
              <div className="mxd-foot-head">
                <div className="eyebrow">
                  Daily completion · last {statsDayIdx >= 0 ? statsDayIdx + 1 : 0} days
                </div>
                <div className="num">
                  {monthAveragePct}%
                  <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                    average
                  </span>
                </div>
              </div>
              <TrendSpark trend={trend} daysInMonth={daysInMonth} tone="dots" />
            </div>
          </div>
        )}
      </div>

      {editingNote && (
        <div
          className="mx-modal-scrim"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) handleCloseDialog();
          }}
        >
          <div
            className="mx-modal mx-notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mx-calendar-notes-title"
            tabIndex={-1}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="mx-notes-head">
              <div className="mx-notes-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h12l4 4v12H4z" />
                  <path d="M8 10h8M8 14h8M8 18h5" />
                  <path d="m15 3 2 2-1.5 1.5L13.5 4.5z" fill="#fff" />
                </svg>
              </div>
              <div className="mx-notes-title">
                <h2 id="mx-calendar-notes-title" className="mx-notes-h">
                  Notes
                </h2>
                {(() => {
                  const act = activities.find(a => a.id === editingNote.activityId);
                  const d = new Date(year, month - 1, editingNote.day);
                  const dow = d.toLocaleDateString("default", { weekday: "short" });
                  const mon = d.toLocaleDateString("default", { month: "short" });
                  return (
                    <div className="mx-notes-sub">
                      <span className="mx-notes-dot" aria-hidden />
                      <span>
                        {act?.name ?? "Activity"} · {dow}, {mon} {editingNote.day}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button type="button" className="mx-modal-x" onClick={handleCloseDialog} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="mx-notes-body thin-scroll">
              {notesList.map((note, index) => (
                <div key={index} className="mx-note-row">
                  <div className="mx-note-num num">{index + 1}</div>
                  <div className="mx-note-field">
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
                        className="mx-note-remove"
                        onClick={() => handleRemoveNoteRow(index)}
                        aria-label="Remove note"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="mx-notes-color">
                <span className="mx-notes-color-label">Color</span>
                <button
                  type="button"
                  className={`mx-swatch mx-swatch-none${noteAccentColor === "" ? " on" : ""}`}
                  onClick={() => setNoteAccentColor("")}
                  aria-label="Default completion color"
                >
                  <Icon name="close" size={12} />
                </button>
                {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`mx-swatch${noteAccentColor === color ? " on" : ""}`}
                    style={{ background: color }}
                    title={color}
                    aria-label={`Accent ${color}`}
                    onClick={() => setNoteAccentColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="mx-notes-foot">
              <button type="button" className="btn btn-ghost mx-add-note-btn" onClick={handleAddNoteRow}>
                <Icon name="plus" size={14} /> Add Note
              </button>
              <div className="mx-notes-actions">
                <button type="button" className="btn btn-ghost" onClick={handleCloseDialog}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveNote}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

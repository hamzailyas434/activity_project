import { useState, useEffect, useRef, useCallback } from "react";

import { API_BASE_URL as API } from "../config";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function MonthlyTodos({ month, year, authHeaders }) {
  const [todos, setTodos]       = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editText, setEditText] = useState("");
  const [dragOver, setDragOver] = useState(null); // index of drop target
  const inputRef     = useRef(null);
  const dragFrom     = useRef(null);              // index being dragged
  const reorderTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/monthly-todos?month=${month}&year=${year}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setTodos(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistOrder = useCallback((newTodos) => {
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(async () => {
      try {
        await fetch(`${API}/monthly-todos/reorder`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newTodos.map(t => t.id) }),
        });
      } catch {}
    }, 500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (e, index) => {
    dragFrom.current = index;
    e.dataTransfer.effectAllowed = "move";
    // ghost image = the row itself (default), just make it slightly transparent
    e.currentTarget.style.opacity = "0.45";
  };

  const onDragEnd = (e) => {
    e.currentTarget.style.opacity = "";
    if (dragFrom.current !== null && dragOver !== null && dragFrom.current !== dragOver) {
      const next = [...todos];
      const [moved] = next.splice(dragFrom.current, 1);
      next.splice(dragOver, 0, moved);
      setTodos(next);
      persistOrder(next);
    }
    dragFrom.current = null;
    setDragOver(null);
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== index) setDragOver(index);
  };

  const onDragLeave = () => setDragOver(null);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    try {
      const res = await fetch(`${API}/monthly-todos`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text, month, year, sort_order: todos.length }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setTodos(prev => [...prev, created]);
      setInput("");
      inputRef.current?.focus();
    } catch {}
  }, [input, month, year, todos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (todo) => {
    const next = todo.completed ? 0 : 1;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: next } : t));
    try {
      const res = await fetch(`${API}/monthly-todos/${todo.id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: todo.completed } : t));
    } catch {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: todo.completed } : t));
    }
  };

  const startEdit  = (todo) => { setEditId(todo.id); setEditText(todo.text); };

  const commitEdit = async (id) => {
    const text = editText.trim();
    if (!text) { setEditId(null); return; }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    setEditId(null);
    try {
      await fetch(`${API}/monthly-todos/${id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch {}
  };

  const handleDelete = async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`${API}/monthly-todos/${id}`, { method: "DELETE", headers: authHeaders() });
    } catch {}
  };

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const done  = todos.filter(t => t.completed).length;
  const total = todos.length;

  return (
    <div className="mt-0.5 border-t border-gborder-sub pt-3 flex flex-col gap-1.5">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[0.78rem] font-bold text-ink tracking-[0.02em]">
          📋 Monthly Goals
        </span>
        <span className="text-[0.68rem] px-2 py-[0.15rem] rounded-full bg-gtint-surf text-ink-muted font-semibold border border-gborder-sub">
          {monthLabel}
        </span>
        {total > 0 && (
          <span className="text-[0.68rem] px-2 py-[0.15rem] rounded-full bg-gactive text-primary font-bold border border-gborder ml-auto">
            {done}/{total}
          </span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[0.76rem] text-ink-muted italic px-0.5 py-1">Loading…</p>
      ) : (
        <ul className="list-none flex flex-col gap-0 max-h-[180px] overflow-y-auto pr-0.5 thin-scroll">
          {todos.length === 0 && (
            <li className="text-[0.76rem] text-ink-muted italic px-0.5 py-1">
              No goals yet — add one below!
            </li>
          )}
          {todos.map((todo, index) => (
            <li
              key={todo.id}
              draggable
              onDragStart={e => onDragStart(e, index)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              className={[
                "mt-item group flex items-center gap-[0.35rem] px-[0.4rem] py-[0.3rem] rounded-[7px] transition-[background,border-top] duration-100",
                todo.completed ? "opacity-65" : "",
                dragOver === index && dragFrom.current !== index
                  ? "border-t-2 border-primary bg-gtint-hov"
                  : "border-t-2 border-transparent hover:bg-gtint-hov",
              ].join(" ")}
            >
              {/* Drag handle — always visible, subtle */}
              <span
                className="shrink-0 text-[0.75rem] text-ink-muted/40 group-hover:text-ink-muted cursor-grab active:cursor-grabbing select-none leading-none transition-colors duration-100"
                title="Drag to reorder"
              >
                ⠿
              </span>

              {/* Checkbox */}
              <button
                className={`shrink-0 w-5 h-5 rounded-full border-2 bg-transparent cursor-pointer flex items-center justify-center text-[0.7rem] font-bold text-white transition-[background,border-color] duration-150 p-0 leading-none ${
                  todo.completed
                    ? "bg-primary border-primary"
                    : "border-gborder-str hover:border-primary"
                }`}
                onClick={() => handleToggle(todo)}
                title={todo.completed ? "Mark incomplete" : "Mark complete"}
              >
                {todo.completed ? "✓" : (
                  <span className="text-base text-primary leading-none">•</span>
                )}
              </button>

              {editId === todo.id ? (
                <input
                  className="flex-1 text-[0.82rem] border-none border-b-[1.5px] border-primary bg-transparent text-ink outline-none py-[0.05rem] font-[inherit]"
                  value={editText}
                  autoFocus
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => commitEdit(todo.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit(todo.id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                />
              ) : (
                <span
                  className={`flex-1 text-[0.82rem] cursor-default break-words leading-[1.4] ${
                    todo.completed
                      ? "line-through text-ink-muted decoration-ok"
                      : "text-ink"
                  }`}
                  onDoubleClick={() => startEdit(todo)}
                  title="Double-click to edit"
                >
                  {todo.text}
                </span>
              )}

              {/* Delete */}
              <button
                className="mt-delete-btn shrink-0 bg-transparent border-none cursor-pointer text-ink-muted text-[0.65rem] px-[0.25rem] py-[0.1rem] rounded leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                onClick={() => handleDelete(todo.id)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <form className="flex gap-[0.4rem] items-center mt-[0.15rem]" onSubmit={handleAdd}>
        <input
          ref={inputRef}
          className="flex-1 px-[0.6rem] py-[0.35rem] text-[0.8rem] border-[1.5px] border-gborder rounded-lg bg-white/55 text-ink outline-none font-[inherit] transition-[border-color] duration-150 focus:border-primary placeholder:text-ink-muted"
          placeholder="Add a goal…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="w-[30px] h-[30px] rounded-full border-none bg-primary text-white text-lg font-bold cursor-pointer flex items-center justify-center shrink-0 transition-[background,transform] duration-150 p-0 leading-none hover:bg-primary-dk hover:scale-[1.08] disabled:opacity-40 disabled:cursor-default"
          disabled={!input.trim()}
        >
          ＋
        </button>
      </form>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";

export default function useStickyNotes(api, COLORS) {
  const [notes, setNotes] = useState([]);
  const debounceRef = useRef({});

  const fetchNotes = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.get("/api/sticky-notes");
      const data = await res.json();
      if (Array.isArray(data)) setNotes(data);
    } catch { /* best-effort */ }
  }, [api]);

  const addNote = async () => {
    const color = COLORS[notes.length % COLORS.length];
    try {
      const res = await api.post("/api/sticky-notes", { text: "", color });
      const newNote = await res.json();
      setNotes((prev) => [...prev, newNote]);
      return newNote;
    } catch {
      return null;
    }
  };

  const changeText = (id, text) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(async () => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      try {
        await api.put(`/api/sticky-notes/${id}`, { text, color: note.color });
      } catch { /* best-effort */ }
    }, 500);
  };

  const changeColor = async (id, color) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
    try {
      await api.put(`/api/sticky-notes/${id}`, { text: notes.find((n) => n.id === id)?.text || "", color });
    } catch { /* best-effort */ }
  };

  const deleteNote = async (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    localStorage.removeItem(`sne-h-${id}`);
    try {
      await api.delete(`/api/sticky-notes/${id}`);
    } catch { /* best-effort */ }
  };

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  return { notes, addNote, changeText, changeColor, deleteNote, refetch: fetchNotes };
}

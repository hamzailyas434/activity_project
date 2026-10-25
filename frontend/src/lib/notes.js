import { useEffect, useState } from "react";
import { useUI } from "../components/ui";
import { useApi } from "./api";
import useLoad from "./useLoad";
import { plain } from "./format";
import { go } from "../shell/route";

const LS_CATS = "noteCats";
const readCats = () => { try { return JSON.parse(localStorage.getItem(LS_CATS) || "[]"); } catch { return []; } };
export const answersOf = n => (n.answers?.length ? n.answers : n.answer ? [{ id: null, answer: n.answer, is_very_good: 0 }] : []);

export function useDebounced(v, ms = 280) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/* Fetch a note (+ attachments) — uses the list copy while loading */
export function useNote(id, cached) {
  const api = useApi();
  const note = useLoad(api, a => (id ? a.get(`/notes/${id}`) : null), String(id), null);
  const files = useLoad(api, a => (id ? a.get(`/notes/${id}/attachments`).catch(() => []) : []), String(id), []);
  return { n: note.data || cached || null, loading: note.loading && !cached, error: note.error, files };
}

/* Notes list state shared by both designs: search, category, sort, limit, sub-routes (new · review · id · id/edit), delete. */
export function useNotesList(sub) {
  const api = useApi();
  const { toast, ask } = useUI();
  const [q, setQ] = useState(""), [cat, setCat] = useState("All"), [sort, setSort] = useState("new"), [lim, setLim] = useState(50), [catM, setCatM] = useState(false);
  const dq = useDebounced(q.trim());
  const notes = useLoad(api, a => {
    const p = { limit: lim };
    if (cat !== "All") p.category = cat;
    if (dq) p.search = dq;
    return a.get(`/notes?${new URLSearchParams(p)}`);
  }, `${cat}|${dq}|${lim}`, []);
  const cats = useLoad(api, a => a.get("/notes/categories"), "", []);
  const [extra, setExtra] = useState(readCats);
  const allCats = [...new Set([...(Array.isArray(cats.data) ? cats.data : []), ...extra].filter(Boolean))];

  const list = (Array.isArray(notes.data) ? notes.data : []).slice().sort((a, b) =>
    sort === "new" ? String(b.created_at).localeCompare(String(a.created_at))
      : sort === "old" ? String(a.created_at).localeCompare(String(b.created_at))
        : answersOf(b).length - answersOf(a).length);

  // sub-routes: new · review · <id> · <id>/edit
  const [sid, mode] = sub.split("/");
  const openId = /^\d+$/.test(sid) ? +sid : null;
  const editing = sid === "new" ? "new" : openId && mode === "edit" ? openId : null;
  const reviewing = sid === "review";

  const refresh = () => { notes.reload(); cats.reload(); };
  const del = async n => {
    if (!(await ask({ title: "Delete note?", body: `“${plain(n.question)}” and ${answersOf(n).length} answer(s).`, ok: "Delete", danger: true }))) return;
    try { await api.del(`/notes/${n.id}`); notes.setData(l => l.filter(x => x.id !== n.id)); go("notes"); toast("Note deleted"); }
    catch (e) { toast(e.message, "err"); }
  };
  const addCat = name => { const next = [...new Set([...extra, name])]; setExtra(next); try { localStorage.setItem(LS_CATS, JSON.stringify(next)); } catch { /* optional */ } };

  return { api, toast, ask, q, setQ, cat, setCat, sort, setSort, lim, setLim, catM, setCatM, dq, notes, cats, extra, setExtra, allCats, list, sid, mode, openId, editing, reviewing, refresh, del, addCat };
}

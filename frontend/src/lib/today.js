import { useState } from "react";
import { TONE_HEX, useUI } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "./api";
import useLoad from "./useLoad";
import useMonth, { dayPct } from "./useMonth";
import useNow from "./useNow";
import { plain } from "./format";
import { useCurrency } from "../hooks/useCurrency";

export const STICKY_T = ["gold", "red", "blue", "green", "violet"];
const QAZA = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];

/* Sticky colours are stored as hex; map any stored value to the nearest v3 tone. */
export function stickyTone(color, i) {
  const c = String(color || "").toUpperCase();
  const hit = STICKY_T.find(t => TONE_HEX[t].toUpperCase() === c);
  if (hit) return hit;
  const m = c.match(/^#([0-9A-F]{6})$/);
  if (!m) return STICKY_T[i % 5];
  const rgb = h => [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16));
  const [r, g, b] = rgb(m[1]);
  return STICKY_T.reduce((best, t) => {
    const [r2, g2, b2] = rgb(TONE_HEX[t].slice(1));
    const dist = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    return dist < best.d ? { t, d: dist } : best;
  }, { t: STICKY_T[0], d: Infinity }).t;
}

/* "13 Oct: text" → date chip + text */
export const goalParts = t => { const m = String(t).match(/^(\d{1,2} \w{3,9}):\s*(.*)$/s); return m ? [m[1], m[2]] : [null, t]; };

/* Everything Today shows, shared by both designs (v3 Orbit and v2 Ink). */
export function useToday(cur, name) {
  const api = useApi();
  const { toast, ask } = useUI();
  const { hiddenTabs = [] } = useAuth();
  const { format: money } = useCurrency();
  // bottom row: drop tiles whose tab is turned off and let the rest share the width
  const show = { books: !hiddenTabs.includes("books"), qaza: !hiddenTabs.includes("qaza-namaz"), money: !hiddenTabs.includes("expenses") };
  const span = "s" + 12 / Math.max(1, Object.values(show).filter(Boolean).length);
  const now = useNow();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const prev = useMonth(api, py, pm);

  const todos = useLoad(api, a => a.get(`/monthly-todos?month=${m}&year=${y}`), `${y}-${m}`, []);
  const stickies = useLoad(api, async a => { const l = await a.get("/sticky-notes"); return Array.isArray(l) ? l.map(n => ({ ...n, text: String(n.text || "").replace(/\s*<br\s*\/?>\s*/gi, "\n") })) : l; }, "", []); // v1 stickies hold <br> line breaks
  const books = useLoad(api, a => a.get("/books/dashboard-summary"), "", null);
  const qaza = useLoad(api, a => a.get("/qaza-namaz"), "", null);
  const money_ = useLoad(api, async a => {
    const [rows, budget] = await Promise.all([a.get(`/expenses?month=${m}&year=${y}`), a.get(`/expenses/budget?month=${m}&year=${y}`)]);
    return { rows: Array.isArray(rows) ? rows : [], income: Number(budget?.total_income || 0) };
  }, `${y}-${m}`, null);
  const notes = useLoad(api, a => a.get("/notes?limit=60"), "", []);

  const [sticky, setSticky] = useState(null), [rv, setRv] = useState(0), [reveal, setReveal] = useState(false), [allSt, setAllSt] = useState(false);

  const acts = cur.activities, comp = cur.comp;
  const isDone = a => !!comp[`${d}-${a.id}`]?.done;
  const done = acts.filter(isDone).length, pct = dayPct(acts, comp, d);
  const next = acts.find(a => !isDone(a));
  // a bar in the Today card can be hovered (preview) or clicked (pin) to work on that routine instead of "Next up"
  const [pickId, setPickId] = useState(null), [hoverId, setHoverId] = useState(null);
  const focus = acts.find(a => a.id === hoverId) || acts.find(a => a.id === pickId) || next;

  // day % for any date within this or last month (null if out of range / future)
  const pctOn = date => {
    const dy = date.getFullYear(), dm = date.getMonth() + 1, dd = date.getDate();
    if (dy === y && dm === m) return dd <= d ? dayPct(acts, comp, dd) : null;
    if (dy === py && dm === pm) return dayPct(prev.activities, prev.comp, dd);
    return null;
  };
  const back = n => new Date(y, m - 1, d - n);
  const last14 = Array.from({ length: 14 }, (_, i) => { const dt = back(13 - i); return { dt, p: pctOn(dt) ?? 0 }; });
  const avg7 = last14.slice(7).reduce((a, b) => a + b.p, 0) / 7, prev7 = last14.slice(0, 7).reduce((a, b) => a + b.p, 0) / 7;
  let streak = 0;
  for (let k = pct >= 0.8 ? 0 : 1; k < 62; k++) { const p = pctOn(back(k)); if (p == null || p < 0.8) break; streak++; }

  const groups = [...new Set(acts.map(a => a.group || "Routines"))];

  const toggle = async a => { try { await cur.toggle(a, d); } catch (e) { toast(e.message, "err"); } };
  const setNum = async (a, v) => { try { await cur.setValue(a, d, v); } catch (e) { toast(e.message, "err"); } };

  const goalToggle = async g => {
    todos.setData(l => l.map(x => x.id === g.id ? { ...x, completed: x.completed ? 0 : 1 } : x));
    try { await api.put(`/monthly-todos/${g.id}`, { completed: !g.completed }); }
    catch (e) { todos.setData(l => l.map(x => x.id === g.id ? { ...x, completed: g.completed } : x)); toast(e.message, "err"); }
  };
  const goalDel = async g => {
    if (!(await ask({ title: "Delete goal?", body: g.text, ok: "Delete", danger: true }))) return;
    try { await api.del(`/monthly-todos/${g.id}`); todos.setData(l => l.filter(x => x.id !== g.id)); toast("Goal deleted"); }
    catch (e) { toast(e.message, "err"); }
  };

  const noteList = Array.isArray(notes.data) ? notes.data : [];
  const note = noteList.length ? noteList[rv % noteList.length] : null;
  const noteAnswer = note ? plain(note.answers?.[0]?.answer || note.answer) : "";
  const bk = books.data, cb = bk?.current_book;
  const qz = qaza.data ? QAZA.reduce((t, n) => {
    const owed = Math.floor((parseFloat(qaza.data[n]) || 0) * 365), adj = Number(qaza.data.adjustments?.[n] || 0);
    return { o: t.o + owed, r: t.r + Math.max(0, owed + adj) };
  }, { o: 0, r: 0 }) : null;
  const spent = money_.data ? money_.data.rows.reduce((a, r) => a + Number(r.amount || 0), 0) : 0;
  const income = money_.data?.income || 0, left = income - spent;
  const first = String(name || "").split(" ")[0] || "there";
  const stickyList = Array.isArray(stickies.data) ? stickies.data : [];
  const goalList = Array.isArray(todos.data) ? todos.data : [];

  return { api, toast, ask, hiddenTabs, money, show, span, now, y, m, d, py, pm, prev, todos, stickies, books, qaza, money_, notes, sticky, setSticky, rv, setRv, reveal, setReveal, allSt, setAllSt, acts, comp, isDone, done, pct, next, pickId, setPickId, hoverId, setHoverId, focus, pctOn, back, last14, avg7, prev7, streak, groups, toggle, setNum, goalToggle, goalDel, noteList, note, noteAnswer, bk, cb, qz, spent, income, left, first, stickyList, goalList };
}

/* Quick add (sticky / goal / "500 petrol" expense), shared by both designs */
export function useQuickAdd({ y, m, today, stickies, todos, money, onExpense }) {
  const api = useApi();
  const { toast } = useUI();
  const [mode, setMode] = useState("sticky"), [v, setV] = useState(""), [busy, setBusy] = useState(false);
  const amt = parseFloat((v.match(/\d+(\.\d+)?/) || [])[0]), nm = v.replace(/\d+(\.\d+)?/, "").trim();
  const bad = !v.trim() || (mode === "expense" && (!amt || !nm));
  const add = async () => {
    if (bad || busy) return;
    setBusy(true);
    try {
      if (mode === "sticky") {
        const n = await api.post("/sticky-notes", { text: v.trim(), color: TONE_HEX[STICKY_T[(stickies.data?.length || 0) % 5]] });
        stickies.setData(l => [n, ...(l || [])]);
      }
      if (mode === "goal") {
        const g = await api.post("/monthly-todos", { text: v.trim(), month: m, year: y, sort_order: todos.data?.length || 0 });
        todos.setData(l => [...(l || []), g]);
      }
      if (mode === "expense") {
        await api.post("/expenses", { category: "other", name: nm, amount: amt, note: "", month: m, year: y, bill_date: today });
        onExpense();
      }
      toast(mode === "expense" ? `${money(amt)} · ${nm} added` : "Added");
      setV("");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };
  return { mode, setMode, v, setV, busy, amt, nm, bad, add };
}

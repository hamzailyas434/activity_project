import { useCallback } from "react";
import useLoad from "./useLoad";
import { ymd } from "./format";

/* Cell notes are stored as a JSON array in activity_completions.note (legacy rows hold plain text). */
export function parseNotes(note) {
  if (!note) return [];
  if (Array.isArray(note)) return note;
  try { const j = JSON.parse(note); return Array.isArray(j) ? j.map(String) : [String(note)]; }
  catch { return String(note).trim() ? [String(note)] : []; }
}

const norm = raw => {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const [d, id] = k.split("-").map(Number);
    out[`${d}-${id}`] = typeof v === "object" && v
      ? { done: !!v.isCompleted, value: v.value ?? "", note: v.note || "", color: v.completionColor || "" }
      : { done: !!v, value: "", note: "", color: "" };
  }
  return out;
};

/*
  One month of routines + completions (GET /completions/monthly returns both).
  comp keys are `${day}-${activityId}`.
*/
export default function useMonth(api, y, m) {
  const { data, setData, loading, error, reload } = useLoad(api, async a => {
    const r = await a.get(`/completions/monthly?year=${y}&month=${m}`);
    return { activities: Array.isArray(r?.activities) ? r.activities : [], comp: norm(r?.completions) };
  }, `${y}-${m}`, { activities: [], comp: {} });
  const { activities, comp } = data;

  const patchCell = useCallback((d, id, p) => setData(s => {
    const k = `${d}-${id}`;
    return { ...s, comp: { ...s.comp, [k]: { done: false, value: "", note: "", color: "", ...s.comp[k], ...p } } };
  }), [setData]);

  /* POST /completions/update; optimistic, reverts + rethrows on failure */
  const write = useCallback(async (a, d, body, optimistic) => {
    const k = `${d}-${a.id}`;
    const prev = comp[k];
    patchCell(d, a.id, optimistic);
    try {
      const r = await api.post("/completions/update", { activityId: a.id, date: ymd(y, m, d), ...body });
      patchCell(d, a.id, { done: !!r.isCompleted, value: r.value ?? "", note: r.note || "", color: r.completionColor || "" });
    } catch (e) {
      setData(s => ({ ...s, comp: { ...s.comp, [k]: prev || { done: false, value: "", note: "", color: "" } } }));
      throw e;
    }
  }, [api, y, m, comp, patchCell, setData]);

  const toggle = useCallback((a, d) => {
    const done = !comp[`${d}-${a.id}`]?.done;
    return write(a, d, { isCompleted: done }, { done });
  }, [comp, write]);

  const setValue = useCallback((a, d, value) => {
    const v = String(value ?? "");
    const done = v.trim() !== "";
    return write(a, d, { isCompleted: done, value: v }, { done, value: v });
  }, [write]);

  /* Cell notes modal: list of notes + colour (+ optional done state) in one write */
  const saveCell = useCallback((a, d, { notes, color, done }) => {
    const note = notes.length ? JSON.stringify(notes) : "";
    const body = { note, completionColor: color || "" };
    const opt = { note, color: color || "" };
    if (done !== undefined) { body.isCompleted = done; opt.done = done; }
    return write(a, d, body, opt);
  }, [write]);

  const setActivities = useCallback(fn => setData(s => ({ ...s, activities: typeof fn === "function" ? fn(s.activities) : fn })), [setData]);

  return { activities, comp, loading, error, reload, toggle, setValue, saveCell, setActivities };
}

/* % of routines done on a day (0–1). Text routines count when they have a value. */
export function dayPct(activities, comp, d) {
  if (!activities.length) return 0;
  return activities.filter(a => comp[`${d}-${a.id}`]?.done).length / activities.length;
}

import { useState } from "react";
import { useUI } from "../components/ui";
import { useApi } from "./api";
import useLoad from "./useLoad";
import useMonth from "./useMonth";
import useNow from "./useNow";
import { MONTHS, daysIn } from "./format";

/* Month of routines for Activities, shared by both designs: data, navigation, tick, reorder, remove, import. */
export function useActivitiesMonth(cur, sub) {
  const api = useApi();
  const { toast, ask } = useUI();
  const now = useNow();
  const ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
  const [ym, setYm] = useState([ty, tm]);
  const [y, m] = ym;
  const isCur = y === ty && m === tm;
  const other = useMonth(isCur ? null : api, y, m);
  const mo = isCur ? cur : other;
  const journal = useLoad(api, async a => {
    const rows = await a.get(`/day-journal?year=${y}&month=${m}`).catch(() => []);
    return Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.date, r.text]));
  }, `${y}-${m}`, {});

  const dim = daysIn(y, m), start = new Date(y, m - 1, 1).getDay();
  const future = y > ty || (y === ty && m > tm);
  const lastDay = future ? 0 : isCur ? td : dim; // days that can be ticked / count toward rate
  const weeks = Array.from({ length: Math.ceil((start + dim) / 7) }, (_, w) => Array.from({ length: 7 }, (_, k) => w * 7 + k - start + 1));
  const todayWeek = isCur ? Math.floor((start + td - 1) / 7) : 0;

  const [view, setView] = useState("week"), [wkSel, setWk] = useState(null);
  const wk = Math.min(wkSel ?? todayWeek, weeks.length - 1);
  const [cell, setCell] = useState(null), [jr, setJr] = useState(null), [edit, setEdit] = useState(null);
  const adding = sub === "new";

  const acts = mo.activities, comp = mo.comp;
  const shift = n => { const dt = new Date(y, m - 1 + n, 1); setYm([dt.getFullYear(), dt.getMonth() + 1]); setWk(null); };
  const err = e => toast(e.message || "Something went wrong", "err");
  const toggle = (a, d) => { if (d > lastDay) return; mo.toggle(a, d).catch(err); };
  const setVal = (a, d, v) => mo.setValue(a, d, v).catch(err);

  const move = async (a, dir) => {
    const l = [...acts], i = l.findIndex(x => x.id === a.id), j = i + dir;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    const before = acts;
    mo.setActivities(l);
    try { await api.post("/activities/reorder", { orderedIds: l.map(x => x.id), year: y, month: m }); }
    catch (e) { mo.setActivities(before); err(e); }
  };
  const del = async a => {
    if (!(await ask({ title: `Remove ${a.name}?`, body: `It is removed from ${MONTHS[m - 1]}. Past months keep their data.`, ok: "Remove", danger: true }))) return;
    try {
      const res = await api.raw(`/activities/${a.id}?year=${y}&month=${m}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Couldn't remove the routine");
      mo.setActivities(l => l.filter(x => x.id !== a.id));
      toast(a.name + " removed");
    } catch (e) { err(e); }
  };
  const importPrev = async () => {
    const pm = MONTHS[(m + 10) % 12];
    if (!(await ask({ kicker: "Activities", title: `Import ${pm} routines?`, body: `Routines from ${pm} that are not already here will be added to ${MONTHS[m - 1]}. Existing data is not touched.`, ok: "Import" }))) return;
    try { await api.post("/activities/import-previous-month", { year: y, month: m }); await mo.reload(); toast(`${pm} routines imported`); }
    catch (e) { err(e); }
  };

  return { api, toast, ask, now, ty, tm, td, ym, setYm, y, m, isCur, other, mo, journal, dim, start, future, lastDay, weeks, todayWeek, view, setView, wkSel, setWk, wk, cell, setCell, jr, setJr, edit, setEdit, adding, acts, comp, shift, err, toggle, setVal, move, del, importPrev };
}

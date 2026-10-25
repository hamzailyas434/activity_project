import { useState } from "react";
import { useUI } from "../components/ui";
import { useApi } from "./api";
import useLoad from "./useLoad";
import useNow from "./useNow";

export const P = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];

/* API shape → editable state. owed = years × 365, remaining = owed + adjustment (made up = owed − remaining). */
const fromApi = d => ({
  years: Object.fromEntries(P.map(n => [n, parseFloat(d?.[n]) || 0])),
  adj: Object.fromEntries(P.map(n => [n, Number(d?.adjustments?.[n] || 0)])),
  at: Object.fromEntries(P.map(n => [n, d?.namaz_updated_at?.[n] || d?.updated_at || null])),
});
export const owedOf = (q, n) => Math.floor(q.years[n] * 365);
export const remOf = (q, n) => Math.max(0, owedOf(q, n) + q.adj[n]);

/* Qaza state shared by both designs. `q` is null until loaded; everything derived is null-safe. */
export function useQaza() {
  const api = useApi();
  const { toast } = useUI();
  const now = useNow();
  const { data, setData, loading, error, reload } = useLoad(api, async a => fromApi(await a.get("/qaza-namaz")), "", null);
  const [q, setQ] = useState(null), [base, setBase] = useState(null), [pace, setPace] = useState(1), [busy, setBusy] = useState(false);
  if (data && data !== base) { setBase(data); setQ(data); }

  const ok = !!q && !!base;
  const dirty = ok && JSON.stringify({ y: q.years, a: q.adj }) !== JSON.stringify({ y: base.years, a: base.adj });
  const tot = ok ? P.reduce((t, n) => ({ o: t.o + owedOf(q, n), r: t.r + remOf(q, n) }), { o: 0, r: 0 }) : { o: 0, r: 0 };
  const made = Math.max(0, tot.o - tot.r);
  const maxRem = ok ? Math.max(0, ...P.map(n => remOf(q, n))) : 0;
  const days = Math.ceil(maxRem / pace);
  const fin = new Date(now); fin.setDate(fin.getDate() + days);
  const ys = ok ? [...new Set(P.map(n => q.years[n]))] : [];
  const years = ys.length === 1 ? ys[0] : null;

  const adj = (n, delta) => setQ(x => {
    const owed = owedOf(x, n), rem = remOf(x, n);
    const next = Math.max(0, Math.min(owed, rem - delta)); // +delta made up → remaining goes down
    return { ...x, adj: { ...x.adj, [n]: next - owed }, at: { ...x.at, [n]: new Date().toISOString() } };
  });
  const logAll = () => { P.forEach(n => adj(n, pace)); toast(`+${pace} logged for each — save to keep`); };
  const setYears = v => {
    const y = Math.max(0, Math.min(9999, parseFloat(v) || 0));
    setQ(x => ({ ...x, years: Object.fromEntries(P.map(n => [n, y])) })); // made-up counts (adjustments) are kept
  };
  const discard = () => setQ(base);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...Object.fromEntries(P.map(n => [n, q.years[n] ? String(q.years[n]) : ""])), adjustments: q.adj };
      await api.post("/qaza-namaz", body);
      setData(fromApi(await api.get("/qaza-namaz")));
      toast("Qaza saved");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };
  return { now, data, loading, error, reload, q, pace, setPace, busy, dirty, tot, made, maxRem, days, fin, years, adj, logAll, setYears, discard, save };
}

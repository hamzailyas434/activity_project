import { useState } from "react";
import { useUI } from "../components/ui";
import { useApi } from "./api";
import useLoad from "./useLoad";
import useNow from "./useNow";
import { isoDate, toDate } from "./format";
import { useCurrency } from "../hooks/useCurrency";

export const CATS = { Bills: "home_bills", Family: "home_person", Other: "other" };
export const LABEL = { home_bills: "Bills", home_person: "Family", other: "Other" };
export const SUGGEST = { Bills: ["Electricity", "PTCL", "Sui Gas", "Water", "Internet", "Rent"], Family: ["Mother", "Wife", "Father", "Sister", "Brother"], Other: [] };
export const CAT_C = { Bills: "var(--blue)", Family: "var(--violet)", Other: "var(--gold)" };
export const amtOf = r => Number(r.amount || 0);
export const dayOf = r => { const d = toDate(r.bill_date) || toDate(r.created_at); return d ? isoDate(d) : ""; };

/* Money for one month, shared by both designs: rows, income, sent-home, ledger, totals, handlers. Derived values are empty until loaded. */
export function useMoney(sub) {
  const api = useApi();
  const { toast, ask } = useUI();
  const { format: money, symbol } = useCurrency();
  const now = useNow();
  const ty = now.getFullYear(), tm = now.getMonth() + 1;
  const [ym, setYm] = useState([ty, tm]);
  const [y, m] = ym;
  const [f, setF] = useState("All"), [sort, setSort] = useState("date"), [edit, setEdit] = useState(null), [led, setLed] = useState(null);
  const key = `${y}-${m}`;
  const data = useLoad(api, async a => {
    const [rows, budget, ledger] = await Promise.all([
      a.get(`/expenses?month=${m}&year=${y}`), a.get(`/expenses/budget?month=${m}&year=${y}`), a.get(`/expenses/ledger?month=${m}&year=${y}`).catch(() => []),
    ]);
    return { rows: Array.isArray(rows) ? rows : [], income: Number(budget?.total_income || 0), sentHome: !!budget?.remaining_sent_home, ledger: Array.isArray(ledger) ? ledger : [] };
  }, key, null);
  const [incDraft, setIncDraft] = useState({ key: "", v: "" });
  const adding = sub === "new";
  // month window: 3 months ending at the selected month
  const win = [-2, -1, 0].map(k => { const d = new Date(y, m - 1 + k, 1); return [d.getFullYear(), d.getMonth() + 1]; });
  const shift = n => { const d = new Date(y, m - 1 + n, 1); setYm([d.getFullYear(), d.getMonth() + 1]); };
  const isFuture = y > ty || (y === ty && m > tm);
  const D = data.data;

  const real = D ? D.rows.filter(r => amtOf(r) > 0) : [];
  const spent = real.reduce((a, r) => a + amtOf(r), 0), income = D?.income || 0, left = income - spent;
  const by = Object.keys(CATS).map(c => ({ c, v: real.filter(r => r.category === CATS[c]).reduce((a, r) => a + amtOf(r), 0) }));
  const base = Math.max(income, spent) || 1;
  // conic-gradient stops for the spend ring: each category's share of income (or of spend when over)
  const cone = (() => { let acc = 0; const parts = by.map(x => { const a = acc; acc += (x.v / base) * 100; return `${CAT_C[x.c]} ${a}% ${acc}%`; }); return parts.join(",") + `,var(--ink-3) ${acc}% 100%`; })();
  const view = (D?.rows || []).filter(r => f === "All" || r.category === CATS[f])
    .sort((a, b) => (sort === "amt" ? amtOf(b) - amtOf(a) : dayOf(b).localeCompare(dayOf(a)) || b.id - a.id));
  const days = sort === "amt" ? ["all"] : [...new Set(view.map(dayOf))];
  const sentTo = n => real.filter(r => r.category === "home_person" && String(r.name).trim().toLowerCase() === String(n).trim().toLowerCase()).reduce((a, r) => a + amtOf(r), 0);
  const inc = incDraft.key === key ? incDraft.v : String(income || "");
  const saveBudget = async (total_income, remaining_sent_home) => {
    try {
      const b = await api.post("/expenses/budget", { month: m, year: y, total_income, remaining_sent_home });
      data.setData(s => ({ ...s, income: Number(b.total_income || 0), sentHome: !!b.remaining_sent_home }));
      return true;
    } catch (e) { toast(e.message, "err"); return false; }
  };
  const incOk = inc !== "" && +inc >= 0 && +inc !== income;
  const saveIncome = async () => { if (await saveBudget(+inc, D.sentHome)) { setIncDraft({ key: "", v: "" }); toast("Income saved"); } };
  const del = async r => {
    if (!(await ask({ title: `Delete ${r.name}?`, body: `${money(amtOf(r))} · ${dayOf(r) || "no date"}`, ok: "Delete", danger: true }))) return;
    try { await api.del(`/expenses/${r.id}`); data.setData(s => ({ ...s, rows: s.rows.filter(x => x.id !== r.id) })); toast("Expense deleted"); }
    catch (e) { toast(e.message, "err"); }
  };
  const delLedger = async x => {
    if (!(await ask({ title: `Remove ${x.person_name}?`, body: x.carried ? "This removes the latest entry for this person." : "This ledger entry will be deleted.", ok: "Remove", danger: true }))) return;
    try { await api.del(`/expenses/ledger/${x.id}`); await data.reload(); toast("Ledger entry removed"); }
    catch (e) { toast(e.message, "err"); }
  };
  return { toast, ask, money, symbol, now, ty, tm, y, m, setYm, f, setF, sort, setSort, edit, setEdit, led, setLed, key, data, incDraft, setIncDraft, adding, win, shift, isFuture, D,
    real, spent, income, left, by, base, cone, view, days, sentTo, inc, saveBudget, incOk, saveIncome, del, delLedger };
}

import { useState, useEffect, useCallback, useMemo } from "react";

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "";
  return Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function useExpenses(api, month, year) {
  const [rows, setRows] = useState([]);

  const fetchExpenses = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.get(`/api/expenses?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } catch { /* best-effort */ }
  }, [api, month, year]);

  const dashboard = useMemo(() => {
    const list = rows || [];
    const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byCat = {};
    for (const e of list) {
      const c = e.category || "other";
      byCat[c] = (byCat[c] || 0) + Number(e.amount || 0);
    }
    const labels = { home_bills: "Bills", home_person: "Family", other: "Other" };
    const bars = Object.entries(byCat)
      .map(([k, amt]) => ({
        cat: labels[k] || k,
        amt: formatMoney(amt),
        pct: total > 0 ? Math.round((amt / total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
    return { total, totalFmt: formatMoney(total), bars };
  }, [rows]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return { rows, setRows, dashboard, refetch: fetchExpenses };
}

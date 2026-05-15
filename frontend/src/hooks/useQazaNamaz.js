import { useState, useEffect, useMemo, useCallback } from "react";

const QAZA_NAMES = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];

function computeQazaTotal(payload) {
  if (!payload) return null;
  let t = 0;
  for (const n of QAZA_NAMES) {
    const years = parseFloat(payload[n]) || 0;
    const adj = payload.adjustments?.[n] || 0;
    t += years * 365 + adj;
  }
  return Math.max(0, Math.round(t));
}

export default function useQazaNamaz(api) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQaza = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.get("/api/qaza-namaz");
      if (res.ok) {
        const data = await res.json();
        setPayload(data);
      }
    } catch {
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchQaza(); }, [fetchQaza]);

  const total = useMemo(() => computeQazaTotal(payload), [payload]);

  return { payload, setPayload, total, loading, refetch: fetchQaza };
}

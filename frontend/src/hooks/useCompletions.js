import { useState, useEffect, useCallback, useMemo } from "react";

function completionKey(day, activityId) {
  return `${Number(day)}-${Number(activityId)}`;
}

/**
 * Manages monthly completion data + toggle/save operations.
 */
export default function useCompletions(api, year, month) {
  const [completions, setCompletions] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [compRes, summaryRes] = await Promise.all([
        api.get(`/api/completions/monthly?year=${year}&month=${month}`),
        api.get(`/api/completions/summary?date=${today}`),
      ]);
      if (!compRes.ok || !summaryRes.ok) throw new Error("Failed to fetch");

      const compData = await compRes.json();
      const raw =
        compData?.completions && typeof compData.completions === "object"
          ? compData.completions
          : {};
      const normalized = {};
      for (const [key, val] of Object.entries(raw)) {
        const parts = key.split("-");
        if (parts.length >= 2) {
          normalized[`${Number(parts[0])}-${Number(parts[1])}`] = val;
        } else {
          normalized[key] = val;
        }
      }
      setCompletions(normalized);
      setSummary(await summaryRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, year, month]);

  const toggleCompletion = async (activityId, day) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = completionKey(day, activityId);
    const cur = completions[key] || {};
    const wasCompleted = typeof cur === "object" ? cur.isCompleted : !!cur;
    const note = typeof cur === "object" ? cur.note || "" : "";
    const value = typeof cur === "object" ? cur.value || "" : "";
    const color = typeof cur === "object" ? cur.completionColor || "" : "";

    // Optimistic update
    setCompletions((prev) => ({
      ...prev,
      [key]: { isCompleted: !wasCompleted, note, value, completionColor: color },
    }));

    try {
      const res = await api.post("/api/completions/update", {
        activityId,
        date,
        isCompleted: !wasCompleted,
      });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setCompletions((prev) => ({
        ...prev,
        [key]: {
          isCompleted: result.isCompleted,
          note: result.note || "",
          value: result.value || value,
          completionColor: result.completionColor || color,
        },
      }));
      // Refresh summary
      const today = new Date().toISOString().split("T")[0];
      const sumRes = await api.get(`/api/completions/summary?date=${today}`);
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch {
      // Revert on failure
      setCompletions((prev) => ({
        ...prev,
        [key]: { isCompleted: wasCompleted, note, value, completionColor: color },
      }));
    }
  };

  const saveValue = async (activityId, day, value) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = completionKey(day, activityId);
    const cur = completions[key] || {};
    const isCompleted = value && value.toString().trim() !== "";

    setCompletions((prev) => ({
      ...prev,
      [key]: { ...prev[key], isCompleted, value },
    }));

    try {
      const res = await api.post("/api/completions/update", { activityId, date, isCompleted, value });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setCompletions((prev) => ({
        ...prev,
        [key]: {
          isCompleted: result.isCompleted,
          note: result.note || "",
          value: result.value || value,
          completionColor: result.completionColor || "",
        },
      }));
    } catch {
      setCompletions((prev) => ({ ...prev, [key]: cur }));
    }
  };

  const saveNote = async (activityId, day, note, completionColor) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = completionKey(day, activityId);
    const cur = completions[key] || {};
    const body = { activityId, date, note };
    if (completionColor !== undefined) body.completionColor = completionColor;

    try {
      const res = await api.post("/api/completions/update", body);
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setCompletions((prev) => ({
        ...prev,
        [key]: {
          isCompleted: typeof cur === "object" ? cur.isCompleted : false,
          note: result.note || "",
          value: typeof cur === "object" ? cur.value || "" : "",
          completionColor: result.completionColor || "",
        },
      }));
    } catch { /* best-effort */ }
  };

  const getData = useCallback(
    (activityId, day) => {
      const key = completionKey(day, activityId);
      const data = completions[key];
      if (typeof data === "object" && data !== null) {
        let notes = [];
        if (data.note) {
          try {
            notes = typeof data.note === "string" ? JSON.parse(data.note) : data.note;
            if (!Array.isArray(notes)) notes = data.note.trim() ? [data.note] : [];
          } catch {
            notes = data.note.trim() ? [data.note] : [];
          }
        }
        return { ...data, notes };
      }
      return { isCompleted: data === 1 || !!data, note: "", notes: [], value: "", completionColor: "" };
    },
    [completions]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    completions, setCompletions, summary, loading, error,
    toggleCompletion, saveValue, saveNote, getData, refetch: fetchData,
  };
}

import { useState, useEffect, useCallback } from "react";

export default function useBooksSummary(api) {
  const [summary, setSummary] = useState(null);
  const [favouriteNotes, setFavouriteNotes] = useState([]);

  const fetchSummary = useCallback(async () => {
    if (!api) return;
    const res = await api.get("/api/books/dashboard-summary");
    if (res.ok) {
      const data = await res.json();
      setSummary(data);
    }
  }, [api]);

  const fetchFavouriteNotes = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.get("/api/books/favourite-notes");
      if (res.ok) {
        const data = await res.json();
        setFavouriteNotes(Array.isArray(data) ? data : []);
      }
    } catch {
      setFavouriteNotes([]);
    }
  }, [api]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchFavouriteNotes(); }, [fetchFavouriteNotes]);

  return { summary, favouriteNotes, setFavouriteNotes, refetch: fetchFavouriteNotes };
}

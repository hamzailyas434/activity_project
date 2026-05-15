import { useState, useEffect, useCallback } from "react";

/**
 * Manages activity CRUD + data fetching for a given year/month.
 * Expects a bound `api` object from `createApi(auth)`.
 */
export default function useActivities(api, year, month) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/activities?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load activities");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, year, month]);

  const reorder = async (orderedActivities) => {
    setActivities(orderedActivities);
    try {
      await api.post("/api/activities/reorder", {
        orderedIds: orderedActivities.map((a) => a.id),
        year,
        month,
      });
    } catch {
      fetchActivities();
    }
  };

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { activities, setActivities, loading, error, reorder, refetch: fetchActivities };
}

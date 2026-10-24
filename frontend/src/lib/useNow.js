import { useEffect, useState } from "react";

/* Current time that re-renders every `ms` (default 1 min) so "today" rolls over at midnight. */
export default function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

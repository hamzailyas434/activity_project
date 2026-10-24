import { useCallback, useEffect, useRef, useState } from "react";

/*
  Load data with an async fn(api). Re-runs when `key` changes. Stale responses are dropped.
  Returns { data, setData, loading, error, reload }.
*/
export default function useLoad(api, fn, key = "", initial = null) {
  const [state, setState] = useState({ data: initial, loading: true, error: null, key: null });
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (!api) return;
    const n = ++seq.current;
    try {
      const data = await fnRef.current(api);
      if (n === seq.current) setState({ data, loading: false, error: null, key });
    } catch (e) {
      if (n === seq.current) setState(s => ({ ...s, loading: false, error: e.message || "Failed to load", key }));
    }
  }, [api, key]);

  useEffect(() => { run(); }, [run]);

  const setData = useCallback(fnOrVal => setState(s => ({ ...s, data: typeof fnOrVal === "function" ? fnOrVal(s.data) : fnOrVal })), []);
  // a new key shows the loading state until its first response lands
  const loading = state.loading || state.key !== key;
  return { data: state.data, setData, loading, error: state.error, reload: run };
}

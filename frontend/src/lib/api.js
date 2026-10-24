import { useLayoutEffect, useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import { apiFetch } from "../utils/apiFetch";

/* Path → absolute URL. Accepts "/notes", "/api/notes" or a full URL. */
export const url = p => (/^https?:/.test(p) ? p : API_BASE_URL + p.replace(/^\/api(?=\/)/, ""));

async function readError(res) {
  try { const j = await res.json(); return j.error || j.message || (j.errors && j.errors[0]?.msg) || `Request failed (${res.status})`; }
  catch { return `Request failed (${res.status})`; }
}

/*
  Stable API client for the session. Every call goes through apiFetch (token refresh + logout on expiry).
  json helpers resolve to parsed JSON and throw Error(message) on non-2xx so callers can toast it.
*/
export function useApi() {
  const auth = useAuth();
  const ref = useRef(auth);
  useLayoutEffect(() => { ref.current = auth; });
  const authed = !!auth.token;
  return useMemo(() => {
    if (!authed) return null;
    const raw = (p, opts = {}) => {
      const { token, refreshTokens, logout } = ref.current;
      return apiFetch(url(p), opts, { token, refreshTokens, logout });
    };
    const json = async (method, p, body) => {
      const opts = { method };
      if (body !== undefined) opts.body = body instanceof FormData ? body : JSON.stringify(body);
      const res = await raw(p, opts);
      if (!res.ok) throw new Error(await readError(res));
      if (res.status === 204) return null;
      const t = await res.text();
      return t ? JSON.parse(t) : null;
    };
    return {
      raw,
      get: p => json("GET", p),
      post: (p, b) => json("POST", p, b ?? {}),
      put: (p, b) => json("PUT", p, b ?? {}),
      patch: (p, b) => json("PATCH", p, b ?? {}),
      del: p => json("DELETE", p),
    };
  }, [authed]);
}

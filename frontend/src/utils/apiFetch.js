import { API_BASE_URL } from "../config";
import { isTokenExpired } from "./jwt";

// Shared promise to deduplicate concurrent refresh calls
let _refreshPromise = null;

/**
 * Authenticated fetch with automatic token refresh on 401 TOKEN_EXPIRED.
 * Falls back to logout if refresh fails.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {{ token: string|null, refreshTokens: () => Promise<string|null>, logout: () => void }} auth
 */
export async function apiFetch(url, options = {}, { token, refreshTokens, logout }) {
  // Proactively refresh if token is already expired — avoids a wasted 401 round-trip
  if (token && isTokenExpired(token)) {
    if (!_refreshPromise) {
      _refreshPromise = refreshTokens().finally(() => { _refreshPromise = null; });
    }
    const newToken = await _refreshPromise;
    if (newToken) {
      token = newToken;
    } else {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  const makeRequest = (t) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(url, { ...options, headers, credentials: "include" });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    let body = {};
    try { body = await response.clone().json(); } catch (_) {}

    if (body.code === "TOKEN_EXPIRED") {
      if (!_refreshPromise) {
        _refreshPromise = refreshTokens().finally(() => { _refreshPromise = null; });
      }
      const newToken = await _refreshPromise;
      if (newToken) {
        response = await makeRequest(newToken);
      } else {
        logout();
        throw new Error("Session expired. Please log in again.");
      }
    }
  }

  return response;
}

/**
 * Convenience: apiFetch using auth from context values directly.
 * Usage: apiFetchAuth(url, options, authContext)
 */
export function apiFetchAuth(url, options, authContext) {
  return apiFetch(url, options, {
    token: authContext.token,
    refreshTokens: authContext.refreshTokens,
    logout: authContext.logout,
  });
}

export { API_BASE_URL };

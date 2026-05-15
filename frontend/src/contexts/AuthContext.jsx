import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { isTokenExpired } from "../utils/jwt";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    const storedUser  = localStorage.getItem("user")  || sessionStorage.getItem("user");

    if (storedToken && storedUser) {
      // If JWT is already expired, try a silent refresh instead of using a stale token
      if (isTokenExpired(storedToken)) {
        silentRefresh();
        return;
      }

      // Token is still valid — restore session
      setToken(storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === "object") setUser(parsed);
      } catch {
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");
      }
      setLoading(false);
    } else {
      // No stored token — try cookie-based session
      silentRefresh();
    }
  }, []);

  const silentRefresh = async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setToken(data.token);
        setUser(data.user);
        // Store back to the same origin storage
        const useLocalStorage = !!localStorage.getItem("token");
        const store = useLocalStorage ? localStorage : sessionStorage;
        store.setItem("token", data.token);
        store.setItem("user", JSON.stringify(data.user));
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const login = (userData, authToken, remember = false) => {
    setUser(userData);
    setToken(authToken);
    if (remember) {
      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    } else {
      sessionStorage.setItem("token", authToken);
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  const logout = async () => {
    clearSession();
    try {
      await fetch(`${API_BASE_URL}/users/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {
      // Best-effort cookie clear
    }
  };

  // Calls /users/refresh with the httpOnly refreshToken cookie.
  // Stores the new token in the same storage that held the old one.
  // Returns the new access token string, or null on failure.
  const refreshTokens = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        // Preserve original storage intent — don't re-evaluate rememberMe
        const useLocalStorage = !!localStorage.getItem("token");
        if (useLocalStorage) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("user", JSON.stringify(data.user));
        }
        return data.token;
      }
      await logout();
      return null;
    } catch {
      await logout();
      return null;
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    refreshTokens,
    isAuthenticated: !!user && !!token,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

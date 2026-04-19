import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

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
    // Check localStorage first (Remember Me), then sessionStorage (tab session)
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    const storedUser  = localStorage.getItem("user")  || sessionStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Skip re-verification if we verified within the last 5 minutes to avoid
      // hammering /users/me on every refresh (especially with Remember Me active).
      const lastVerified = parseInt(localStorage.getItem("lastVerified") || "0", 10);
      const stale = Date.now() - lastVerified > 5 * 60 * 1000;
      if (stale) {
        verifyToken(storedToken);
      } else {
        setLoading(false);
      }
    } else {
      // No stored token — try cookie-based session
      verifyToken(null);
    }
  }, []);

  const verifyToken = async tokenToVerify => {
    try {
      const headers = {};
      if (tokenToVerify) headers.Authorization = `Bearer ${tokenToVerify}`;
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers,
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        if (tokenToVerify) setToken(tokenToVerify);
        localStorage.setItem("lastVerified", Date.now().toString());
      } else if (response.status === 401) {
        // Access token expired — try refreshing silently before logging out
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/users/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem("lastVerified", Date.now().toString());
            const remembered = localStorage.getItem("rememberMe") === "true";
            const store = remembered ? localStorage : sessionStorage;
            store.setItem("token", data.token);
            store.setItem("user", JSON.stringify(data.user));
          } else {
            logout();
          }
        } catch {
          logout();
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken, remember = false) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("lastVerified", Date.now().toString());
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
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("lastVerified");
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
        const remembered = localStorage.getItem("rememberMe") === "true";
        if (remembered) {
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

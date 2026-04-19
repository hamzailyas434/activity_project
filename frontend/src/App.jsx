import { useState, useEffect, useRef, useCallback } from "react";
import ActivityManager from "./components/ActivityManager";
import Calendar from "./components/Calendar";
import AuthPage from "./components/auth/AuthPage";
import Notes from "./components/Notes";
import QazaNamaz from "./components/QazaNamaz";
import Profile from "./components/Profile";
import Expenses from "./components/Expenses";
import FavouriteProfiles from "./components/FavouriteProfiles";
import ProfileDropdown from "./components/ProfileDropdown";
import { useAuth } from "./contexts/AuthContext";
import LandingPage from "./components/LandingPage";
import MonthlyTodos from "./components/MonthlyTodos";
import StickyNoteEditor from "./components/StickyNoteEditor";
import Books from "./components/Books";
import BookNoteWidget from "./components/BookNoteWidget";

import { apiFetch, API_BASE_URL } from "./utils/apiFetch";

// ── Shared class snippets ──────────────────────────────────────────────────────
const tabBtn = (active) =>
  `px-[1.1rem] py-[0.6rem] rounded-lg border-none cursor-pointer text-[0.85rem] whitespace-nowrap transition-all duration-200 ${
    active
      ? "bg-primary text-white font-semibold"
      : "bg-transparent text-ink-sub font-medium hover:bg-gtint-hov"
  }`;

function App() {
  const { user, token, login, logout, refreshTokens, isAuthenticated, loading: authLoading } = useAuth();
  const [activities, setActivities]   = useState([]);
  const [completions, setCompletions] = useState({});
  const [summary, setSummary]         = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [previousMonthHasRoutines, setPreviousMonthHasRoutines] = useState(false);

  const [theme, setTheme]           = useState(localStorage.getItem("theme") || "dark");
  const [activeTab, setActiveTab]   = useState("dashboard");
  const [showAuth, setShowAuth]     = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState("login");

  const STICKY_COLORS = ["#fef08a","#86efac","#93c5fd","#f9a8d4","#c4b5fd","#fdba74","#ffffff"];
  const [stickyNotes, setStickyNotes] = useState([]);
  const [booksSummary, setBooksSummary] = useState(null);
  const stickyDebounceRef = useRef({});
  const carouselRef  = useRef(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const scrollCarousel = useCallback((dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const panelW = el.offsetWidth;
    const next = Math.max(0, Math.min(2, carouselIdx + dir));
    el.scrollTo({ left: next * panelW, behavior: "smooth" });
    setCarouselIdx(next);
  }, [carouselIdx]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_BASE_URL}/books/dashboard-summary`, {}, { token, refreshTokens, logout })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setBooksSummary(data))
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_BASE_URL}/sticky-notes`, {}, { token, refreshTokens, logout })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setStickyNotes(data))
      .catch(err => console.error("Failed to load sticky notes:", err));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddStickyNote = async () => {
    const color = STICKY_COLORS[stickyNotes.length % STICKY_COLORS.length];
    try {
      const res = await authFetch(`${API_BASE_URL}/sticky-notes`, {
        method: "POST",
        body: JSON.stringify({ text: "", color }),
      });
      const newNote = await res.json();
      setStickyNotes(prev => [...prev, newNote]);
    } catch (err) { console.error("Failed to add sticky note:", err); }
  };

  const handleStickyNoteChange = (id, text) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    if (stickyDebounceRef.current[id]) clearTimeout(stickyDebounceRef.current[id]);
    stickyDebounceRef.current[id] = setTimeout(async () => {
      const note = stickyNotes.find(n => n.id === id);
      if (!note) return;
      try {
        await authFetch(`${API_BASE_URL}/sticky-notes/${id}`, {
          method: "PUT",
          body: JSON.stringify({ text, color: note.color }),
        });
      } catch (err) { console.error("Failed to update sticky note text:", err); }
    }, 500);
  };

  const handleStickyNoteColor = async (id, color) => {
    const note = stickyNotes.find(n => n.id === id);
    if (!note) return;
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, color } : n));
    try {
      await authFetch(`${API_BASE_URL}/sticky-notes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ text: note.text, color }),
      });
    } catch (err) { console.error("Failed to update sticky note color:", err); }
  };

  const handleDeleteStickyNote = async (id) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
    localStorage.removeItem(`sne-h-${id}`);
    try {
      await authFetch(`${API_BASE_URL}/sticky-notes/${id}`, {
        method: "DELETE",
      });
    } catch (err) { console.error("Failed to delete sticky note:", err); }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const authFetch = (url, options = {}) =>
    apiFetch(url, options, { token, refreshTokens, logout });

  const currentYear  = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    if (isAuthenticated && token) fetchData();
  }, [currentYear, currentMonth, isAuthenticated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true); setError(null);
      const today = new Date().toISOString().split("T")[0];
      const [activitiesRes, completionsRes, summaryRes, prevRoutinesRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/activities?year=${currentYear}&month=${currentMonth}`),
        authFetch(`${API_BASE_URL}/completions/monthly?year=${currentYear}&month=${currentMonth}`),
        authFetch(`${API_BASE_URL}/completions/summary?date=${today}`),
        authFetch(`${API_BASE_URL}/activities/previous-month-has-routines?year=${currentYear}&month=${currentMonth}`),
      ]);
      if (!activitiesRes.ok || !completionsRes.ok || !summaryRes.ok) throw new Error("Failed to fetch data");

      const activitiesData = await activitiesRes.json();
      const completionsData = await completionsRes.json();
      const summaryData = await summaryRes.json();

      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      const raw = completionsData?.completions && typeof completionsData.completions === "object" ? completionsData.completions : {};
      const normalizedCompletions = {};
      for (const [key, val] of Object.entries(raw)) {
        const parts = key.split("-");
        if (parts.length >= 2) {
          normalizedCompletions[`${Number(parts[0])}-${Number(parts[1])}`] = val;
        } else {
          normalizedCompletions[key] = val;
        }
      }
      setCompletions(normalizedCompletions);
      setSummary(summaryData ?? null);
      try {
        if (prevRoutinesRes.ok) {
          const prevData = await prevRoutinesRes.json();
          setPreviousMonthHasRoutines(prevData?.hasRoutines === true);
        } else {
          setPreviousMonthHasRoutines(false);
        }
      } catch { setPreviousMonthHasRoutines(false); }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  };
  const handleNextMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  };

  const handleActivityAdded = newActivity => { setActivities(prev => [...prev, newActivity]); fetchData(); };
  const handleActivityDeleted = () => fetchData();
  const handleImportPreviousMonth = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/activities/import-previous-month`, {
        method: "POST", body: JSON.stringify({ year: currentYear, month: currentMonth }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to import"); }
      await fetchData();
    } catch (err) { console.error("Error importing routines:", err); setError(err.message || "Failed to import previous routines"); }
  };

  const handleActivityReorder = async reorderedActivities => {
    setActivities(reorderedActivities);
    try {
      const response = await authFetch(`${API_BASE_URL}/activities/reorder`, {
        method: "POST",
        body: JSON.stringify({ orderedIds: reorderedActivities.map(a => a.id), year: currentYear, month: currentMonth }),
      });
      if (!response.ok) throw new Error("Failed to save order");
    } catch (err) { console.error("Error reordering activities:", err); setError("Failed to save updated order"); fetchData(); }
  };

  const handleExportData = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/analytics/export?format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `activity-tracker-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      }
    } catch (err) { console.error("Error exporting data:", err); setError("Failed to export data"); }
  };

  const completionKey = (day, activityId) => `${Number(day)}-${Number(activityId)}`;

  const handleToggleCompletion = async (activityId, day) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const key = completionKey(day, activityId);
    const currentData = completions[key] || {};
    const currentIsCompleted = typeof currentData === "object" ? currentData.isCompleted : currentData;
    const currentNote  = typeof currentData === "object" ? currentData.note : "";
    const currentValue = typeof currentData === "object" ? currentData.value : "";
    const currentColor = typeof currentData === "object" ? currentData.completionColor : "";
    try {
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: !currentIsCompleted, note: currentNote, value: currentValue, completionColor: currentColor } }));
      const response = await authFetch(`${API_BASE_URL}/completions/update`, {
        method: "POST", body: JSON.stringify({ activityId, date, isCompleted: !currentIsCompleted }),
      });
      if (!response.ok) throw new Error("Failed to toggle completion");
      const result = await response.json();
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: result.isCompleted, note: result.note, value: result.value || currentValue, completionColor: result.completionColor || currentColor } }));
      const today = new Date().toISOString().split("T")[0];
      const summaryRes = await authFetch(`${API_BASE_URL}/completions/summary?date=${today}`);
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) {
      console.error("Error toggling completion:", err);
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: currentIsCompleted, note: currentNote, completionColor: currentColor } }));
      setError("Failed to update completion status");
    }
  };

  const handleValueChange = async (activityId, day, value) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const key = completionKey(day, activityId);
    const currentData = completions[key] || {};
    const currentIsCompleted = value && value.toString().trim() !== "";
    const currentNote = typeof currentData === "object" ? currentData.note : "";
    const currentColor = typeof currentData === "object" ? currentData.completionColor : "";
    try {
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: currentIsCompleted, note: currentNote, value, completionColor: currentColor } }));
      const response = await authFetch(`${API_BASE_URL}/completions/update`, {
        method: "POST", body: JSON.stringify({ activityId, date, isCompleted: currentIsCompleted, value }),
      });
      if (!response.ok) throw new Error("Failed to update value");
      const result = await response.json();
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: result.isCompleted, note: result.note, value: result.value, completionColor: result.completionColor || currentColor } }));
      const today = new Date().toISOString().split("T")[0];
      const summaryRes = await authFetch(`${API_BASE_URL}/completions/summary?date=${today}`);
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) { console.error("Error updating value:", err); setError("Failed to save value"); }
  };

  const handleSaveNote = async (activityId, day, note, completionColor) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const key = completionKey(day, activityId);
    const currentData = completions[key] || {};
    const currentIsCompleted = typeof currentData === "object" ? currentData.isCompleted : false;
    const currentValue = typeof currentData === "object" ? currentData.value : "";
    try {
      const body = { activityId, date, note };
      if (completionColor !== undefined) body.completionColor = completionColor;
      const response = await authFetch(`${API_BASE_URL}/completions/update`, {
        method: "POST", body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to save note");
      const result = await response.json();
      setCompletions(prev => ({ ...prev, [key]: { isCompleted: currentIsCompleted, note: result.note, value: currentValue, completionColor: result.completionColor || "" } }));
    } catch (err) { console.error("Error saving note:", err); setError("Failed to save note"); }
  };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const handleAuthSuccess = (userData, authToken, remember) => login(userData, authToken, remember);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-edge border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showAuth) {
      return (
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
          initialTab={authInitialTab}
          onBack={() => setShowAuth(false)}
        />
      );
    }
    return (
      <LandingPage
        onGetStarted={() => { setAuthInitialTab("register"); setShowAuth(true); }}
        onLogin={() => { setAuthInitialTab("login"); setShowAuth(true); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-edge border-t-primary rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="header-glass sticky top-0 z-[100] border-b border-edge shadow-glass py-4">
        <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center flex-wrap gap-4 max-sm:px-4 max-sm:justify-center max-sm:flex-col max-sm:gap-2">
          <h1 className="gradient-text text-2xl font-bold tracking-tight">
            Activity Tracker
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                className="bg-surface border border-edge text-ink px-4 py-2 rounded-lg cursor-pointer text-[0.9rem] transition-all duration-200 hover:bg-gtint-hov hover:border-primary"
                onClick={handlePreviousMonth}
                aria-label="Previous month"
              >
                ◀ Previous
              </button>
              <span className="font-semibold min-w-[150px] text-center text-ink">{monthName}</span>
              <button
                className="bg-surface border border-edge text-ink px-4 py-2 rounded-lg cursor-pointer text-[0.9rem] transition-all duration-200 hover:bg-gtint-hov hover:border-primary"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                Next ▶
              </button>
            </div>
            <button
              className="bg-surface border border-edge rounded-full w-10 h-10 flex items-center justify-center cursor-pointer text-xl transition-all duration-200 hover:bg-gtint-hov hover:scale-110"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <ProfileDropdown user={user} onLogout={logout} onNavigateToProfile={() => setActiveTab("profile")} />
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-8 max-sm:p-4">
        {error && (
          <div className="bg-danger text-white p-4 rounded-lg mb-4 text-center">{error}</div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-2 mb-6 bg-surface px-2 py-2 rounded-xl border border-edge shadow-glass overflow-x-auto whitespace-nowrap mb-6">
          {[
            { id: "dashboard", label: "📊 Dashboard" },
            { id: "notes",     label: "📝 Notes" },
            { id: "qaza-namaz",label: "🕌 Qaza Namaz" },
            { id: "activities",label: "⚙️ Activities" },
            { id: "profile",   label: "👤 Profile" },
            { id: "expenses",  label: "💰 Expenses" },
            { id: "favourites",label: "⭐ Favourites" },
            { id: "books",     label: "📚 Books" },
          ].map(({ id, label }) => (
            <button key={id} className={tabBtn(activeTab === id)} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
          <button
            className="ml-auto px-[1.1rem] py-[0.6rem] rounded-lg border-none cursor-pointer text-[0.85rem] font-medium whitespace-nowrap transition-all duration-200 bg-transparent text-ink-sub hover:bg-gtint-hov"
            onClick={handleExportData}
          >
            💾 Export
          </button>
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === "dashboard" && (
          <>
            {/* Top 3-panel horizontal carousel */}
            <div className="relative mb-6 animate-fade-in">
              {/* Left arrow */}
              {carouselIdx > 0 && (
                <button
                  onClick={() => scrollCarousel(-1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full bg-surface border border-edge shadow-glass flex items-center justify-center text-ink-sub text-base cursor-pointer hover:bg-gtint-hov transition-colors"
                  title="Previous"
                >‹</button>
              )}
              {/* Right arrow */}
              {carouselIdx < 2 && (
                <button
                  onClick={() => scrollCarousel(1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full bg-surface border border-edge shadow-glass flex items-center justify-center text-ink-sub text-base cursor-pointer hover:bg-gtint-hov transition-colors"
                  title="Next"
                >›</button>
              )}

              {/* Scroll track */}
              <div
                ref={carouselRef}
                className="flex overflow-x-hidden gap-5"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {/* Panel 1 — Progress + Goals */}
                <div className="shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
                  <div className="grid grid-cols-[1fr_1.2fr] gap-5 items-stretch max-md:grid-cols-1">
                    {/* Left: Progress Banner */}
                    <div className="flex flex-col justify-center">
                      {summary?.daily && (() => {
                        const { percentage, completed, total } = summary.daily;
                        const color = percentage >= 80
                          ? "var(--success)" : percentage >= 40 ? "var(--warning)" : "var(--danger-color)";
                        return (
                          <div className="glass rounded-xl px-6 py-4 h-full box-border">
                            <div className="flex items-baseline justify-between mb-[0.6rem]">
                              <div className="flex items-baseline gap-1 text-[0.9rem] text-ink-muted">
                                <span className="text-2xl font-bold text-ink leading-none">{completed}</span>
                                <span className="text-base text-ink-muted">/</span>
                                <span className="text-base font-semibold text-ink-sub">{total}</span>
                                <span className="text-[0.85rem] ml-1">activities done today</span>
                              </div>
                              <span className="text-[1.75rem] font-extrabold tracking-[-0.03em] leading-none" style={{ color }}>
                                {percentage}%
                              </span>
                            </div>
                            <div className="h-[6px] rounded-full bg-gtint-hov overflow-hidden">
                              <div
                                className="progress-fill"
                                style={{ width: `${percentage}%`, background: color }}
                              />
                            </div>
                            <MonthlyTodos
                              month={currentMonth}
                              year={currentYear}
                              authHeaders={() => ({ Authorization: `Bearer ${token}` })}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    {/* Right: Sticky Notes */}
                    <div className="glass rounded-xl flex flex-col overflow-hidden min-h-[100px]">
                      <div className="flex items-center justify-between px-4 py-[0.65rem] border-b border-edge">
                        <span className="text-[0.85rem] font-semibold text-ink-sub tracking-[0.02em]">
                          📌 Quick Notes
                        </span>
                        <button
                          className="w-[26px] h-[26px] border-none bg-primary text-white rounded-full text-lg leading-none cursor-pointer flex items-center justify-center transition-opacity duration-150 hover:opacity-85"
                          onClick={handleAddStickyNote}
                          title="Add note"
                        >
                          +
                        </button>
                      </div>
                      <div className={`grid ${stickyNotes.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-3 p-3 overflow-y-auto`}>
                        {stickyNotes.length === 0 && (
                          <p className="text-[0.8rem] text-ink-muted text-center col-span-2 py-2">
                            No notes yet. Click + to add one.
                          </p>
                        )}
                        {stickyNotes.map(note => (
                          <div
                            key={note.id}
                            className="rounded-lg px-[0.6rem] py-[0.5rem] flex flex-col gap-[0.4rem] shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                            style={{ background: note.color }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {STICKY_COLORS.map(c => (
                                  <button
                                    key={c}
                                    className={`color-dot${note.color === c ? " active" : ""}`}
                                    style={{ background: c }}
                                    onClick={() => handleStickyNoteColor(note.id, c)}
                                    title={c}
                                  />
                                ))}
                              </div>
                              <button
                                className="bg-transparent border-none text-black/35 text-[0.75rem] cursor-pointer px-0.5 leading-none transition-colors duration-150 hover:text-black/70"
                                onClick={() => handleDeleteStickyNote(note.id)}
                                title="Delete note"
                              >
                                ✕
                              </button>
                            </div>
                            <StickyNoteEditor
                              key={note.id}
                              noteId={note.id}
                              value={note.text}
                              onChange={val => handleStickyNoteChange(note.id, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2 — Book Notes Widget */}
                <div className="shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
                  <BookNoteWidget
                    token={token}
                    onOpenBook={(bookId, page) => {
                      localStorage.setItem("pending-open-book", JSON.stringify({ bookId, page }));
                      setActiveTab("books");
                    }}
                  />
                </div>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-3">
                {[0, 1].map(i => (
                  <button
                    key={i}
                    onClick={() => scrollCarousel(i - carouselIdx)}
                    className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all duration-200 p-0 ${
                      carouselIdx === i ? "bg-primary w-5" : "bg-ink-muted/35 hover:bg-ink-muted/60"
                    }`}
                    title={i === 0 ? "Dashboard" : "Book Notes"}
                  />
                ))}
              </div>
            </div>

            {/* Today's Tasks */}
            {(() => {
              const todayDate = new Date();
              const isCurrentMonth = todayDate.getMonth() + 1 === currentMonth && todayDate.getFullYear() === currentYear;
              const todayDay = isCurrentMonth ? todayDate.getDate() : null;
              if (!todayDay || activities.length === 0) return null;

              const getCompletionData = (activityId, day) => {
                const key = completionKey(day, activityId);
                const data = completions[key];
                if (typeof data === "object" && data !== null) return data;
                return { isCompleted: data === 1 || data === true, note: "", value: "" };
              };

              return (
                <div className="today-accent-bar glass rounded-2xl px-6 py-5 mb-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base text-ink flex items-center gap-[0.4rem] m-0 font-bold">
                      <span>📅</span> Today&apos;s Tasks
                    </h3>
                    <span className="bg-primary text-white px-3 py-1 rounded-[20px] text-xs font-semibold">
                      {todayDate.toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 max-sm:grid-cols-2">
                    {activities.map(activity => {
                      const { isCompleted, value } = getCompletionData(activity.id, todayDay);
                      const isInput = activity.type === "number" || activity.type === "text";
                      return (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-[0.6rem] px-[0.875rem] py-[0.6rem] rounded-lg border transition-all duration-150 select-none ${
                            isCompleted
                              ? "border-ok/35 bg-ok/[0.06] hover:border-ok/60"
                              : "border-edge bg-canvas hover:border-primary hover:bg-gtint-hov"
                          }`}
                          onClick={() => { if (!isInput) handleToggleCompletion(activity.id, todayDay); }}
                          style={{ cursor: isInput ? "default" : "pointer" }}
                        >
                          <div className="flex items-center justify-center shrink-0">
                            {isInput ? (
                              <input
                                type={activity.type}
                                className="w-16 px-[0.4rem] py-[0.2rem] text-[0.8rem] rounded-md border border-edge bg-surface text-ink"
                                value={value || ""}
                                onClick={e => e.stopPropagation()}
                                onChange={e => handleValueChange(activity.id, todayDay, e.target.value)}
                                placeholder="—"
                              />
                            ) : (
                              <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center text-0 shrink-0 transition-all duration-150 ${
                                isCompleted
                                  ? "bg-ok border-ok text-white text-[0.65rem] font-extrabold"
                                  : "border-edge bg-transparent hover:border-primary"
                              }`}>
                                {isCompleted ? "✓" : ""}
                              </span>
                            )}
                          </div>
                          <span className={`text-[0.84rem] font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 transition-colors duration-150 ${
                            isCompleted ? "text-ink-muted line-through decoration-ok" : "text-ink"
                          }`}>
                            {activity.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Reading Progress Widget */}
            {booksSummary && (
              <div className="glass rounded-xl px-5 py-4 mb-6 flex items-center gap-5 animate-fade-in max-sm:flex-col max-sm:items-start">
                <div className="text-2xl">📚</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <span className="text-[0.85rem] font-semibold text-ink">
                      {booksSummary.current_book
                        ? <span className="text-ink-sub font-normal truncate">{booksSummary.current_book.title}</span>
                        : <span className="text-ink-sub font-normal">No books yet</span>
                      }
                    </span>
                    <span className="text-[0.8rem] text-ink-muted shrink-0">
                      {booksSummary.pages_today} / {booksSummary.daily_pages_goal} pages today
                    </span>
                  </div>
                  <div className="h-[5px] rounded-full bg-gtint-hov overflow-hidden">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, Math.round((booksSummary.pages_today / booksSummary.daily_pages_goal) * 100))}%`,
                        background: "var(--primary-color)",
                      }}
                    />
                  </div>
                  {booksSummary.current_book && (
                    <div className="text-[0.75rem] text-ink-muted mt-1">
                      p.{booksSummary.current_book.current_page}{booksSummary.current_book.total_pages > 0 && ` / ${booksSummary.current_book.total_pages}`}
                    </div>
                  )}
                </div>
                <button
                  className="px-3 py-1 rounded-lg text-[0.8rem] bg-primary text-white border-none cursor-pointer shrink-0 hover:opacity-85 transition-opacity"
                  onClick={() => setActiveTab("books")}
                >
                  Open Books
                </button>
              </div>
            )}

            <Calendar
              activities={activities}
              completions={completions}
              year={currentYear}
              month={currentMonth}
              onToggleCompletion={handleToggleCompletion}
              onSaveNote={handleSaveNote}
              onValueChange={handleValueChange}
              onActivityReorder={handleActivityReorder}
            />
          </>
        )}

        {activeTab === "books"      && <Books />}
        {activeTab === "notes"      && <Notes />}
        {activeTab === "qaza-namaz" && <QazaNamaz />}
        {activeTab === "profile"    && <Profile />}
        {activeTab === "expenses"   && <Expenses year={currentYear} month={currentMonth} />}
        {activeTab === "favourites" && <FavouriteProfiles />}
        {activeTab === "activities" && (
          <ActivityManager
            activities={activities}
            year={currentYear}
            month={currentMonth}
            previousMonthHasRoutines={previousMonthHasRoutines}
            onImportPreviousMonth={handleImportPreviousMonth}
            onActivityAdded={handleActivityAdded}
            onActivityDeleted={handleActivityDeleted}
          />
        )}
      </div>
    </div>
  );
}

export default App;

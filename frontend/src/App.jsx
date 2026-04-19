import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AuthPage from "./components/auth/AuthPage";
import Notes from "./components/Notes";
import QazaNamaz from "./components/QazaNamaz";
import Profile from "./components/Profile";
import Expenses from "./components/Expenses";
import FavouriteProfiles from "./components/FavouriteProfiles";
import ProfileDropdown from "./components/ProfileDropdown";
import { useAuth } from "./contexts/AuthContext";
import LandingPage from "./components/LandingPage";
import Books from "./components/Books";
import DashboardHome from "./components/DashboardHome";
import ActivitiesPage from "./components/ActivitiesPage";
import { Icon } from "./components/rhythm/RhythmAtoms";

import { apiFetch, API_BASE_URL } from "./utils/apiFetch";

const QAZA_NAMES = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];

function computeQazaTotal(payload) {
  if (!payload) return null;
  let t = 0;
  for (const n of QAZA_NAMES) {
    const years = parseFloat(payload[n]) || 0;
    const adj = payload.adjustments?.[n] || 0;
    t += years * 365 + adj;
  }
  return Math.max(0, Math.round(t));
}

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "";
  return Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

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
  const [qazaPayload, setQazaPayload] = useState(null);
  const [favouriteBookNotes, setFavouriteBookNotes] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const stickyDebounceRef = useRef({});

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

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_BASE_URL}/qaza-namaz`, {}, { token, refreshTokens, logout })
      .then(r => (r.ok ? r.json() : null))
      .then(data => data && setQazaPayload(data))
      .catch(() => setQazaPayload(null));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || activeTab !== "dashboard") return;
    apiFetch(`${API_BASE_URL}/books/favourite-notes`, {}, { token, refreshTokens, logout })
      .then(r => (r.ok ? r.json() : []))
      .then(data => Array.isArray(data) && setFavouriteBookNotes(data))
      .catch(() => setFavouriteBookNotes([]));
  }, [token, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddStickyNote = async () => {
    const color = STICKY_COLORS[stickyNotes.length % STICKY_COLORS.length];
    try {
      const res = await authFetch(`${API_BASE_URL}/sticky-notes`, {
        method: "POST",
        body: JSON.stringify({ text: "", color }),
      });
      const newNote = await res.json();
      setStickyNotes(prev => [...prev, newNote]);
      return newNote;
    } catch (err) {
      console.error("Failed to add sticky note:", err);
      return null;
    }
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
    if (!token) return;
    apiFetch(`${API_BASE_URL}/expenses?month=${currentMonth}&year=${currentYear}`, {}, { token, refreshTokens, logout })
      .then(r => (r.ok ? r.json() : []))
      .then(data => Array.isArray(data) && setExpenseRows(data))
      .catch(() => setExpenseRows([]));
  }, [token, currentMonth, currentYear]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getCompletionData = useCallback(
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
      return {
        isCompleted: data === 1 || data === true,
        note: "",
        notes: [],
        value: "",
        completionColor: "",
      };
    },
    [completions]
  );

  const monthLabel = currentDate.toLocaleString("default", { month: "long" });
  const yearLabel  = currentDate.getFullYear();

  const qazaTotals = useMemo(() => {
    const total = computeQazaTotal(qazaPayload);
    return { total };
  }, [qazaPayload]);

  const expenseDashboard = useMemo(() => {
    const list = expenseRows || [];
    const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byCat = {};
    for (const e of list) {
      const c = e.category || "other";
      byCat[c] = (byCat[c] || 0) + Number(e.amount || 0);
    }
    const labels = { home_bills: "Bills", home_person: "Family", other: "Other" };
    const bars = Object.entries(byCat)
      .map(([k, amt]) => ({
        cat: labels[k] || k,
        amt: formatMoney(amt),
        pct: total > 0 ? Math.round((amt / total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
    return { total, totalFmt: formatMoney(total), bars };
  }, [expenseRows]);

  const greetParts = useMemo(() => {
    const todayDate = new Date();
    const h = todayDate.getHours();
    const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const raw = user?.name || user?.username || "there";
    const name = String(raw).split(" ")[0];
    return {
      greeting: `${g}, ${name}.`,
      dateLine: todayDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      weekday: todayDate.toLocaleDateString(undefined, { weekday: "long" }),
    };
  }, [user]);

  const monthNav = useMemo(
    () => ({
      label: `${monthLabel} ${yearLabel}`,
      onPrev: handlePreviousMonth,
      onNext: handleNextMonth,
    }),
    [monthLabel, yearLabel, handlePreviousMonth, handleNextMonth]
  );

  const todayDayForDash = useMemo(() => {
    const todayDate = new Date();
    const ok = todayDate.getMonth() + 1 === currentMonth && todayDate.getFullYear() === currentYear;
    return ok ? todayDate.getDate() : null;
  }, [currentMonth, currentYear]);

  const activitySummaryStats = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    let daysWith = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      let any = false;
      for (const a of activities) {
        const k = `${d}-${a.id}`;
        const c = completions[k];
        const done = typeof c === "object" && c !== null ? c.isCompleted : c === 1 || c === true;
        if (done) {
          any = true;
          break;
        }
      }
      if (any) daysWith++;
    }
    let doneCells = 0;
    const totalCells = daysInMonth * Math.max(1, activities.length);
    for (let d = 1; d <= daysInMonth; d++) {
      for (const a of activities) {
        const k = `${d}-${a.id}`;
        const c = completions[k];
        const done = typeof c === "object" && c !== null ? c.isCompleted : c === 1 || c === true;
        if (done) doneCells++;
      }
    }
    const avg = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;
    return [
      ["Days with activity", `${daysWith} / ${daysInMonth}`],
      ["Routine rows", String(activities.length)],
      ["Completion avg (month)", `${avg}%`],
      ["Qaza (est.)", qazaTotals.total != null ? String(qazaTotals.total) : "—"],
      ["Expenses total", expenseDashboard.totalFmt || "—"],
    ];
  }, [activities, completions, currentYear, currentMonth, qazaTotals.total, expenseDashboard.totalFmt]);

  const handleAuthSuccess = (userData, authToken, remember) => login(userData, authToken, remember);

  const tabs = [
    { id: "dashboard",  label: "Dashboard" },
    { id: "notes",      label: "Notes" },
    { id: "qaza-namaz", label: "Qaza" },
    { id: "activities", label: "Activities" },
    { id: "expenses",   label: "Expenses" },
    { id: "favourites", label: "Favourites" },
    { id: "books",      label: "Books" },
  ];

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="rhythm-kit" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src="/rhythm-logo.svg" alt="" width={28} height={28} style={{ borderRadius: 6 }} />
            <span className="brand-name">Rhythm</span>
          </div>
          <nav className="tabs" aria-label="Main">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`tab${activeTab === id ? " active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            <button type="button" className="icon-btn" title="Export CSV" aria-label="Export" onClick={handleExportData}>
              <Icon name="export" size={16} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Icon name="sun" size={16} /> : <Icon name="moon" size={16} />}
            </button>
            <ProfileDropdown user={user} onLogout={logout} onNavigateToProfile={() => setActiveTab("profile")} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div
            style={{
              background: "var(--danger-weak)",
              color: "var(--danger)",
              padding: "12px 16px",
              borderRadius: "var(--r-md)",
              marginBottom: 20,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        {activeTab === "dashboard" && (
          <DashboardHome
            monthLabel={monthLabel}
            greetParts={greetParts}
            monthNav={monthNav}
            summary={summary}
            activities={activities}
            todayDay={todayDayForDash}
            getCompletionData={getCompletionData}
            onToggleToday={handleToggleCompletion}
            onValueToday={handleValueChange}
            stickyNotes={stickyNotes}
            stickyColors={STICKY_COLORS}
            onAddSticky={handleAddStickyNote}
            onStickyChange={handleStickyNoteChange}
            onStickyColor={handleStickyNoteColor}
            onDeleteSticky={handleDeleteStickyNote}
            booksSummary={booksSummary}
            expenseBars={expenseDashboard.bars}
            expenseTotalFormatted={expenseDashboard.totalFmt}
            qazaRemaining={qazaTotals.total}
            favouriteBookNotes={favouriteBookNotes}
            onOpenBooks={() => setActiveTab("books")}
            onOpenExpenses={() => setActiveTab("expenses")}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "books" && <Books />}
        {activeTab === "notes" && <Notes />}
        {activeTab === "qaza-namaz" && <QazaNamaz />}
        {activeTab === "profile" && <Profile />}
        {activeTab === "expenses" && <Expenses year={currentYear} month={currentMonth} />}
        {activeTab === "favourites" && <FavouriteProfiles />}
        {activeTab === "activities" && (
          <ActivitiesPage
            monthLabel={monthLabel}
            yearLabel={yearLabel}
            onPrevMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
            activities={activities}
            completions={completions}
            onToggleCompletion={handleToggleCompletion}
            onSaveNote={handleSaveNote}
            onValueChange={handleValueChange}
            onActivityReorder={handleActivityReorder}
            previousMonthHasRoutines={previousMonthHasRoutines}
            onImportPreviousMonth={handleImportPreviousMonth}
            onActivityAdded={handleActivityAdded}
            onActivityDeleted={handleActivityDeleted}
            authHeaders={() => ({ Authorization: `Bearer ${token}` })}
            summaryStats={activitySummaryStats}
          />
        )}
      </main>
    </div>
  );
}

export default App;

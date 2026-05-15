import { useState, useMemo, useCallback } from "react";
import AuthPage from "./components/auth/AuthPage";
import Notes from "./components/Notes";
import QazaNamaz from "./components/QazaNamaz";
import Profile from "./components/Profile";
import Expenses from "./components/Expenses";
import FavouriteProfiles from "./components/FavouriteProfiles";
import ProfileDropdown from "./components/ProfileDropdown";
import Books from "./components/Books";
import DashboardHome from "./components/DashboardHome";
import ActivitiesPage from "./components/ActivitiesPage";
import AdminPanel from "./components/AdminPanel";
import ThemeAppearanceMenu from "./components/ThemeAppearanceMenu";
import { Icon } from "./components/rhythm/RhythmAtoms";
import LandingPage from "./components/LandingPage";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./hooks/useTheme";
import { createApi, endpoints } from "./services/api";
import useCompletions from "./hooks/useCompletions";
import useActivities from "./hooks/useActivities";
import useStickyNotes from "./hooks/useStickyNotes";
import useBooksSummary from "./hooks/useBooksSummary";
import useQazaNamaz from "./hooks/useQazaNamaz";
import useExpenses from "./hooks/useExpenses";
import { apiFetch } from "./utils/apiFetch";

const STICKY_COLORS = [
  "var(--sticky-yellow)", "var(--sticky-pink)", "var(--sticky-blue)",
  "var(--sticky-green)", "var(--sticky-lilac)", "var(--sticky-straw)", "var(--sticky-blush)",
];

const TABS = [
  { id: "dashboard",  label: "Dashboard" },
  { id: "notes",      label: "Notes" },
  { id: "qaza-namaz", label: "Qaza" },
  { id: "activities", label: "Activities" },
  { id: "expenses",   label: "Expenses" },
  { id: "favourites", label: "Favourites" },
  { id: "books",      label: "Books" },
];

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function App() {
  const { user, token, login, logout, refreshTokens, isAuthenticated, loading: authLoading, role, hiddenTabs, isOwner } = useAuth();
  const { theme, setTheme, colorFamily, setColorFamily } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState("login");
  const [previousMonthHasRoutines, setPreviousMonthHasRoutines] = useState(false);
  const [error, setError] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Build the shared API wrapper once auth is available
  const api = useMemo(() => {
    if (!token) return null;
    const auth = { token, refreshTokens, logout };
    return createApi(auth);
  }, [token, refreshTokens, logout]);

  // Legacy authFetch bridge for components that still use it directly
  const authFetch = useCallback(
    (url, options = {}) => apiFetch(url, options, { token, refreshTokens, logout }),
    [token, refreshTokens, logout]
  );

  // Data hooks
  const { activities, setActivities, reorder: reorderActivities, refetch: refetchActivities }
    = useActivities(api, currentYear, currentMonth);

  const {
    completions, summary, toggleCompletion, saveValue, saveNote, getData: getCompletionData,
  } = useCompletions(api, currentYear, currentMonth);

  const { notes: stickyNotes, addNote: addStickyNote, changeText: changeStickyNote,
    changeColor: stickyNoteColor, deleteNote: deleteStickyNote } = useStickyNotes(api, STICKY_COLORS);

  const { summary: booksSummary, favouriteNotes, refetch: refreshFavouriteNotes } = useBooksSummary(api);
  const { payload: qazaPayload, total: qazaTotal } = useQazaNamaz(api);
  const { rows: expenseRows, dashboard: expenseDashboard } = useExpenses(api, currentMonth, currentYear);

  const monthLabel = currentDate.toLocaleString("default", { month: "long" });
  const yearLabel = currentDate.getFullYear();

  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  }, []);

  const handleImportPreviousMonth = useCallback(async () => {
    try {
      const response = await authFetch(endpoints.activities.importPrevious(), { method: "POST", body: JSON.stringify({ year: currentYear, month: currentMonth }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to import"); }
      setPreviousMonthHasRoutines(true);
    } catch (err) {
      console.error("Error importing routines:", err);
      setError(err.message || "Failed to import previous routines");
    }
  }, [authFetch, currentYear, currentMonth]);

  const handleExportData = useCallback(async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"}/api/analytics/export?format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `activity-tracker-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      }
    } catch { /* best-effort */ }
  }, [authFetch]);

  // Computed props
  const greetParts = useMemo(() => {
    const todayDate = new Date();
    const h = todayDate.getHours();
    const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const raw = user?.name || user?.username || "there";
    return { greeting: `${g}, ${String(raw).split(" ")[0]}.`,
      dateLine: todayDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      weekday: todayDate.toLocaleDateString(undefined, { weekday: "long" }) };
  }, [user]);

  const monthNav = useMemo(() => ({ label: `${monthLabel} ${yearLabel}`, onPrev: handlePreviousMonth, onNext: handleNextMonth }), [monthLabel, yearLabel, handlePreviousMonth, handleNextMonth]);

  const todayDayForDash = useMemo(() => {
    const d = new Date(); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear ? d.getDate() : null;
  }, [currentMonth, currentYear]);

  const activitySummaryStats = useMemo(() => {
    const dim = new Date(currentYear, currentMonth, 0).getDate();
    let daysWith = 0, doneCells = 0, totalCells = dim * Math.max(1, activities.length);
    for (let d = 1; d <= dim; d++) {
      let any = false;
      for (const a of activities) {
        const c = completions[`${d}-${a.id}`];
        const done = typeof c === "object" && c !== null ? c.isCompleted : c === 1 || c === true;
        if (done) { any = true; doneCells++; }
      }
      if (any) daysWith++;
    }
    const avg = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;
    return [
      ["Days with activity", `${daysWith} / ${dim}`],
      ["Routine rows", String(activities.length)],
      ["Completion avg (month)", `${avg}%`],
      ["Qaza (est.)", qazaTotal != null ? String(qazaTotal) : "—"],
      ["Expenses total", expenseDashboard.totalFmt || "—"],
    ];
  }, [activities, completions, currentYear, currentMonth, qazaTotal, expenseDashboard.totalFmt]);

  // Auth-related handlers
  const handleAuthSuccess = useCallback((userData, authToken, remember) => login(userData, authToken, remember), [login]);
  const handleActivityAdded = useCallback((newActivity) => {
    if (newActivity?.id) setActivities(prev => [...prev, newActivity]);
    else refetchActivities();
  }, [setActivities, refetchActivities]);

  const handleActivityDeleted = useCallback((activityId) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
  }, [setActivities]);

  const handleActivityUpdated = useCallback((id, name) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, [setActivities]);

  // Loading / auth gates
  if (authLoading) return <Spinner />;

  if (!isAuthenticated) {
    if (showAuth) return <AuthPage onAuthSuccess={handleAuthSuccess} initialTab={authInitialTab} onBack={() => setShowAuth(false)} />;
    return (
      <LandingPage theme={theme} setTheme={setTheme} colorFamily={colorFamily} setColorFamily={setColorFamily}
        onGetStarted={() => { setAuthInitialTab("register"); setShowAuth(true); }}
        onLogin={() => { setAuthInitialTab("login"); setShowAuth(true); }} />
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
            {TABS.filter(t => !hiddenTabs.includes(t.id)).map(({ id, label }) => (
              <button key={id} type="button" className={`tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
                {label}
              </button>
            ))}
            {isOwner && (
              <button type="button" className={`tab tab--admin${activeTab === "admin" ? " active" : ""}`} onClick={() => setActiveTab("admin")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z"/></svg>
                Admin
              </button>
            )}
          </nav>
          <div className="topbar-right">
            <button type="button" className="icon-btn" title="Export CSV" aria-label="Export" onClick={handleExportData}>
              <Icon name="export" size={16} />
            </button>
            <ThemeAppearanceMenu theme={theme} setTheme={setTheme} colorFamily={colorFamily} setColorFamily={setColorFamily}
              buttonClassName="icon-btn icon-btn--theme" iconSize={16} />
            <ProfileDropdown user={user} onLogout={logout} onNavigateToProfile={() => setActiveTab("profile")} />
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div style={{ background: "var(--danger-weak)", color: "var(--danger)", padding: "12px 16px", borderRadius: "var(--r-md)", marginBottom: 20, fontSize: 13 }}>
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
            onToggleToday={toggleCompletion}
            onValueToday={saveValue}
            stickyNotes={stickyNotes}
            stickyColors={STICKY_COLORS}
            onAddSticky={addStickyNote}
            onStickyChange={changeStickyNote}
            onStickyColor={stickyNoteColor}
            onDeleteSticky={deleteStickyNote}
            booksSummary={booksSummary}
            expenseBars={expenseDashboard.bars}
            expenseTotalFormatted={expenseDashboard.totalFmt}
            qazaRemaining={qazaTotal}
            favouriteBookNotes={favouriteNotes}
            onOpenBooks={() => setActiveTab("books")}
            onOpenExpenses={() => setActiveTab("expenses")}
            setActiveTab={setActiveTab}
            onFavouriteNotesChanged={refreshFavouriteNotes}
          />
        )}

        {activeTab === "books" && <Books />}
        {activeTab === "notes" && <Notes />}
        {activeTab === "qaza-namaz" && <QazaNamaz />}
        {activeTab === "profile" && <Profile />}
        {activeTab === "expenses" && (
          <Expenses year={currentYear} month={currentMonth} onSelectMonthIndex={(m) => setCurrentDate(new Date(currentYear, m, 1))} />
        )}
        {activeTab === "favourites" && <FavouriteProfiles />}
        {activeTab === "admin" && isOwner && <AdminPanel api={api} currentUserId={user?.id} />}
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
            onToggleCompletion={toggleCompletion}
            onSaveNote={saveNote}
            onValueChange={saveValue}
            onActivityReorder={reorderActivities}
            previousMonthHasRoutines={previousMonthHasRoutines}
            onImportPreviousMonth={handleImportPreviousMonth}
            onActivityAdded={handleActivityAdded}
            onActivityDeleted={handleActivityDeleted}
            onActivityUpdated={handleActivityUpdated}
            authHeaders={() => ({ Authorization: `Bearer ${token}` })}
            summaryStats={activitySummaryStats}
          />
        )}
      </main>
    </div>
  );
}

export default App;

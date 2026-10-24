import { Suspense, lazy, useEffect, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./hooks/useTheme";
import { useApi } from "./lib/api";
import useMonth from "./lib/useMonth";
import { displayName } from "./lib/format";
import useNow from "./lib/useNow";
import { DOCK, go, useRoute } from "./shell/route";
import Orbit from "./shell/Orbit";
import { Empty, Skeleton } from "./components/ui";
import Auth from "./screens/Auth";
import Today from "./screens/Today";
import Activities from "./screens/Activities";
import Qaza from "./screens/Qaza";
import Notes from "./screens/Notes";
import Money from "./screens/Money";
import People from "./screens/People";
import Profile from "./screens/Profile";
import Admin from "./screens/Admin";

// react-pdf is heavy — load the Books screen on demand
const Books = lazy(() => import("./screens/Books"));

const AUTH_ROUTES = ["welcome", "login", "register"];

function App() {
  const { user, isAuthenticated, loading, logout, hiddenTabs, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { route, sub } = useRoute();
  const api = useApi();

  // Current month is shared by Today, the dock's "routines left" dot and Activities (when it shows this month).
  const now = useNow();
  const cur = useMonth(api, now.getFullYear(), now.getMonth() + 1);
  const d = now.getDate();
  const todayLeft = cur.activities.filter(a => !cur.comp[`${d}-${a.id}`]?.done).length;

  const items = useMemo(() => DOCK.filter(n => !hiddenTabs.includes(n.id) && (n.id !== "admin" || isAdmin)), [hiddenTabs, isAdmin]);
  const onAuthRoute = AUTH_ROUTES.includes(route);
  useEffect(() => { if (isAuthenticated && onAuthRoute) go("dashboard"); }, [isAuthenticated, onAuthRoute]);

  if (loading) return <div className="boot" aria-busy="true" aria-label="Loading"><i /></div>;

  if (!isAuthenticated) { const mode = onAuthRoute ? route : "welcome"; return <Auth key={mode} mode={mode} />; }
  if (onAuthRoute) return null;

  const known = DOCK.some(n => n.id === route);
  const r = known ? route : "dashboard";
  const blocked = hiddenTabs.includes(r) || (r === "admin" && !isAdmin);
  const name = displayName(user);
  const signOut = () => { logout(); go("welcome"); };

  const screens = {
    dashboard: () => <Today cur={cur} user={user} name={name} />,
    activities: () => <Activities cur={cur} sub={sub} />,
    "qaza-namaz": () => <Qaza />,
    notes: () => <Notes sub={sub} />,
    expenses: () => <Money sub={sub} />,
    favourites: () => <People sub={sub} />,
    books: () => <Suspense fallback={<Skeleton tiles={[["s8", 300], ["s4", 300], ["s12", 300]]} />}><Books sub={sub} /></Suspense>,
    profile: () => <Profile theme={theme} setTheme={setTheme} onSignOut={signOut} />,
    admin: () => <Admin />,
  };

  return (
    <Orbit route={r} items={items} user={user} name={name} theme={theme} setTheme={setTheme} onSignOut={signOut} todayLeft={todayLeft}>
      {blocked
        ? <Empty title="Not available" body="This tab is turned off for your account." action={<button type="button" className="btn primary" onClick={() => go("dashboard")}>Go to Today</button>} />
        : screens[r]()}
    </Orbit>
  );
}

export default App;

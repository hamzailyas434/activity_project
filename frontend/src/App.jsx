import { Suspense, lazy, useEffect, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./hooks/useTheme";
import { useDesign } from "./hooks/useDesign";
import { useApi } from "./lib/api";
import useMonth, { dayPct } from "./lib/useMonth";
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
import Shell2 from "./v2/Shell";
import Today2 from "./v2/Today";
import Activities2 from "./v2/Activities";
import Qaza2 from "./v2/Qaza";
import Notes2 from "./v2/Notes";
import Money2 from "./v2/Money";
import People2 from "./v2/People";

// react-pdf is heavy — load the Books screen on demand
const Books = lazy(() => import("./screens/Books"));
const Books2 = lazy(() => import("./v2/Books"));

const AUTH_ROUTES = ["welcome", "login", "register"];

function App() {
  const { user, isAuthenticated, loading, logout, hiddenTabs, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { design, setDesign } = useDesign(isAuthenticated);
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

  if (!isAuthenticated) { const mode = onAuthRoute ? route : "welcome"; return <Auth key={mode} mode={mode} theme={theme} setTheme={setTheme} />; }
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
    profile: () => <Profile theme={theme} setTheme={setTheme} design={design} setDesign={setDesign} onSignOut={signOut} />,
    admin: () => <Admin />,
  };

  // v2 (Ink sidebar) screens; anything not ported yet falls back to its v3 screen inside the v2 shell
  const screens2 = {
    dashboard: () => <Today2 cur={cur} name={name} />,
    activities: () => <Activities2 cur={cur} sub={sub} />,
    "qaza-namaz": () => <Qaza2 />,
    notes: () => <Notes2 sub={sub} />,
    expenses: () => <Money2 sub={sub} />,
    favourites: () => <People2 sub={sub} />,
    books: () => <Suspense fallback={<Skeleton tiles={[["s12", 220], ["s12", 300]]} />}><Books2 sub={sub} /></Suspense>,
  };
  const body = (sc) => (
    <>
      {!!user?.is_demo && (
        <div className="demo-bar" role="status">
          <b>Demo account</b><span>Look around and change anything — it all resets every 24 hours.</span>
          <button type="button" className="btn sm" onClick={() => { logout(); go("register"); }}>Create your own</button>
        </div>
      )}
      {blocked
        ? <Empty title="Not available" body="This tab is turned off for your account." action={<button type="button" className="btn primary" onClick={() => go("dashboard")}>Go to Today</button>} />
        : sc[r] ? sc[r]() : screens[r]()}
    </>
  );

  if (design === "v2") return (
    <Shell2 route={r} items={items} user={user} name={name} theme={theme} setTheme={setTheme} onSignOut={signOut} todayPct={Math.round(dayPct(cur.activities, cur.comp, d) * 100)}>
      {body(screens2)}
    </Shell2>
  );
  return (
    <Orbit route={r} items={items} user={user} name={name} theme={theme} setTheme={setTheme} onSignOut={signOut} todayLeft={todayLeft}>
      {body({})}
    </Orbit>
  );
}

export default App;

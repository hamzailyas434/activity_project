import { useEffect, useState } from "react";
import { Avatar, Icon, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import CmdK from "../shell/CmdK";
import { NAV, go } from "../shell/route";

/* v2 shell: left rail (numbered nav, theme switch, CSV export, account), mobile bar + slide-in rail. */
export default function Shell({ route, items, user, name, theme, setTheme, onSignOut, todayPct, children }) {
  const api = useApi();
  const { toast } = useUI();
  const [open, setOpen] = useState(false), [cmd, setCmd] = useState(false);
  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(c => !c); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const track = items.filter(n => NAV.some(x => x.id === n.id));
  const nav = id => { go(id); setOpen(false); };
  const exportCSV = async () => {
    try {
      const res = await api.raw("/users/export.csv");
      if (!res.ok) throw new Error("Export failed. Try again.");
      const href = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = href; a.download = `rhythm-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      toast("Export ready");
    } catch (e) { toast(e.message, "err"); }
  };

  return (
    <div className="app">
      <div className="mobile-bar">
        <button type="button" className="btn icon ghost" aria-label="Open menu" onClick={() => setOpen(true)}><Icon n="menu" /></button>
        <a href="/dashboard" className="logo" style={{ padding: 0 }} onClick={e => { e.preventDefault(); nav("dashboard"); }}><b style={{ fontSize: 22 }}>RHYTHM</b><i /></a>
        <button type="button" className="btn icon ghost" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon n={theme === "dark" ? "sun" : "moon"} /></button>
      </div>
      {open && <div className="drawer-scrim" onClick={() => setOpen(false)} />}
      <nav className={"rail " + (open ? "open" : "")} aria-label="Primary">
        <a href="/dashboard" className="logo" onClick={e => { e.preventDefault(); nav("dashboard"); }}><b>RHYTHM</b><i /></a>
        <div className="nav-label">Track</div>
        {track.map((n, i) => (
          <button type="button" key={n.id} className={"nav-item " + (route === n.id ? "on" : "")} aria-current={route === n.id ? "page" : undefined} onClick={() => nav(n.id)}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span><span>{n.label}</span>{n.id === "dashboard" && <span className="tag">{todayPct}%</span>}
          </button>
        ))}
        <div className="nav-label">Account</div>
        <button type="button" className={"nav-item " + (route === "profile" ? "on" : "")} onClick={() => nav("profile")}><span className="n"><Icon n="user" s={13} /></span><span>Profile</span></button>
        {items.some(n => n.id === "admin") && <button type="button" className={"nav-item " + (route === "admin" ? "on" : "")} onClick={() => nav("admin")}><span className="n"><Icon n="shield" s={13} /></span><span>Admin</span><span className="tag">{user?.role}</span></button>}
        <button type="button" className="nav-item" onClick={onSignOut}><span className="n"><Icon n="logout" s={13} /></span><span>Sign out</span></button>
        <div className="rail-foot">
          <div className="row" style={{ padding: "0 4px" }}>
            <div className="seg" style={{ flex: 1 }}>
              <button type="button" className={theme === "dark" ? "on" : ""} style={{ flex: 1 }} onClick={() => setTheme("dark")}><Icon n="moon" s={13} />Dark</button>
              <button type="button" className={theme === "light" ? "on" : ""} style={{ flex: 1 }} onClick={() => setTheme("light")}><Icon n="sun" s={13} />Light</button>
            </div>
            <button type="button" className="btn icon sm" aria-label="Export CSV" title="Export CSV" onClick={exportCSV}><Icon n="export" s={14} /></button>
          </div>
          <button type="button" className="me" onClick={() => nav("profile")}>
            <Avatar name={name} src={user?.profile_picture || undefined} c={0} s={32} />
            <span style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>{name}</b><small>{user?.email || user?.username}</small></span>
          </button>
        </div>
      </nav>
      <main className="main" id="main" key={route}>{children}</main>
      {cmd && <CmdK items={items} onClose={() => setCmd(false)} theme={theme} setTheme={setTheme} />}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Avatar, Icon } from "../components/ui";
import CmdK from "./CmdK";
import { go } from "./route";

/* v3 shell: blurred top bar (brand, ⌘K pill, sign out, theme, avatar) + floating dock + command palette. */
export default function Orbit({ route, items, user, name, theme, setTheme, onSignOut, todayLeft, children }) {
  const [cmd, setCmd] = useState(false);
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(c => !c); }
      const el = document.activeElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el?.tagName) && !el?.isContentEditable && !document.querySelector(".scrim")) { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <header className="top">
        <div className="brand"><i /><span>Rhythm</span></div>
        <button type="button" className="cmd-btn" onClick={() => setCmd(true)}><Icon n="search" s={15} />Search or jump…<kbd>⌘K</kbd></button>
        <div className="top-r">
          <button type="button" className="btn ghost sm" onClick={onSignOut}><Icon n="logout" s={15} />Sign out</button>
          <button type="button" className="btn ghost icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon n={theme === "dark" ? "sun" : "moon"} /></button>
          <button type="button" aria-label="Profile" onClick={() => go("profile")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, borderRadius: "50%" }}>
            <Avatar name={name} src={user?.profile_picture || undefined} c={0} s={36} />
          </button>
        </div>
      </header>
      <main className="page" key={route}>{children}</main>
      <nav className="dock" aria-label="Main">
        {items.map(n => (
          <button type="button" key={n.id} className={route === n.id ? "on" : ""} aria-label={n.label} aria-current={route === n.id ? "page" : undefined} onClick={() => go(n.id)} title={n.label}>
            <Icon n={n.icon} s={18} /><span>{n.label}</span>
            {n.id === "dashboard" && todayLeft > 0 && route !== "dashboard" && <i className="dot" />}
          </button>
        ))}
      </nav>
      {cmd && <CmdK items={items} onClose={() => setCmd(false)} theme={theme} setTheme={setTheme} />}
    </>
  );
}

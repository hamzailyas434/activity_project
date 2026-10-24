import { Fragment, useEffect, useState } from "react";
import { Icon, Scrim } from "../components/ui";
import { useApi } from "../lib/api";
import { plain } from "../lib/format";
import { go } from "./route";

/* ⌘K / "/" palette: jump to a tab, create, toggle theme, search notes + people (live API). */
export default function CmdK({ items: navItems, onClose, theme, setTheme }) {
  const api = useApi();
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const [found, setFound] = useState({ q: "", notes: [], people: [] });
  const has = id => navItems.some(n => n.id === id);

  useEffect(() => {
    const term = q.trim();
    if (!api || term.length < 2) return;
    const t = setTimeout(async () => {
      const [notes, people] = await Promise.all([
        has("notes") ? api.get(`/notes?${new URLSearchParams({ search: term, limit: 8 })}`).catch(() => []) : [],
        has("favourites") ? api.get("/favourite-profiles").catch(() => []) : [],
      ]);
      const lc = term.toLowerCase();
      setFound({
        q: term,
        notes: (Array.isArray(notes) ? notes : []).slice(0, 8),
        people: (Array.isArray(people) ? people : []).filter(p => String(p.name || "").toLowerCase().includes(lc)).slice(0, 6),
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q, api]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = (() => {
    const nav = navItems.map(n => ({ g: "Go to", l: n.label, ic: n.icon, run: () => go(n.id) }));
    const act = [
      has("notes") && { g: "Create", l: "New note", ic: "notes", run: () => go("notes/new") },
      has("expenses") && { g: "Create", l: "Add expense", ic: "wallet", run: () => go("expenses/new") },
      has("activities") && { g: "Create", l: "Add routine", ic: "grid", run: () => go("activities/new") },
      has("favourites") && { g: "Create", l: "Add person", ic: "star", run: () => go("favourites/new") },
      has("notes") && { g: "Create", l: "Review notes (flashcards)", ic: "flame", run: () => go("notes/review") },
      { g: "Settings", l: theme === "dark" ? "Switch to light" : "Switch to dark", ic: theme === "dark" ? "sun" : "moon", run: () => setTheme(theme === "dark" ? "light" : "dark") },
    ].filter(Boolean);
    const term = q.trim().toLowerCase();
    if (!term) return [...nav, ...act];
    const live = found.q.toLowerCase() === term || term.length < 2 ? found : { notes: [], people: [] };
    const notes = live.notes.map(n => ({ g: "Notes", l: plain(n.question) || "Untitled note", ic: "notes", run: () => go("notes/" + n.id) }));
    const people = live.people.map(p => ({ g: "People", l: p.name, ic: "star", run: () => go("favourites/" + p.id) }));
    return [...nav, ...act].filter(x => x.l.toLowerCase().includes(term)).concat(notes, people).slice(0, 18);
  })();

  const sel = Math.min(i, Math.max(0, items.length - 1));
  const run = x => { onClose(); x.run(); };
  const key = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(items.length - 1, sel + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(0, sel - 1)); }
    if (e.key === "Enter" && items[sel]) run(items[sel]);
  };
  let last = "";
  return (
    <Scrim onClose={onClose} style={{ placeItems: "start center" }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-in"><Icon n="search" s={18} />
          <input autoFocus dir="auto" placeholder="Jump to, create, search notes or people…" value={q} onChange={e => { setQ(e.target.value); setI(0); }} onKeyDown={key}
            role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={items[sel] ? "cmdk-" + sel : undefined} />
          <kbd className="mono faint" style={{ fontSize: 10.5 }}>esc</kbd></div>
        <div className="cmdk-l" id="cmdk-list" role="listbox">
          {!items.length && <div className="empty" style={{ margin: 8 }}><p>Nothing matches “{q}”.</p></div>}
          {items.map((x, k) => {
            const h = x.g !== last; last = x.g;
            return (
              <Fragment key={k}>
                {h && <div className="cmdk-g">{x.g}</div>}
                <button type="button" id={"cmdk-" + k} role="option" aria-selected={k === sel} className={"cmdk-i" + (k === sel ? " on" : "")} onMouseEnter={() => setI(k)} onClick={() => run(x)}>
                  <Icon n={x.ic} s={16} /><span dir="auto" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.l}</span>{k === sel && <small>↵</small>}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </Scrim>
  );
}

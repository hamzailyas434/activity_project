import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../config";

const COLORS = [
  { id: "iris",    bg: "linear-gradient(145deg, var(--iris-400), var(--iris-600))" },
  { id: "teal",    bg: "linear-gradient(145deg, var(--teal-400), var(--teal-600))" },
  { id: "mineral", bg: "linear-gradient(145deg, var(--mineral-400), var(--mineral-600))" },
  { id: "ochre",   bg: "linear-gradient(145deg, var(--ochre-300), var(--ochre-500))" },
  { id: "dusk",    bg: "linear-gradient(145deg, var(--dusk-300), var(--dusk-500))" },
  { id: "fog",     bg: "linear-gradient(145deg, var(--fog-400), var(--fog-600))" },
];
const colorBg = id => (COLORS.find(c => c.id === id) || COLORS[0]).bg;
const RELATIONS = ["Family", "Spouse", "Parent", "Sibling", "Child", "Friend", "Colleague", "Other"];

const IcoEdit   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoTrash  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14"/></svg>;
const IcoX      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPlus   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
const IcoNote   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>;
const IcoGift   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
const IcoInfo   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8.01"/></svg>;
const IcoStar   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 3 7h7l-6 4 2 8-6-5-6 5 2-8-6-4h7z"/></svg>;

// ── Profile Card ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onOpen, onEdit, onDelete }) {
  const initial = (profile.name || "?").trim()[0].toUpperCase();
  const bg = colorBg(profile.color);
  return (
    <div className="fp-card" style={{ "--av-bg": bg }} onClick={onOpen}>
      <div className="fp-card-actions" onClick={e => e.stopPropagation()}>
        <button className="fp-icon-btn" title="Edit" onClick={onEdit}><IcoEdit /></button>
        <button className="fp-icon-btn fp-icon-btn-danger" title="Delete" onClick={onDelete}><IcoTrash /></button>
      </div>
      <div className="fp-card-top">
        <div className="fp-av" style={{ background: bg }}>{initial}</div>
        <div className="fp-name-block">
          <div className="fp-name">{profile.name}</div>
          <div className="fp-rel">{profile.relation || profile.category || "—"}</div>
        </div>
      </div>
      <div className="fp-card-stats">
        <span className="fp-stat"><IcoNote /> <span className="fp-stat-num">{profile.prefs_count ?? 0}</span> prefs</span>
        <span className="fp-stat-sep">·</span>
        <span className="fp-stat"><IcoGift /> <span className="fp-stat-num">{profile.gifts_count ?? 0}</span> gifts</span>
      </div>
    </div>
  );
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ profile, onSave, onClose, onDelete, authHeaders }) {
  const isNew = !profile.id;
  const [tab, setTab] = useState(isNew ? "edit" : profile._openTab || "prefs");

  // Preferences state
  const [prefs, setPrefs]           = useState([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [addingPref, setAddingPref] = useState(false);
  const [pName, setPName]           = useState("");
  const [pNotes, setPNotes]         = useState("");

  // Gifts state
  const [gifts, setGifts]           = useState([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [addingGift, setAddingGift] = useState(false);
  const [gName, setGName]           = useState("");
  const [gDate, setGDate]           = useState("");
  const [gAmount, setGAmount]       = useState("");

  // Edit state
  const [name, setName]       = useState(profile.name || "");
  const [relation, setRelation] = useState(profile.relation || profile.category || "Friend");
  const [color, setColor]     = useState(profile.color || "iris");
  const [bday, setBday]       = useState(profile.bday ? profile.bday.split("T")[0] : "");
  const [phone, setPhone]     = useState(profile.phone || "");
  const [notes, setNotes]     = useState(profile.notes || "");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (isNew) return;
    setLoadingPrefs(true);
    fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/categories`, { headers: authHeaders })
      .then(r => r.json()).then(d => setPrefs(Array.isArray(d) ? d : [])).catch(() => {})
      .finally(() => setLoadingPrefs(false));
    setLoadingGifts(true);
    fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/records`, { headers: authHeaders })
      .then(r => r.json()).then(d => setGifts(Array.isArray(d) ? d : [])).catch(() => setGifts([]))
      .finally(() => setLoadingGifts(false));
  }, [profile.id]); // eslint-disable-line

  // Sync counts back to the card on any close path (Cancel / Done / Esc / scrim click)
  const handleClose = () => {
    if (!isNew) {
      onSave({ ...profile, prefs_count: prefs.length, gifts_count: gifts.length });
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const h = e => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, []); // eslint-disable-line

  const addPref = async () => {
    if (!pName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/categories`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ category: pName.trim(), notes: pNotes.trim(), sort_order: prefs.length }),
      });
      const saved = await res.json();
      setPrefs(prev => [...prev, saved]);
      setPName(""); setPNotes(""); setAddingPref(false);
    } catch { /* ignore */ }
  };

  const delPref = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/favourite-profiles/categories/${id}`, { method: "DELETE", headers: authHeaders });
      setPrefs(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  };

  const addGift = async () => {
    if (!gName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/records`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ gift_item: gName.trim(), gift_date: gDate || null, amount: gAmount || 0, note: "" }),
      });
      if (!res.ok) return;
      const saved = await res.json();
      setGifts(prev => [saved, ...prev]);
      setGName(""); setGDate(""); setGAmount(""); setAddingGift(false);
    } catch { /* ignore */ }
  };

  const delGift = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/favourite-profiles/records/${id}`, { method: "DELETE", headers: authHeaders });
      setGifts(prev => prev.filter(g => g.id !== id));
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch(`${API_BASE_URL}/favourite-profiles`, {
          method: "POST", headers: authHeaders,
          body: JSON.stringify({ name: name.trim(), relation, color, bday: bday || null, phone, notes }),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await res.json();
        onSave(created);
      } else {
        const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}`, {
          method: "PUT", headers: authHeaders,
          body: JSON.stringify({ name: name.trim(), relation, color, bday: bday || null, phone, notes }),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        onSave({ ...updated, prefs_count: prefs.length, gifts_count: gifts.length });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const fmt = d => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }); }
    catch { return "—"; }
  };
  const fmtFull = d => {
    if (!d) return "Not set";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return d; }
  };
  const fmtAmt = n => Number(n || 0).toLocaleString("en-PK");

  // Always use live state so the hero preview updates as the user types / picks color
  const headerInitial = (name || "?")[0]?.toUpperCase() || "?";
  const headerName  = name || "New profile";
  const headerRel   = relation;
  const headerColor = color;

  return (
    <div className="fp-scrim" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="fp-modal" style={{ "--av-bg": colorBg(headerColor) }}>

        {/* Hero */}
        <div className="fp-modal-hero">
          <div className="fp-modal-hero-row">
            <div className="fp-modal-av" style={{ background: colorBg(headerColor) }}>{headerInitial}</div>
            <div className="fp-modal-title-block">
              <div className="fp-modal-title">{headerName}</div>
              <div className="fp-modal-meta">
                <span className="fp-modal-pill">{headerRel || "—"}</span>
                {!isNew && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>
                    {prefs.length} prefs · {gifts.length} gifts
                  </span>
                )}
              </div>
            </div>
            <div className="fp-modal-actions">
              <button className="fp-modal-close" onClick={handleClose} title="Close"><IcoX /></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {!isNew && (
          <div className="fp-modal-tabs">
            <button className={`fp-m-tab${tab === "prefs" ? " active" : ""}`} onClick={() => setTab("prefs")}>
              <IcoNote /> Preferences <span className="fp-tab-count">{prefs.length}</span>
            </button>
            <button className={`fp-m-tab${tab === "gifts" ? " active" : ""}`} onClick={() => setTab("gifts")}>
              <IcoGift /> Gifts <span className="fp-tab-count">{gifts.length}</span>
            </button>
            <button className={`fp-m-tab${tab === "details" ? " active" : ""}`} onClick={() => setTab("details")}>
              <IcoInfo /> Details
            </button>
            <button className={`fp-m-tab${tab === "edit" ? " active" : ""}`} onClick={() => setTab("edit")}>
              <IcoEdit /> Edit
            </button>
          </div>
        )}

        {/* Body */}
        <div className="fp-modal-body">

          {/* PREFERENCES TAB */}
          {!isNew && tab === "prefs" && (
            loadingPrefs
              ? <div className="fp-empty"><div className="fp-em-text">Loading…</div></div>
              : <>
                  {prefs.length === 0 && !addingPref && (
                    <div className="fp-empty">
                      <div className="fp-em-icon">🗒️</div>
                      <div className="fp-em-text">No preferences yet</div>
                      <div className="fp-em-hint">Track what {profile.name} likes — clothing sizes, books, brands…</div>
                    </div>
                  )}
                  {prefs.length > 0 && (
                    <table className="fp-tbl">
                      <thead>
                        <tr>
                          <th className="fp-c-name">Category</th>
                          <th className="fp-c-notes">Notes</th>
                          <th className="fp-c-act"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {prefs.map(p => (
                          <tr key={p.id}>
                            <td className="fp-c-name">{p.category}</td>
                            <td className="fp-c-notes">{p.notes || "—"}</td>
                            <td className="fp-c-act">
                              <button className="fp-row-del" onClick={() => delPref(p.id)}><IcoTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {addingPref ? (
                    <div className="fp-add-inline fp-add-pref">
                      <input className="fp-add-input" placeholder="Category — Shoes, Books…" value={pName}
                        onChange={e => setPName(e.target.value)} autoFocus
                        onKeyDown={e => e.key === "Enter" && addPref()} />
                      <input className="fp-add-input" placeholder="Notes — size, color, link…" value={pNotes}
                        onChange={e => setPNotes(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addPref()} />
                      <button className="fp-cancel-sm" onClick={() => { setAddingPref(false); setPName(""); setPNotes(""); }}>Cancel</button>
                      <button className="fp-add-sm" onClick={addPref}>Add</button>
                    </div>
                  ) : (
                    <button className="fp-add-cta" onClick={() => setAddingPref(true)}><IcoPlus /> Add preference</button>
                  )}
                </>
          )}

          {/* GIFTS TAB */}
          {!isNew && tab === "gifts" && (
            loadingGifts
              ? <div className="fp-empty"><div className="fp-em-text">Loading…</div></div>
              : <>
                  {gifts.length === 0 && !addingGift && (
                    <div className="fp-empty">
                      <div className="fp-em-icon">🎁</div>
                      <div className="fp-em-text">No gifts logged yet</div>
                      <div className="fp-em-hint">Track what you gave — handy for remembering and budgeting.</div>
                    </div>
                  )}
                  {gifts.length > 0 && (
                    <div className="fp-gift-list">
                      {gifts.map(gi => (
                        <div className="fp-gift-row" key={gi.id}>
                          <span className="fp-gift-name">{gi.gift_item || "—"}</span>
                          <span className="fp-gift-date">{fmt(gi.gift_date)}</span>
                          <span className="fp-gift-amt">PKR {fmtAmt(gi.amount)}</span>
                          <button className="fp-row-del" onClick={() => delGift(gi.id)}><IcoTrash /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {addingGift ? (
                    <div className="fp-add-inline fp-add-gift">
                      <input className="fp-add-input" placeholder="Gift name" value={gName}
                        onChange={e => setGName(e.target.value)} autoFocus />
                      <input className="fp-add-input" type="date" value={gDate}
                        onChange={e => setGDate(e.target.value)} />
                      <input className="fp-add-input" placeholder="PKR amount" value={gAmount}
                        onChange={e => setGAmount(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addGift()} />
                      <button className="fp-cancel-sm" onClick={() => { setAddingGift(false); setGName(""); setGDate(""); setGAmount(""); }}>Cancel</button>
                      <button className="fp-add-sm" onClick={addGift}>Add</button>
                    </div>
                  ) : (
                    <button className="fp-add-cta" onClick={() => setAddingGift(true)}><IcoPlus /> Log a gift</button>
                  )}
                </>
          )}

          {/* DETAILS TAB */}
          {!isNew && tab === "details" && (
            <div className="fp-details-grid">
              <div className="fp-det-cell">
                <div className="fp-det-label">Relation</div>
                <div className="fp-det-val">{relation || "—"}</div>
              </div>
              <div className="fp-det-cell">
                <div className="fp-det-label">Birthday</div>
                <div className={`fp-det-val${bday ? "" : " muted"}`}>{fmtFull(bday)}</div>
              </div>
              <div className="fp-det-cell">
                <div className="fp-det-label">Phone</div>
                <div className={`fp-det-val${phone ? "" : " muted"}`}>{phone || "Not set"}</div>
              </div>
              <div className="fp-det-cell">
                <div className="fp-det-label">Profile color</div>
                <div className="fp-det-val" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", background: colorBg(color), display: "inline-block" }} />
                  {color || "iris"}
                </div>
              </div>
              {notes && (
                <div className="fp-det-notes">
                  <div className="fp-det-label">Private notes</div>
                  <div className="fp-det-notes-body">{notes}</div>
                </div>
              )}
            </div>
          )}

          {/* EDIT / NEW TAB */}
          {(isNew || tab === "edit") && (
            <div className="fp-edit-grid">
              <div className="fp-fld">
                <div className="fp-fld-label">Name</div>
                <input className="fp-fi" placeholder="e.g. Wife, Ahmed, Mother…" value={name}
                  onChange={e => setName(e.target.value)} autoFocus={isNew} />
              </div>
              <div className="fp-edit-row">
                <div className="fp-fld">
                  <div className="fp-fld-label">Relation</div>
                  <select className="fp-fi fp-fi-sel" value={relation} onChange={e => setRelation(e.target.value)}>
                    {RELATIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="fp-fld">
                  <div className="fp-fld-label">Birthday</div>
                  <input className="fp-fi" type="date" value={bday} onChange={e => setBday(e.target.value)} />
                </div>
              </div>
              <div className="fp-fld">
                <div className="fp-fld-label">Phone (optional)</div>
                <input className="fp-fi" placeholder="+92 …" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="fp-fld">
                <div className="fp-fld-label">Avatar color</div>
                <div className="fp-color-swatches">
                  {COLORS.map(c => (
                    <button key={c.id} className={`fp-color-sw${color === c.id ? " on" : ""}`}
                      style={{ background: c.bg }} onClick={() => setColor(c.id)} />
                  ))}
                </div>
              </div>
              <div className="fp-fld">
                <div className="fp-fld-label">Private notes</div>
                <textarea className="fp-fi" rows="4"
                  placeholder="Anything to remember — favourite cuisine, allergies, dislikes…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ resize: "vertical", minHeight: 80, lineHeight: 1.55 }} />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="fp-modal-foot">
          <div className="fp-foot-left">
            {isNew ? "Add preferences & gifts after saving." : <><kbd>Esc</kbd> to close</>}
          </div>
          <div className="fp-foot-right">
            {!isNew && tab !== "edit" && (
              <button className="fp-btn-delete" onClick={async () => {
                const r = await Swal.fire({
                  title: `Delete ${profile.name}?`,
                  text: "All data will be permanently deleted.",
                  icon: "warning", showCancelButton: true,
                  confirmButtonColor: "#dc2626", confirmButtonText: "Delete",
                });
                if (r.isConfirmed) onDelete(profile.id);
              }}>
                <IcoTrash /> Delete
              </button>
            )}
            <button className="fp-btn-cancel" onClick={handleClose}>Cancel</button>
            {(isNew || tab === "edit") && (
              <button className="fp-btn-save" disabled={!name.trim() || saving} onClick={handleSave}>
                {isNew ? "✦ Create profile" : "Save changes"}
              </button>
            )}
            {!isNew && tab !== "edit" && (
              <button className="fp-btn-save" onClick={handleClose}>Done</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FavouriteProfiles() {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [profiles, setProfiles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [openProfile, setOpenProfile] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/favourite-profiles`, { headers: authHeaders })
      .then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : [])).catch(() => {})
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line

  const handleSave = (saved) => {
    setProfiles(prev => {
      const exists = prev.some(p => p.id === saved.id);
      return exists ? prev.map(p => p.id === saved.id ? { ...p, ...saved } : p) : [...prev, saved];
    });
    setOpenProfile(null);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/favourite-profiles/${id}`, { method: "DELETE", headers: authHeaders });
      setProfiles(prev => prev.filter(p => p.id !== id));
      setOpenProfile(null);
    } catch {
      Swal.fire({ icon: "error", title: "Delete failed" });
    }
  };

  const visible = profiles.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.relation || p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fp-page">
      {/* Page head */}
      <div className="fp-page-head">
        <div>
          <div className="fp-eyebrow">Favourites</div>
          <div className="fp-h1"><span className="fp-star"><IcoStar /></span>Favourite people</div>
          <div className="fp-sub">Store preferences, gift records, and notes about people who matter.</div>
        </div>
        <div className="fp-head-actions">
          <div className="fp-search-wrap">
            <span className="fp-si"><IcoSearch /></span>
            <input className="fp-search-input" placeholder="Search by name or relation…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="fp-btn-new" onClick={() => setOpenProfile({})}>
            <IcoPlus /> New profile
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="fp-loading">Loading profiles…</div>
      ) : (
        <div className="fp-grid">
          {visible.length === 0 && (
            <div className="fp-empty-grid">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" style={{ opacity: .3, marginBottom: 14 }}>
                <circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>
              </svg>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)", marginBottom: 6, letterSpacing: "-.01em" }}>
                {search ? "No matching profiles" : "No profiles yet"}
              </div>
              <div style={{ fontSize: 12.5 }}>
                {search ? "Try a different search, or create a new profile." : "Click + New profile to get started."}
              </div>
            </div>
          )}
          {visible.map(p => (
            <ProfileCard
              key={p.id}
              profile={p}
              onOpen={() => setOpenProfile(p)}
              onEdit={() => setOpenProfile({ ...p, _openTab: "edit" })}
              onDelete={() => {
                Swal.fire({
                  title: `Delete ${p.name}?`, text: "All data will be permanently deleted.",
                  icon: "warning", showCancelButton: true,
                  confirmButtonColor: "#dc2626", confirmButtonText: "Delete",
                }).then(r => r.isConfirmed && handleDelete(p.id));
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {openProfile && (
        <ProfileModal
          key={(openProfile.id || "new") + (openProfile._openTab || "")}
          profile={openProfile}
          onSave={handleSave}
          onClose={() => setOpenProfile(null)}
          onDelete={handleDelete}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
}

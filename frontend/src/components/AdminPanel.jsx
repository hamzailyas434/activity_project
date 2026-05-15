import { useState, useEffect, useCallback } from "react";
import { endpoints } from "../services/api";

const ALL_TABS = [
  { id: "dashboard",  name: "Dashboard",  icon: "📊", desc: "Main overview screen" },
  { id: "notes",      name: "Notes",      icon: "📝", desc: "Q&A and note taking" },
  { id: "qaza-namaz", name: "Qaza",       icon: "🕌", desc: "Prayer make-up tracker" },
  { id: "activities", name: "Activities", icon: "✓",  desc: "Daily habits & matrix" },
  { id: "expenses",   name: "Expenses",   icon: "💰", desc: "Budget & spending" },
  { id: "favourites", name: "Favourites", icon: "⭐", desc: "People & preferences" },
  { id: "books",      name: "Books",      icon: "📚", desc: "Reader & library" },
];
const ALL_TAB_IDS = ALL_TABS.map(t => t.id);
const DEFAULT_HIDDEN = ["books"];

const COLORS = ["iris", "teal", "mineral", "ochre", "dusk", "fog"];
const avatarBg = (color) => ({
  iris:    "linear-gradient(145deg,#818cf8,#4f46e5)",
  teal:    "linear-gradient(145deg,#2dd4bf,#0d9488)",
  mineral: "linear-gradient(145deg,#34d399,#059669)",
  ochre:   "linear-gradient(145deg,#fcd34d,#d97706)",
  dusk:    "linear-gradient(145deg,#c084fc,#9333ea)",
  fog:     "linear-gradient(145deg,#94a3b8,#64748b)",
}[color] || "linear-gradient(145deg,#818cf8,#4f46e5)");

const avatarColor = (id) => COLORS[((id - 1) % COLORS.length)];

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z"/>
  </svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);
const SwapIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m5 12 5 5L20 7"/>
  </svg>
);
const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8.01"/>
  </svg>
);
const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17.01"/>
  </svg>
);
const CrownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 20h18l-1.5-9-4.5 3-3-6-3 6-4.5-3z"/>
  </svg>
);
const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>
  </svg>
);

// ── Tab Modal ─────────────────────────────────────────────────────────────────
function TabModal({ user, onSave, onClose, saving, saveError }) {
  const hiddenSet = new Set(user.hidden_tabs || []);
  const [tabs, setTabs] = useState(() => {
    const visible = new Set(ALL_TAB_IDS.filter(id => !hiddenSet.has(id)));
    return visible;
  });

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  const toggle = (id) => setTabs(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const handleSave = () => {
    const hidden = ALL_TAB_IDS.filter(id => !tabs.has(id));
    onSave(hidden);
  };

  const initial = (user.username || "?")[0].toUpperCase();
  const color = avatarColor(user.id);

  return (
    <div className="ap-scrim" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal-hero">
          <div className="ap-modal-av" style={{ background: avatarBg(color) }}>{initial}</div>
          <div className="ap-modal-title-block">
            <div className="ap-modal-title">{user.username}</div>
            <div className="ap-modal-sub">{user.email || "—"}</div>
          </div>
          <button className="ap-modal-close" onClick={onClose}><XIcon /></button>
        </div>

        <div className="ap-modal-body">
          <div className="ap-notice">
            <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}><InfoIcon /></span>
            <span>Control which tabs <strong>{user.username}</strong> can see. Changes apply on their next page refresh.</span>
          </div>

          <div className="ap-section-title">
            <span>Tab access control</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)", textTransform: "none", letterSpacing: ".04em" }}>
              {tabs.size} / {ALL_TABS.length} enabled
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 0 14px" }}>
            <button className="ap-bulk-btn" onClick={() => setTabs(new Set(ALL_TAB_IDS))}>All on</button>
            <button className="ap-bulk-btn" onClick={() => setTabs(new Set(ALL_TAB_IDS.filter(id => !DEFAULT_HIDDEN.includes(id))))}>Defaults</button>
            <button className="ap-bulk-btn" onClick={() => setTabs(new Set())}>All off</button>
          </div>

          <div className="ap-tab-toggles">
            {ALL_TABS.map(t => {
              const on = tabs.has(t.id);
              return (
                <button key={t.id} className={`ap-tab-toggle${on ? " on" : ""}`} onClick={() => toggle(t.id)}>
                  <div className="ap-tt-check"><CheckIcon /></div>
                  <span className="ap-tt-icon">{t.icon}</span>
                  <div className="ap-tt-body">
                    <div className="ap-tt-name">{t.name}</div>
                    <div className="ap-tt-desc">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ap-modal-foot">
          <div style={{ fontSize: 11, color: saveError ? "var(--danger)" : "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            {saveError ? saveError : <><kbd className="ap-kbd">Esc</kbd> to close</>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ap-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="ap-btn-save" onClick={handleSave} disabled={saving}>
              <CheckIcon /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Role Modal ────────────────────────────────────────────────────────────────
function RoleModal({ user, onConfirm, onClose, saving }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  const promoting = user.role === "user";
  const newRole = promoting ? "admin" : "user";
  const initial = (user.username || "?")[0].toUpperCase();
  const color = avatarColor(user.id);

  return (
    <div className="ap-scrim" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal-hero">
          <div className="ap-modal-av" style={{ background: avatarBg(color) }}>{initial}</div>
          <div className="ap-modal-title-block">
            <div className="ap-modal-title">{promoting ? "Make admin" : "Revoke admin"}</div>
            <div className="ap-modal-sub">{user.username} · {user.email || "—"}</div>
          </div>
          <button className="ap-modal-close" onClick={onClose}><XIcon /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div className={`ap-role-warn ${promoting ? "promote" : "demote"}`}>
            <span style={{ flexShrink: 0, marginTop: 1 }}><WarnIcon /></span>
            <span>
              {promoting ? (
                <><strong>{user.username}</strong> will become <strong>admin</strong> — they can be managed by you but cannot access the Admin tab.</>
              ) : (
                <>Revoking admin from <strong>{user.username}</strong> resets their permissions to standard user.</>
              )}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.6 }}>
            <p>Role will change from <code className="ap-code">{user.role}</code> to <code className="ap-code">{newRole}</code>. Takes effect immediately.</p>
          </div>
        </div>

        <div className="ap-modal-foot">
          <div style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <kbd className="ap-kbd">Esc</kbd> to cancel
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ap-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className={promoting ? "ap-btn-warn" : "ap-btn-danger"}
              onClick={() => onConfirm(newRole)}
              disabled={saving}
            >
              {promoting ? <><CrownIcon /> Confirm — make admin</> : <><UserIcon /> Confirm — revoke admin</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose, saving, saveError }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  const initial = (user.username || "?")[0].toUpperCase();
  const color = avatarColor(user.id);

  return (
    <div className="ap-scrim" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal-hero">
          <div className="ap-modal-av" style={{ background: avatarBg(color) }}>{initial}</div>
          <div className="ap-modal-title-block">
            <div className="ap-modal-title">Delete user</div>
            <div className="ap-modal-sub">{user.username} · {user.email || "—"}</div>
          </div>
          <button className="ap-modal-close" onClick={onClose}><XIcon /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div className="ap-role-warn demote">
            <span style={{ flexShrink: 0, marginTop: 1 }}><WarnIcon /></span>
            <span>
              This will permanently delete <strong>{user.username}</strong> and all their data. This action <strong>cannot be undone</strong>.
            </span>
          </div>
        </div>

        <div className="ap-modal-foot">
          <div style={{ fontSize: 11, color: saveError ? "var(--danger)" : "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            {saveError ? saveError : <><kbd className="ap-kbd">Esc</kbd> to cancel</>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ap-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="ap-btn-danger" onClick={onConfirm} disabled={saving}>
              <TrashIcon /> {saving ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
export default function AdminPanel({ api, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabModal, setTabModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const perPage = 20;

  const fetchUsers = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.get(endpoints.admin.users(search, page));
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [api, search, page]);

  const fetchStats = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.get(endpoints.admin.stats());
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
  }, [api]);

  useEffect(() => { fetchUsers(); fetchStats(); }, [fetchUsers, fetchStats]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const filteredUsers = users.filter(u => {
    if (roleFilter === "admins") return u.role === "admin" || u.role === "owner";
    if (roleFilter === "users") return u.role === "user";
    return true;
  });

  const handleSaveTabs = async (hiddenTabs) => {
    if (!tabModal) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(endpoints.admin.updateTabs(tabModal.id), { hidden_tabs: hiddenTabs });
      if (res.ok) {
        setUsers(us => us.map(u => u.id === tabModal.id ? { ...u, hidden_tabs: hiddenTabs } : u));
        setTabModal(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Failed to save tabs. Try again.");
      }
    } catch (e) { console.error(e); setSaveError("Network error. Try again."); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      const res = await api.delete(endpoints.admin.deleteUser(deleteModal.id));
      if (res.ok) {
        setUsers(us => us.filter(u => u.id !== deleteModal.id));
        fetchStats();
        setDeleteModal(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Failed to delete user.");
      }
    } catch { setSaveError("Network error. Try again."); }
    finally { setSaving(false); }
  };

  const handleConfirmRole = async (newRole) => {
    if (!roleModal) return;
    setSaving(true);
    try {
      const res = await api.put(endpoints.admin.updateRole(roleModal.id), { role: newRole });
      if (res.ok) {
        setUsers(us => us.map(u => u.id === roleModal.id ? { ...u, role: newRole } : u));
        fetchStats();
        setRoleModal(null);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const adminCount = stats?.admins ?? users.filter(u => u.role === "admin" || u.role === "owner").length;
  const userCount = stats?.users ?? users.filter(u => u.role === "user").length;

  return (
    <>
      <style>{`
        .ap-page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:24px;flex-wrap:wrap}
        .ap-eyebrow{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:6px;display:inline-flex;align-items:center;gap:6px}
        .ap-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--accent)}
        .ap-h1{font-family:var(--font-display,inherit);font-size:28px;font-weight:600;letter-spacing:-.025em;line-height:1.1;display:flex;align-items:center;gap:10px;color:var(--fg)}
        .ap-sub{font-size:12.5px;color:var(--fg-muted,#888);margin-top:6px}
        .ap-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
        @media(max-width:640px){.ap-stats{grid-template-columns:repeat(2,1fr)}}
        .ap-stat-card{background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);border-radius:11px;padding:14px 16px}
        .ap-stat-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-muted,#888);margin-bottom:6px}
        .ap-stat-val{font-family:var(--font-mono,monospace);font-size:22px;font-weight:600;color:var(--fg)}
        .ap-stat-sub{font-size:11px;color:var(--fg-muted,#888);margin-top:3px}
        .ap-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
        .ap-search-wrap{position:relative;flex:1;max-width:340px}
        .ap-search-wrap input{width:100%;padding:9px 12px 9px 34px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);border-radius:9px;color:var(--fg);font-family:inherit;font-size:12.5px;outline:none;transition:border-color 120ms}
        .ap-search-wrap input:focus{border-color:var(--accent)}
        .ap-search-wrap input::placeholder{color:var(--fg-muted,#888)}
        .ap-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--fg-muted,#888);pointer-events:none}
        .ap-chips{display:flex;gap:4px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);padding:3px;border-radius:9px}
        .ap-chip{padding:6px 11px;border:none;background:transparent;color:var(--fg-muted,#888);border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all 120ms}
        .ap-chip:hover{color:var(--fg)}
        .ap-chip.active{background:var(--bg,#12121a);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.2)}
        .ap-chip-count{font-family:var(--font-mono,monospace);font-size:10.5px;color:var(--fg-muted,#888);padding:1px 6px;background:rgba(0,0,0,.2);border-radius:99px}
        .ap-chip.active .ap-chip-count{background:color-mix(in oklab,var(--accent) 18%,transparent);color:var(--accent)}
        .ap-table-card{background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.15)}
        .ap-table-scroll{overflow-x:auto}
        .ap-table{width:100%;border-collapse:collapse;font-size:13px}
        .ap-table thead{background:var(--bg,#12121a)}
        .ap-table thead th{padding:11px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-muted,#888);border-bottom:1px solid var(--border,#333);white-space:nowrap}
        .ap-table thead th:last-child{text-align:right}
        .ap-table tbody td{padding:12px 14px;border-bottom:1px solid var(--border-faint,rgba(255,255,255,.06));vertical-align:middle}
        .ap-table tbody tr:last-child td{border-bottom:none}
        .ap-table tbody tr:hover{background:rgba(255,255,255,.03)}
        .ap-user-cell{display:flex;align-items:center;gap:10px;min-width:160px}
        .ap-av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
        .ap-uname{font-weight:500;color:var(--fg);white-space:nowrap}
        .ap-uemail{font-size:12px;color:var(--fg-muted,#888);white-space:nowrap}
        .ap-role-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
        .ap-role-badge.user{background:rgba(20,184,166,.12);color:#2dd4bf}
        .ap-role-badge.admin{background:rgba(245,158,11,.12);color:#fcd34d}
        .ap-role-badge.owner{background:rgba(129,140,248,.12);color:#a5b4fc}
        .ap-role-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
        .ap-tabs-bar{display:flex;gap:2px;width:80px}
        .ap-tabs-bar-cell{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.08)}
        .ap-tabs-bar-cell.on{background:var(--accent)}
        .ap-joined{font-family:var(--font-mono,monospace);font-size:12px;color:var(--fg-muted,#888);white-space:nowrap}
        .ap-status{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--fg-muted,#888);white-space:nowrap}
        .ap-status-dot{width:6px;height:6px;border-radius:50%;background:var(--fg-muted,#888)}
        .ap-status-dot.online{background:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,.2)}
        .ap-act-row{display:flex;gap:5px;justify-content:flex-end}
        .ap-act-btn{padding:5px 10px;background:var(--bg,#12121a);border:1px solid var(--border,#333);color:var(--fg-muted,#888);border-radius:7px;font-family:inherit;font-size:11.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;transition:all 120ms}
        .ap-act-btn:hover{color:var(--fg);border-color:rgba(255,255,255,.25)}
        .ap-act-btn.primary:hover{border-color:var(--accent);color:var(--accent)}
        .ap-act-btn.warn:hover{border-color:#f59e0b;color:#fcd34d;background:rgba(245,158,11,.08)}
        .ap-act-btn.danger:hover{border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,.08)}
        .ap-table-foot{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-top:1px solid var(--border,#333);background:rgba(0,0,0,.15)}
        .ap-foot-info{font-size:11.5px;color:var(--fg-muted,#888);font-family:var(--font-mono,monospace)}
        .ap-pager{display:flex;gap:4px}
        .ap-pg-btn{width:28px;height:28px;border-radius:6px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);color:var(--fg-muted,#888);cursor:pointer;display:grid;place-items:center;font-family:var(--font-mono,monospace);font-size:11.5px;transition:all 120ms}
        .ap-pg-btn:hover:not(:disabled){background:rgba(255,255,255,.06);color:var(--fg)}
        .ap-pg-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
        .ap-pg-btn:disabled{opacity:.4;cursor:default}
        /* Modal */
        .ap-scrim{position:fixed;inset:0;z-index:200;background:rgba(6,8,12,.65);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px;animation:ap-fade 200ms}
        @keyframes ap-fade{from{opacity:0}to{opacity:1}}
        .ap-modal{background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);border-radius:16px;width:min(540px,100%);max-height:calc(100vh - 48px);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 32px 64px -20px rgba(0,0,0,.7);animation:ap-rise 220ms ease}
        @keyframes ap-rise{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
        .ap-modal-hero{padding:18px 22px 16px;border-bottom:1px solid var(--border,#333);display:flex;align-items:center;gap:12px}
        .ap-modal-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:19px;font-weight:600;color:#fff;flex-shrink:0;box-shadow:0 6px 14px -4px rgba(0,0,0,.5)}
        .ap-modal-title-block{flex:1;min-width:0}
        .ap-modal-title{font-size:19px;font-weight:600;letter-spacing:-.015em;color:var(--fg);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ap-modal-sub{font-size:11.5px;color:var(--fg-muted,#888);font-family:var(--font-mono,monospace);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ap-modal-close{width:30px;height:30px;border-radius:8px;background:transparent;border:1px solid var(--border,#333);color:var(--fg-muted,#888);cursor:pointer;display:grid;place-items:center;transition:all 120ms;flex-shrink:0}
        .ap-modal-close:hover{background:rgba(255,255,255,.06);color:var(--fg)}
        .ap-modal-body{padding:18px 22px;overflow-y:auto;flex:1}
        .ap-section-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-muted,#888);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
        .ap-notice{padding:10px 12px;background:rgba(129,140,248,.07);border:1px solid rgba(129,140,248,.2);border-radius:9px;font-size:11.5px;color:var(--fg-muted,#888);display:flex;align-items:flex-start;gap:8px;margin-bottom:14px;line-height:1.5}
        .ap-notice strong{color:var(--fg);font-weight:600}
        .ap-tab-toggles{display:flex;flex-direction:column;gap:6px}
        .ap-tab-toggle{display:flex;align-items:center;gap:11px;padding:11px 13px;background:var(--bg,#12121a);border:1px solid var(--border,#333);border-radius:10px;cursor:pointer;transition:all 120ms;text-align:left;width:100%}
        .ap-tab-toggle:hover{background:rgba(255,255,255,.04)}
        .ap-tt-check{width:18px;height:18px;border-radius:5px;border:1.5px solid rgba(255,255,255,.2);background:transparent;display:grid;place-items:center;flex-shrink:0;transition:all 120ms;color:transparent}
        .ap-tab-toggle.on .ap-tt-check{background:var(--accent);border-color:var(--accent);color:#fff}
        .ap-tt-icon{font-size:15px;width:22px;text-align:center;flex-shrink:0}
        .ap-tt-body{flex:1;min-width:0}
        .ap-tt-name{font-size:13px;font-weight:500;color:var(--fg);white-space:nowrap}
        .ap-tt-desc{font-size:11px;color:var(--fg-muted,#888);margin-top:1px}
        .ap-bulk-btn{padding:6px 12px;background:transparent;border:1px solid var(--border,#333);color:var(--fg-muted,#888);border-radius:7px;font-family:inherit;font-size:11.5px;font-weight:500;cursor:pointer;transition:all 120ms}
        .ap-bulk-btn:hover{background:rgba(255,255,255,.05);color:var(--fg)}
        .ap-role-warn{padding:14px;border-radius:10px;border:1px solid;margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;line-height:1.55;font-size:12.5px}
        .ap-role-warn.promote{background:rgba(245,158,11,.07);border-color:rgba(245,158,11,.3);color:#fcd34d}
        .ap-role-warn.demote{background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.3);color:#f87171}
        .ap-role-warn strong{color:inherit;font-weight:600}
        .ap-code{font-family:var(--font-mono,monospace);font-size:12px;background:var(--bg,#12121a);padding:1px 6px;border-radius:4px;color:var(--fg)}
        .ap-modal-foot{padding:13px 22px;border-top:1px solid var(--border,#333);background:rgba(0,0,0,.15);display:flex;justify-content:space-between;gap:8px;align-items:center}
        .ap-kbd{padding:1px 5px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#333);border-radius:4px;font-family:var(--font-mono,monospace);font-size:10px;color:var(--fg-muted,#888)}
        .ap-btn-cancel{padding:9px 14px;background:transparent;border:1px solid var(--border,#333);color:var(--fg);border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer;transition:all 120ms}
        .ap-btn-cancel:hover{background:rgba(255,255,255,.05)}
        .ap-btn-save{padding:9px 16px;background:var(--accent);border:none;color:#fff;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity 120ms}
        .ap-btn-save:hover:not(:disabled){opacity:.85}
        .ap-btn-save:disabled{opacity:.5;cursor:default}
        .ap-btn-warn{padding:9px 16px;background:#d97706;border:none;color:#fff;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:filter 120ms}
        .ap-btn-warn:hover:not(:disabled){filter:brightness(1.1)}
        .ap-btn-warn:disabled{opacity:.5;cursor:default}
        .ap-btn-danger{padding:9px 16px;background:#dc2626;border:none;color:#fff;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:filter 120ms}
        .ap-btn-danger:hover:not(:disabled){filter:brightness(1.1)}
        .ap-btn-danger:disabled{opacity:.5;cursor:default}
        .tab--admin{color:#fcd34d !important}
        .tab--admin.active{background:rgba(245,158,11,.12) !important;color:#fcd34d !important}
      `}</style>

      <div className="ap-page-head">
        <div>
          <div className="ap-eyebrow"><span className="ap-eyebrow-dot" />Admin · Owner view</div>
          <div className="ap-h1"><ShieldIcon /> User management</div>
          <div className="ap-sub">Manage roles, control tab visibility, and review accounts across Rhythm.</div>
        </div>
      </div>

      <div className="ap-stats">
        <div className="ap-stat-card">
          <div className="ap-stat-label">Total users</div>
          <div className="ap-stat-val">{stats?.total ?? users.length}</div>
          <div className="ap-stat-sub">Across all roles</div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-label">Admins</div>
          <div className="ap-stat-val">{adminCount}</div>
          <div className="ap-stat-sub">Includes owner</div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-label">Standard users</div>
          <div className="ap-stat-val">{userCount}</div>
          <div className="ap-stat-sub">Active accounts</div>
        </div>
        <div className="ap-stat-card">
          <div className="ap-stat-label">Online now</div>
          <div className="ap-stat-val" style={{ color: "#34d399" }}>{stats?.online ?? 0}</div>
          <div className="ap-stat-sub">Last 5 minutes</div>
        </div>
      </div>

      <div className="ap-toolbar">
        <div className="ap-search-wrap">
          <span className="ap-search-icon"><SearchIcon /></span>
          <input
            placeholder="Search by username or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ap-chips">
          <button className={`ap-chip${roleFilter === "all" ? " active" : ""}`} onClick={() => setRoleFilter("all")}>
            All <span className="ap-chip-count">{stats?.total ?? users.length}</span>
          </button>
          <button className={`ap-chip${roleFilter === "admins" ? " active" : ""}`} onClick={() => setRoleFilter("admins")}>
            Admins <span className="ap-chip-count">{adminCount}</span>
          </button>
          <button className={`ap-chip${roleFilter === "users" ? " active" : ""}`} onClick={() => setRoleFilter("users")}>
            Users <span className="ap-chip-count">{userCount}</span>
          </button>
        </div>
      </div>

      <div className="ap-table-card">
        <div className="ap-table-scroll">
          <table className="ap-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Tab access</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: 40, textAlign: "center", color: "var(--fg-muted,#888)", fontSize: 13 }}>
                    Loading…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: 40, textAlign: "center", color: "var(--fg-muted,#888)", fontSize: 13 }}>
                    No matching users.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isOwner = u.role === "owner";
                  const isAdmin = u.role === "admin" || isOwner;
                  const hiddenSet = new Set(Array.isArray(u.hidden_tabs) ? u.hidden_tabs : []);
                  const visibleCount = ALL_TAB_IDS.filter(id => !hiddenSet.has(id)).length;
                  const color = u.color || avatarColor(u.id);

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="ap-user-cell">
                          <div className="ap-av" style={{ background: avatarBg(color) }}>
                            {(u.username || "?")[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="ap-uname">{u.username}</div>
                            <div className="ap-uemail">{u.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`ap-role-badge ${u.role}`}>
                          <span className="ap-role-dot" />
                          {isOwner ? <><CrownIcon /> Owner</> : (u.role === "admin" ? "Admin" : "User")}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono,monospace)", fontSize: 11.5, color: "var(--fg-muted,#888)", whiteSpace: "nowrap" }}>
                          <div className="ap-tabs-bar">
                            {ALL_TABS.map(t => (
                              <span key={t.id} className={`ap-tabs-bar-cell${!hiddenSet.has(t.id) ? " on" : ""}`} />
                            ))}
                          </div>
                          <span>
                            <span style={{ color: "var(--fg)" }}>{visibleCount}</span>
                            <span style={{ color: "var(--fg-muted,#888)" }}> / {ALL_TABS.length}</span>
                          </span>
                        </div>
                      </td>
                      <td><span className="ap-joined">{fmt(u.created_at)}</span></td>
                      <td>
                        <span className="ap-status">
                          <span className={`ap-status-dot${u.online ? " online" : ""}`} />
                          {u.online ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td>
                        <div className="ap-act-row">
                          {!isOwner ? (
                            <>
                              <button className="ap-act-btn primary" onClick={() => setTabModal(u)}>
                                <EditIcon /> Edit tabs
                              </button>
                              <button
                                className={`ap-act-btn ${u.role === "user" ? "warn" : "danger"}`}
                                onClick={() => setRoleModal(u)}
                              >
                                <SwapIcon /> {u.role === "user" ? "Make admin" : "Revoke"}
                              </button>
                              <button className="ap-act-btn danger" onClick={() => setDeleteModal(u)}>
                                <TrashIcon /> Delete
                              </button>
                            </>
                          ) : (
                            <span className="ap-act-btn" style={{ cursor: "default", opacity: 0.5 }}>Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="ap-table-foot">
          <span className="ap-foot-info">
            Showing <strong style={{ color: "var(--fg)" }}>{filteredUsers.length}</strong> of <strong style={{ color: "var(--fg)" }}>{total}</strong> users
          </span>
          <div className="ap-pager">
            <button className="ap-pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`ap-pg-btn${n === page ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="ap-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
          </div>
        </div>
      </div>

      {tabModal && (
        <TabModal
          user={tabModal}
          onSave={handleSaveTabs}
          onClose={() => { setTabModal(null); setSaveError(null); }}
          saving={saving}
          saveError={saveError}
        />
      )}
      {roleModal && (
        <RoleModal
          user={roleModal}
          onConfirm={handleConfirmRole}
          onClose={() => setRoleModal(null)}
          saving={saving}
        />
      )}
      {deleteModal && (
        <DeleteModal
          user={deleteModal}
          onConfirm={handleDeleteUser}
          onClose={() => { setDeleteModal(null); setSaveError(null); }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  );
}

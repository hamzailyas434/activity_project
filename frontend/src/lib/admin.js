import { useEffect, useState } from "react";
import { useUI } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "./api";
import useLoad from "./useLoad";

function useDebounced(v, ms = 280) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/* Admin state shared by both designs: stats, paged + filtered users, audit log, role / tabs / unlock / demo actions. */
export function useAdmin() {
  const api = useApi();
  const { user, isOwner } = useAuth();
  const { toast, ask } = useUI();
  const [tab, setTab] = useState("users"), [q, setQ] = useState(""), [rf, setRf] = useState("all"), [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());
  const stats = useLoad(api, a => a.get("/admin/stats"), "", null);
  const users = useLoad(api, a => a.get(`/admin/users?${new URLSearchParams({ q: dq, role: rf, page, limit: 30 })}`), `${dq}|${rf}|${page}`, null);
  const audit = useLoad(api, a => (tab === "audit" && isOwner ? a.get("/admin/audit?limit=100") : null), tab, null);
  const list = users.data?.users || [];
  const total = users.data?.total || 0;

  const U = (id, patch) => users.setData(d => ({ ...d, users: d.users.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  const toggleTab = async (u, t) => {
    const on = !u.hidden_tabs.includes(t);
    const next = on ? [...u.hidden_tabs, t] : u.hidden_tabs.filter(x => x !== t);
    U(u.id, { hidden_tabs: next });
    try { await api.patch(`/admin/users/${u.id}/tabs`, { hidden_tabs: next }); toast(`${t} ${on ? "hidden" : "shown"} for ${u.username}`); }
    catch (e) { U(u.id, { hidden_tabs: u.hidden_tabs }); toast(e.message, "err"); }
  };
  const role = async u => {
    const up = u.role === "user";
    if (!(await ask({ kicker: up ? "Promote" : "Demote", title: up ? `Make ${u.username} admin?` : `Revoke admin from ${u.username}?`,
      body: up ? "Is user ko admin banane se wo full access aur admin panel dekh sakta hai." : "They lose the admin panel and return to standard access.",
      ok: up ? "Make admin" : "Revoke", danger: !up }))) return;
    try { await api.patch(`/admin/users/${u.id}/role`, { role: up ? "admin" : "user" }); U(u.id, { role: up ? "admin" : "user" }); stats.reload(); toast(`${u.username} is now ${up ? "admin" : "user"}`); }
    catch (e) { toast(e.message, "err"); }
  };
  const resetDemo = async u => {
    if (!(await ask({ title: `Reset ${u.username}?`, body: "Everything in this demo account goes back to the original demo data. Anyone using it now sees the fresh copy.", ok: "Reset", danger: true }))) return;
    try { await api.post(`/admin/users/${u.id}/demo-reset`); U(u.id, { demo_reset_at: new Date().toISOString() }); toast(u.username + " reset to demo data"); }
    catch (e) { toast(e.message, "err"); }
  };
  const addDemo = async () => {
    try { const r = await api.post("/admin/demo-accounts"); users.reload(); stats.reload(); toast(r.username + " added to the demo pool"); }
    catch (e) { toast(e.message, "err"); }
  };
  // whole tab list at once (v2 tab-access modal)
  const setTabs = async (u, next) => {
    U(u.id, { hidden_tabs: next });
    try { await api.patch(`/admin/users/${u.id}/tabs`, { hidden_tabs: next }); toast(`Tab access saved for ${u.username}`); return true; }
    catch (e) { U(u.id, { hidden_tabs: u.hidden_tabs }); toast(e.message, "err"); return false; }
  };
  const unlock = async u => {
    if (!(await ask({ title: `Unlock ${u.username}?`, body: "Clears the lockout and failed sign-in count so they can sign in now.", ok: "Unlock" }))) return;
    try { await api.post(`/admin/users/${u.id}/unlock`); U(u.id, { locked: false, lockout_until: null, failed_login_attempts: 0 }); stats.reload(); toast(u.username + " unlocked"); }
    catch (e) { toast(e.message, "err"); }
  };

  const s = stats.data || {};
  return { api, user, isOwner, toast, ask, tab, setTab, q, setQ, rf, setRf, page, setPage, dq, stats, users, audit, list, total, U, toggleTab, setTabs, role, resetDemo, addDemo, unlock, s };
}

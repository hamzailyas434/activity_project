import { useState } from "react";
import { Avatar, Empty, Icon, Modal, Skeleton } from "../components/ui";
import { useAdmin } from "../lib/admin";
import { ago, fmtDate, fmtDateTime } from "../lib/format";
import { NAV } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 09 Admin — KPI strip, filter chips, users table (tabs, security, last active, actions), audit log, tab-access modal */
const TAB_IDS = NAV.map(n => n.id);

function TabAccess({ u, onClose, onSave }) {
  const [hid, setHid] = useState(u.hidden_tabs), [busy, setBusy] = useState(false);
  const locked = u.role !== "user";
  const save = async () => { setBusy(true); if (await onSave(u, hid)) onClose(); else setBusy(false); };
  return (
    <Modal lead={<Avatar name={u.username} c={u.id} s={44} />} kicker={u.email || "No email"} title={u.username} onClose={onClose}
      foot={<><span className="hint">{TAB_IDS.length - hid.length} of {TAB_IDS.length} visible</span><div className="r"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn primary" disabled={busy || locked} onClick={save}>Save changes</button></div></>}>
      <div className="row sb"><span className="label">Tab access control</span>
        <div className="row" style={{ gap: 4 }}><button type="button" className="btn sm ghost" disabled={locked} onClick={() => setHid([])}>All on</button><button type="button" className="btn sm ghost" disabled={locked} onClick={() => setHid(["books"])}>Defaults</button></div></div>
      <div className="stack">
        {NAV.map(n => {
          const on = !hid.includes(n.id);
          return (
            <div key={n.id} className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--line-soft)" }}>
              <Icon n={n.icon} /><span style={{ flex: 1, fontWeight: 500 }}>{n.label}{n.id === "books" && <span className="hint" style={{ marginLeft: 8 }}>off by default</span>}</span>
              <button type="button" className={"toggle " + (on ? "on" : "")} role="switch" aria-checked={on} aria-label={n.label} disabled={locked} onClick={() => setHid(h => (on ? [...h, n.id] : h.filter(x => x !== n.id)))} />
            </div>
          );
        })}
        {locked && <div className="row" style={{ padding: "11px 0", opacity: 0.7 }}><Icon n="shield" /><span style={{ flex: 1, fontWeight: 500 }}>Admins always see every tab</span><span className="badge warn">Locked · {u.role}</span></div>}
      </div>
    </Modal>
  );
}

export default function Admin() {
  const { user, isOwner, tab, setTab, q, setQ, rf, setRf, page, setPage, users, audit, list, total, setTabs, role, resetDemo, addDemo, unlock, s } = useAdmin();
  const [edit, setEdit] = useState(null);
  const pages = Math.max(1, Math.ceil(total / 30));
  const kpis = [["Users", s.total], ["Admins", s.admins], ["Online", s.online], ["Locked", s.locked], ["2FA on", s.totp]];

  return (
    <>
      <PageHead idx="09" meta={`Admin · ${user?.role} view`} title={<>User <em>control</em></>} sub="Roles and tab visibility for every account. New users start with Books hidden.">
        {isOwner && <div className="seg"><button type="button" className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>Users</button><button type="button" className={tab === "audit" ? "on" : ""} onClick={() => setTab("audit")}>Audit log</button></div>}
        {tab === "users" && <div className="search adm-search" style={{ width: 260 }}><Icon n="search" s={14} /><input className="input" aria-label="Search users" placeholder="Username, name or email" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>}
      </PageHead>

      <div className="kpis kpis-5" style={{ marginBottom: 16 }}>{kpis.map(([k, v]) => <div key={k} className="kpi"><div className="k">{k}</div><div className="v">{v ?? "—"}</div></div>)}</div>

      {tab === "users" ? <>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          {[["all", "All"], ["admins", "Admins"], ["users", "Users"], ["locked", "Locked"], ["demo", "Demo"]].map(([k, l]) => <button type="button" key={k} className={"chip " + (rf === k ? "on" : "")} onClick={() => { setRf(k); setPage(1); }}>{l}</button>)}
          {rf === "demo" && <button type="button" className="btn sm primary" style={{ marginLeft: "auto" }} onClick={addDemo}><Icon n="plus" s={13} />Add demo account</button>}
        </div>
        <section className="card flush">
          {users.loading && !users.data ? <div style={{ padding: 18 }}><Skeleton tiles={[["s12", 240]]} /></div> : users.error && !users.data ? <div style={{ padding: 18 }}><Empty title="Couldn't load users" body={users.error} action={<button type="button" className="btn primary" onClick={users.reload}>Try again</button>} /></div> : (
            <div className="tbl-wrap">
              <table className="tbl tbl-stack adm-tbl">
                <thead><tr><th>User</th><th>Role</th><th>Tab access</th><th>Security</th><th>Last active</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {!list.length && <tr><td colSpan="6" style={{ textAlign: "center", padding: 40 }} className="muted">No users match.</td></tr>}
                  {list.map(u => {
                    const self = u.id === user?.id, vis = TAB_IDS.filter(t => !u.hidden_tabs.includes(t));
                    const canRole = !u.is_demo && u.role !== "owner" && !self && (u.role !== "admin" || isOwner);
                    return (
                      <tr key={u.id}>
                        <td data-l="User"><div className="row"><Avatar name={u.username} c={u.id} s={34} /><div style={{ minWidth: 0 }}><b>{u.username}</b>{self && <span className="muted"> · you</span>}{u.online && <i title="Online" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", marginLeft: 6 }} />}<div className="mono muted" style={{ fontSize: 11.5 }}>{u.email || "—"}</div></div></div></td>
                        <td data-l="Role"><span className={"badge " + (u.is_demo ? "warn" : u.role === "owner" ? "red" : u.role === "admin" ? "warn" : "")}>{u.is_demo ? "demo" : u.role}</span></td>
                        <td data-l="Tabs"><div className="row" style={{ gap: 3 }}>{TAB_IDS.map(t => <i key={t} title={t} style={{ width: 10, height: 10, borderRadius: 2, background: vis.includes(t) ? "var(--fg)" : "var(--bg-3)" }} />)}<span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>{vis.length}/{TAB_IDS.length}</span></div></td>
                        <td data-l="Security"><div className="row" style={{ gap: 4 }}>{u.totp_enabled ? <span className="badge ok">2FA</span> : <span className="badge">No 2FA</span>}{u.locked && <span className="badge red">Locked</span>}{!u.locked && u.failed_login_attempts > 0 && <span className="badge warn">{u.failed_login_attempts} failed</span>}</div></td>
                        <td data-l="Last active" className="mono muted" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                          {u.online ? <span style={{ color: "var(--ok)" }}>Online now</span> : u.last_active ? ago(u.last_active) : "—"}
                          <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{u.is_demo ? `reset ${u.demo_reset_at ? ago(u.demo_reset_at) : "never"}` : `joined ${fmtDate(u.created_at)}`}</div>
                        </td>
                        <td style={{ textAlign: "right" }}><div className="row" style={{ justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                          {u.locked && <button type="button" className="btn sm" onClick={() => unlock(u)}>Unlock</button>}
                          {!!u.is_demo && <button type="button" className="btn sm danger" onClick={() => resetDemo(u)}>Reset</button>}
                          <button type="button" className="btn sm" disabled={self || u.role === "owner"} onClick={() => setEdit(u)}><Icon n="edit" s={13} />Tabs</button>
                          {u.role === "owner" ? <span className="badge">Protected</span> : canRole ? <button type="button" className={"btn sm " + (u.role === "user" ? "" : "danger")} onClick={() => role(u)}>{u.role === "user" ? "Make admin" : "Revoke"}</button> : null}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="row sb" style={{ padding: "12px 18px", borderTop: "1px solid var(--line)" }}>
            <span className="mono muted" style={{ fontSize: 11.5 }}>{list.length} of {total}</span>
            <div className="row" style={{ gap: 4 }}>
              <button type="button" className="btn sm icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><Icon n="chevL" s={13} /></button>
              <span className="mono muted" style={{ fontSize: 11.5, padding: "0 8px" }}>{page} / {pages}</span>
              <button type="button" className="btn sm icon" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><Icon n="chevR" s={13} /></button>
            </div>
          </div>
        </section>
      </> : (
        <section className="card flush">
          {audit.loading && !audit.data ? <div style={{ padding: 18 }}><Skeleton tiles={[["s12", 240]]} /></div>
            : audit.error ? <div style={{ padding: 18 }}><Empty title="Couldn't load the audit log" body={audit.error} /></div>
              : !(audit.data?.rows || []).length ? <div style={{ padding: 18 }}><Empty title="No events yet" body="Sign-ins, password and 2FA changes are logged here." /></div>
                : (
                  <div className="tbl-wrap"><table className="tbl tbl-stack">
                    <thead><tr><th>Status</th><th>Action</th><th>User</th><th>IP</th><th className="num">When</th></tr></thead>
                    <tbody>{audit.data.rows.map(x => (
                      <tr key={x.id}>
                        <td data-l="Status"><span className={"badge " + (x.status_code >= 400 ? "red" : "ok")}>{x.status_code ?? "—"}</span></td>
                        <td data-l="Action" className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>{x.action}</td>
                        <td data-l="User">{x.username || "anonymous"}</td>
                        <td data-l="IP" className="mono muted">{x.ip_address || "—"}</td>
                        <td data-l="When" className="num mono muted" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(x.created_at)}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
        </section>
      )}

      {edit && <TabAccess u={list.find(x => x.id === edit.id) || edit} onClose={() => setEdit(null)} onSave={setTabs} />}
    </>
  );
}

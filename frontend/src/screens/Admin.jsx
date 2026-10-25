import { Avatar, Empty, Head, Icon, Search, Seg, Skeleton } from "../components/ui";
import { ago, fmtDate, fmtDateTime } from "../lib/format";
import { NAV } from "../shell/route";
import { useAdmin } from "../lib/admin";

const TABS = NAV.map(n => [n.id, n.id === "qaza-namaz" ? "qaza" : n.id === "dashboard" ? "today" : n.id]);


export default function Admin() {
  const { user, isOwner, tab, setTab, q, setQ, rf, setRf, page, setPage, users, audit, list, total, U, toggleTab, role, resetDemo, addDemo, unlock, s } = useAdmin();
  const kpis = [["Users", s.total, ""], ["Admins", s.admins, "t-gold"], ["Online", s.online, "t-green"], ["Locked", s.locked, "t-red"], ["2FA on", s.totp, "t-blue"]];

  return (
    <>
      <Head n="09" eyebrow={`Admin · ${user?.role}`} title={<>Who sees <em>what</em>.</>} sub="Roles, tab access and account security. New users start with Books hidden.">
        {isOwner && <Seg value={tab} onChange={setTab} label="Section" options={[["users", "Users"], ["audit", "Audit log"]]} />}
      </Head>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        {kpis.map(([l, v, c]) => <section key={l} className={"tile " + c} style={{ padding: 18 }}><div className="cap">{l}</div><div className="big" style={{ fontSize: 56, marginTop: 6 }}>{v ?? "—"}</div></section>)}
      </div>

      {tab === "users" ? <>
        <div className="row wrap" style={{ marginBottom: 14, gap: 8 }}>
          <Search value={q} onChange={v => { setQ(v); setPage(1); }} label="Search users" placeholder="Username, name or email" style={{ flex: "1 1 240px", maxWidth: 360 }} />
          {[["all", "All"], ["admins", "Admins"], ["users", "Users"], ["locked", "Locked"], ["demo", "Demo"]].map(([x, l]) => <button type="button" key={x} className={"chip" + (rf === x ? " on" : "")} aria-pressed={rf === x} onClick={() => { setRf(x); setPage(1); }}>{l}</button>)}
          {rf === "demo" && <button type="button" className="btn sm primary" style={{ marginLeft: "auto" }} onClick={addDemo}><Icon n="plus" s={13} />Add demo account</button>}
        </div>
        {users.loading && !list.length ? <Skeleton tiles={[["s4", 280], ["s4", 280], ["s4", 280]]} />
          : users.error && !list.length ? <Empty title="Couldn't load users" body={users.error} action={<button type="button" className="btn primary" onClick={users.reload}>Try again</button>} />
          : !list.length ? <Empty title="No users match" body="Try another search or filter." />
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(340px,100%),1fr))", gap: 14 }}>
              {list.map(u => {
                const self = u.id === user?.id, lockedRole = u.role === "owner" || self || (u.role === "admin" && !isOwner);
                const nm = [u.first_name, u.last_name].filter(Boolean).join(" ");
                return (
                  <section key={u.id} className="tile">
                    <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                      <Avatar name={u.username} c={u.id} s={46} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username}{self && <span className="faint"> · you</span>}</b>
                        <div className="mono faint" style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis" }}>{u.email || nm || "—"}</div>
                      </div>
                      {u.is_demo ? <span className="pill warn">demo</span> : <span className={"pill " + (u.role === "owner" ? "red" : u.role === "admin" ? "warn" : "")}>{u.role}</span>}
                    </div>
                    <div className="row wrap" style={{ gap: 6, margin: "14px 0" }}>
                      {u.online ? <span className="pill ok">● Online</span> : <span className="pill">Last {u.last_active ? ago(u.last_active) : "—"}</span>}
                      <span className={"pill " + (u.totp_enabled ? "info" : "")}>{u.totp_enabled ? "2FA on" : "No 2FA"}</span>
                      {u.locked && <span className="pill red">Locked</span>}
                      {!u.locked && u.failed_login_attempts > 0 && <span className="pill warn">{u.failed_login_attempts} failed</span>}
                      {u.is_demo ? <span className="pill">Reset {u.demo_reset_at ? ago(u.demo_reset_at) : "never"}</span> : <span className="pill">Joined {fmtDate(u.created_at)}</span>}
                    </div>
                    <div className="cap" style={{ marginBottom: 8 }}>Tab access · {TABS.length - TABS.filter(([t]) => u.hidden_tabs.includes(t)).length}/{TABS.length}</div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {TABS.map(([t, l]) => {
                        const on = !u.hidden_tabs.includes(t), dis = u.role === "owner" || self || (u.role === "admin" && !isOwner);
                        return <button type="button" key={t} disabled={dis} aria-pressed={on} aria-label={`${l} ${on ? "visible" : "hidden"} for ${u.username}`} onClick={() => toggleTab(u, t)} className="chip"
                          style={{ height: 32, minWidth: 44, boxShadow: "none", background: on ? "var(--fg)" : "var(--bg-2)", color: on ? "var(--bg)" : "var(--fg-4)", textDecoration: on ? "none" : "line-through", opacity: dis ? 0.6 : 1, cursor: dis ? "not-allowed" : "pointer" }}>{l}</button>;
                      })}
                      {u.role !== "user" && <span className="chip" style={{ height: 32, boxShadow: "none", background: "var(--red)", color: "#fff", cursor: "default" }}>admin · locked on</span>}
                    </div>
                    <div className="row" style={{ marginTop: 16, justifyContent: "flex-end", gap: 6 }}>
                      {u.locked && <button type="button" className="btn sm" onClick={() => unlock(u)}>Unlock</button>}
                      {!!u.is_demo && <button type="button" className="btn sm danger" onClick={() => resetDemo(u)}><Icon n="clock" s={13} />Reset content</button>}
                      {u.role === "owner" ? <span className="pill ink">Protected</span>
                        : lockedRole ? <span className="pill">{self ? "Your account" : "Owner only"}</span>
                          : <button type="button" className={"btn sm " + (u.role === "user" ? "primary" : "danger")} onClick={() => role(u)}>{u.role === "user" ? "Make admin" : "Revoke admin"}</button>}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        {total > list.length && (
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <button type="button" className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span className="mono faint" style={{ fontSize: 12 }}>Page {page} of {Math.ceil(total / 30)}</span>
            <button type="button" className="btn sm" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </> : (
        <section className="tile">
          {audit.loading && !audit.data ? <div className="skel" style={{ height: 240 }} />
            : audit.error ? <Empty title="Couldn't load the audit log" body={audit.error} />
            : !(audit.data?.rows || []).length ? <Empty title="No events yet" body="Sign-ins, password and 2FA changes are logged here." />
            : audit.data.rows.map(x => (
              <div key={x.id} className="list-row">
                <span className={"pill " + (x.status_code >= 400 ? "red" : "ok")}>{x.status_code ?? "—"}</span>
                <div className="grow" style={{ minWidth: 0 }}><b className="mono" style={{ fontSize: 12.5, wordBreak: "break-all" }}>{x.action}</b><div className="faint" style={{ fontSize: 12 }}>{x.username || "anonymous"} · {x.ip_address || "—"}</div></div>
                <span className="mono faint" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtDateTime(x.created_at)}</span>
              </div>
            ))}
        </section>
      )}
    </>
  );
}

import { useRef, useState } from "react";
import { Empty, Field, Head, Icon, Modal, PwStrength, Seg, Toggle, pwOk, useUI } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../lib/api";
import useLoad from "../lib/useLoad";
import { displayName, fmtDateTime, toDate } from "../lib/format";
import { useCurrency } from "../hooks/useCurrency";

/* "Chrome · macOS" from a user-agent string */
function device(ua = "") {
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const o = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return o ? `${b} · ${o}` : b;
}
const EVENT = {
  "POST:/login": "Signed in", "POST:/login/2fa": "Signed in with 2FA", "POST:/logout": "Signed out", "POST:/register": "Account created",
  "PUT:/password": "Password changed", "POST:/refresh": "Session refreshed", "POST:/enable": "Two-factor turned on", "POST:/disable": "Two-factor turned off", "POST:/setup": "Two-factor setup started",
};
const Sect = ({ n, t, cls = "", children }) => <section className={"tile " + cls}><div className="th"><div><div className="cap">{n}</div><h3>{t}</h3></div></div>{children}</section>;

export default function Profile({ theme, setTheme, onSignOut }) {
  const api = useApi();
  const { user, updateUser } = useAuth();
  const { toast, ask } = useUI();
  const { currency, setCurrency, options } = useCurrency();
  const me = useLoad(api, async a => { const u = await a.get("/users/me"); updateUser(u); return u; }, "", null);
  const u = me.data || user || {};
  const sessions = useLoad(api, a => a.get("/users/sessions"), "", []);
  const settings = useLoad(api, a => a.get("/users/settings"), "", null);
  const log = useLoad(api, a => a.get("/users/activity-log?limit=30"), "", null);
  const fileRef = useRef(null);

  const initAcc = { first_name: u.first_name || "", last_name: u.last_name || "", username: u.username || "", email: u.email || "" };
  const [acc, setAcc] = useState(null);
  const f = acc || initAcc;
  const [touched, setTouched] = useState({}), [busy, setBusy] = useState(""), [pw, setPw] = useState({ a: "", b: "", c: "" }), [tfa, setTfa] = useState(null);

  const dirty = JSON.stringify(f) !== JSON.stringify(initAcc);
  const errs = {
    username: f.username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(f.username.trim()) ? "3–30 letters, digits, _ . -" : "",
    email: f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email" : "",
  };
  const pwReady = pw.a && pwOk(pw.b) && pw.b === pw.c;
  const name = displayName(u) || "You";
  const since = toDate(u.created_at);

  const saveAcc = async () => {
    setTouched({ username: true, email: true });
    if (errs.username || errs.email) return;
    setBusy("acc");
    try { const r = await api.put("/users/profile", { ...f, username: f.username.trim(), email: f.email.trim() }); updateUser(r); me.setData(r); setAcc(null); toast("Profile saved"); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(""); }
  };
  const photo = file => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image", "err");
    if (file.size > 2 * 1024 * 1024) return toast("Image must be under 2 MB", "err");
    const rd = new FileReader();
    rd.onloadend = async () => {
      try { const r = await api.put("/users/profile", { ...initAcc, profile_picture: rd.result }); updateUser(r); me.setData(r); toast("Photo updated"); }
      catch (e) { toast(e.message, "err"); }
    };
    rd.readAsDataURL(file);
  };
  const changePw = async () => {
    if (!pwReady) return;
    setBusy("pw");
    try { await api.put("/users/password", { currentPassword: pw.a, newPassword: pw.b }); setPw({ a: "", b: "", c: "" }); toast("Password changed"); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(""); }
  };
  const revoke = async s => {
    if (!(await ask({ title: "Sign out this session?", body: `${device(s.user_agent)} · ${s.ip_address || "unknown IP"}`, ok: "Sign out", danger: true }))) return;
    try { await api.post(`/users/sessions/${s.id}/revoke`); sessions.setData(l => l.filter(x => x.id !== s.id)); toast("Session signed out"); }
    catch (e) { toast(e.message, "err"); }
  };
  const setRem = async patch => {
    const prev = settings.data;
    settings.setData(s => ({ ...s, ...patch }));
    try { settings.setData(await api.put("/users/settings", patch)); }
    catch (e) { settings.setData(prev); toast(e.message, "err"); }
  };
  const csv = async () => {
    setBusy("csv");
    try {
      const res = await api.raw("/users/export.csv");
      if (!res.ok) throw new Error("Export failed. Try again.");
      const href = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = href; a.download = `rhythm-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      toast("CSV exported");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(""); }
  };
  const signOut = async () => { if (await ask({ title: "Sign out?", body: "You will need to sign in again.", ok: "Sign out" })) onSignOut(); };

  const rem = settings.data || { notifications_enabled: false, notification_time: "21:30" };
  const events = log.data?.securityEvents || [];
  const sl = Array.isArray(sessions.data) ? sessions.data : [];

  return (
    <>
      <Head n="08" eyebrow={`${u.role || "user"}${since ? ` · member since ${since.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}`}
        title={<>Your <em>settings</em>.</>} sub="Account, security, reminders and your data — in one place." />
      <div className="bento">
        <section className="tile t-red s4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, justifyContent: "center" }}>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo" style={{ border: "none", background: "none", cursor: "pointer", position: "relative", padding: 0, borderRadius: "50%" }}>
            {u.profile_picture ? <img src={u.profile_picture} alt="" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", display: "block" }} />
              : <span className="serif" style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(0,0,0,.18)", display: "grid", placeItems: "center", fontSize: 64, color: "#fff" }}>{name[0]?.toUpperCase()}</span>}
            <span style={{ position: "absolute", right: 0, bottom: 4, width: 34, height: 34, borderRadius: "50%", background: "#fff", color: "#111", display: "grid", placeItems: "center" }}><Icon n="upload" s={15} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { photo(e.target.files[0]); e.target.value = ""; }} />
          <div style={{ minWidth: 0, maxWidth: "100%" }}><div className="serif ut" dir="auto" style={{ fontSize: 36, lineHeight: 1 }}>{name}</div><div className="mono" style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>@{u.username}</div></div>
          <button type="button" className="btn" style={{ background: "rgba(0,0,0,.2)", color: "#fff" }} onClick={signOut}><Icon n="logout" s={15} />Sign out</button>
        </section>

        <div className="s8"><Sect n="01" t="Account">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <Field label="First name"><input className="input" dir="auto" maxLength={50} value={f.first_name} onChange={e => setAcc({ ...f, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className="input" dir="auto" maxLength={50} value={f.last_name} onChange={e => setAcc({ ...f, last_name: e.target.value })} /></Field>
            <Field label="Username" req err={touched.username && errs.username}><input className={"input" + (touched.username && errs.username ? " bad" : "")} autoCapitalize="none" maxLength={30} value={f.username} onBlur={() => setTouched(t => ({ ...t, username: true }))} onChange={e => setAcc({ ...f, username: e.target.value })} /></Field>
            <Field label="Email" err={touched.email && errs.email}><input className={"input" + (touched.email && errs.email ? " bad" : "")} type="email" value={f.email} onBlur={() => setTouched(t => ({ ...t, email: true }))} onChange={e => setAcc({ ...f, email: e.target.value })} /></Field>
            <Field label="Currency" hint="Used across Money and Today."><select className="input" value={currency} onChange={e => { setCurrency(e.target.value); toast("Currency: " + e.target.value); }}>{options.map(c => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <button type="button" className="btn" disabled={!dirty} onClick={() => { setAcc(null); setTouched({}); }}>Reset</button>
            <button type="button" className="btn primary" disabled={!dirty || busy === "acc"} onClick={saveAcc}>{busy === "acc" ? "Saving…" : "Save"}</button>
          </div>
        </Sect></div>

        <div className="s6"><Sect n="02" t="Password"><div className="stack">
          <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={pw.a} onChange={e => setPw({ ...pw, a: e.target.value })} /></Field>
          <Field label="New password" hint="8+ chars, upper and lower case, a number, a symbol."><input className="input" type="password" autoComplete="new-password" value={pw.b} onChange={e => setPw({ ...pw, b: e.target.value })} /></Field>
          <PwStrength value={pw.b} />
          <Field label="Confirm" err={pw.c && pw.b !== pw.c && "Doesn't match"}><input className={"input" + (pw.c && pw.b !== pw.c ? " bad" : "")} type="password" autoComplete="new-password" value={pw.c} onChange={e => setPw({ ...pw, c: e.target.value })} /></Field>
          <button type="button" className="btn primary" disabled={!pwReady || busy === "pw"} onClick={changePw}>{busy === "pw" ? "Changing…" : "Change password"}</button>
        </div></Sect></div>

        <div className="s6"><Sect n="03" t="Security"><div className="stack">
          <div className="row" style={{ background: "var(--bg-2)", borderRadius: 18, padding: 14 }}>
            <div className="grow"><b>Two-factor authentication</b><div className="faint" style={{ fontSize: 12 }}>{u.totp_enabled ? "On · authenticator app" : "Add a 6-digit code at sign-in"}</div></div>
            <Toggle on={!!u.totp_enabled} label="Two-factor" onChange={v => setTfa(v ? "on" : "off")} />
          </div>
          <div className="cap" style={{ marginTop: 6 }}>Active sessions</div>
          {sessions.loading && !sl.length ? <div className="skel" style={{ height: 60 }} /> : !sl.length ? <p className="faint" style={{ fontSize: 13 }}>No other sessions.</p>
            : sl.map(s => (
              <div key={s.id} className="list-row">
                <Icon n={/iPhone|Android/.test(s.user_agent || "") ? "phone" : "eye"} s={16} />
                <div className="grow"><b>{device(s.user_agent || "")}</b><div className="mono faint" style={{ fontSize: 11 }}>{s.ip_address || "—"} · {fmtDateTime(s.created_at)}</div></div>
                {s.current ? <span className="pill ok">This device</span> : <button type="button" className="btn sm danger" onClick={() => revoke(s)}>Sign out</button>}
              </div>
            ))}
        </div></Sect></div>

        <div className="s4"><Sect n="04" t="Reminders" cls="t-gold">
          <div className="row" style={{ background: "var(--bg-2)", borderRadius: 18, padding: 14 }}>
            <div className="grow"><b>Daily reminder</b><div style={{ fontSize: 12, opacity: 0.7 }}>Nudge to log routines</div></div>
            <Toggle on={rem.notifications_enabled} disabled={!settings.data} label="Daily reminder" onChange={v => setRem({ notifications_enabled: v })} />
          </div>
          <Field label="Time" style={{ marginTop: 12 }}>
            <input className="input mono" type="time" disabled={!rem.notifications_enabled} value={rem.notification_time} onChange={e => e.target.value && setRem({ notification_time: e.target.value })} style={{ background: "var(--bg-2)" }} />
          </Field>
        </Sect></div>

        <div className="s4"><Sect n="05" t="Appearance">
          <Seg value={theme} onChange={setTheme} label="Theme" options={[["light", "Paper"], ["dark", "Ink"]]} />
          <p className="faint" style={{ fontSize: 12.5, marginTop: 12 }}>Same palette, two moods.</p>
        </Sect></div>

        <div className="s4"><Sect n="06" t="Your data"><div className="stack">
          <button type="button" className="btn" disabled={busy === "csv"} onClick={csv}><Icon n="export" s={15} />{busy === "csv" ? "Preparing…" : "Export activity CSV"}</button>
          <p className="faint" style={{ fontSize: 12.5 }}>Every routine tick, value and note, by date.</p>
        </div></Sect></div>

        <section className="tile s12">
          <div className="th"><div><div className="cap">07</div><h3>Recent <em>activity</em></h3></div></div>
          {log.loading && !log.data ? <div className="skel" style={{ height: 120 }} /> : !events.length ? <Empty title="Nothing yet" body="Sign-ins and security changes show up here." />
            : events.map((l, i) => (
              <div key={i} className="list-row">
                <i style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: l.status_code >= 400 ? "var(--red)" : i ? "var(--line-2)" : "var(--green)" }} />
                <span className="grow">{(EVENT[l.action] || l.action)}{l.status_code >= 400 ? " — failed" : ""}<span className="faint mono" style={{ fontSize: 11 }}> · {l.ip_address || "—"}</span></span>
                <span className="mono faint" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtDateTime(l.created_at)}</span>
              </div>
            ))}
        </section>
      </div>
      {tfa === "on" && <TfaSetup onClose={() => setTfa(null)} onDone={() => { updateUser({ totp_enabled: 1 }); me.setData(x => ({ ...x, totp_enabled: 1 })); }} />}
      {tfa === "off" && <TfaOff onClose={() => setTfa(null)} onDone={onSignOut} />}
    </>
  );
}

function TfaSetup({ onClose, onDone }) {
  const api = useApi();
  const { toast } = useUI();
  const qr = useLoad(api, a => a.post("/2fa/setup"), "", null);
  const [c, setC] = useState(""), [busy, setBusy] = useState(false);
  const verify = async () => {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    try { await api.post("/2fa/enable", { token: c }); toast("Two-factor is on"); onDone(); onClose(); }
    catch (e) { toast(e.message, "err"); setC(""); setBusy(false); }
  };
  return (
    <Modal size="sm" kicker="Security" title="Turn on 2FA" onClose={onClose}
      foot={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn primary" disabled={c.length !== 6 || busy} onClick={verify}>Verify</button></>}>
      {qr.error ? <Empty title="Couldn't start setup" body={qr.error} />
        : qr.data ? <img src={qr.data.qr_code_data_url} alt="QR code for your authenticator app" width={180} height={180} style={{ display: "block", margin: "0 auto", borderRadius: 18, background: "#fff", padding: 10 }} />
          : <div className="skel" style={{ width: 180, height: 180, margin: "0 auto" }} />}
      {qr.data?.secret && <p className="mono faint" style={{ fontSize: 11, textAlign: "center", wordBreak: "break-all" }}>Or enter: {qr.data.secret}</p>}
      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>Scan with your authenticator, then enter the 6-digit code.</p>
      <input className="input mono" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-label="Code" value={c} onChange={e => setC(e.target.value.replace(/\D/g, ""))}
        onKeyDown={e => e.key === "Enter" && verify()} placeholder="000000" style={{ fontSize: 28, textAlign: "center", letterSpacing: ".4em", height: 62 }} />
    </Modal>
  );
}

function TfaOff({ onClose, onDone }) {
  const api = useApi();
  const { toast } = useUI();
  const [p, setP] = useState(""), [busy, setBusy] = useState(false);
  const off = async () => {
    if (!p || busy) return;
    setBusy(true);
    try { await api.post("/2fa/disable", { password: p }); toast("Two-factor is off — sign in again"); onClose(); onDone(); }
    catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal size="sm" kicker="Security" title="Turn off 2FA?" onClose={onClose}
      foot={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn danger solid" disabled={!p || busy} onClick={off}>Turn off</button></>}>
      <p className="muted" style={{ fontSize: 13 }}>Enter your password to confirm. Every session is signed out, including this one.</p>
      <Field label="Password" req><input className="input" type="password" autoFocus autoComplete="current-password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === "Enter" && off()} /></Field>
    </Modal>
  );
}

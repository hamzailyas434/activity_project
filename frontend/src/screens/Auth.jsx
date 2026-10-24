import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import { Field, Icon, PwStrength, Toggle, pwOk } from "../components/ui";
import { go } from "../shell/route";

const TONES = ["#E5432F", "#E9B44C", "#58B98B", "#7A9BF5", "#A98BF0"];

async function post(path, body) {
  const res = await fetch(API_BASE_URL + path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  return { res, data };
}
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Welcome() {
  return (
    <div style={{ minHeight: "100vh", padding: "calc(clamp(20px,4vw,48px) + env(safe-area-inset-top)) clamp(16px,4vw,48px) clamp(20px,4vw,48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="row sb"><div className="brand"><i /><span>Rhythm</span></div>
        <div className="row"><button type="button" className="btn ghost" onClick={() => go("login")}>Sign in</button><button type="button" className="btn primary" onClick={() => go("register")}>Get started</button></div></div>
      <div className="welcome" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 40, alignItems: "center", padding: "40px 0" }}>
        <div>
          <div className="hd" style={{ display: "block", margin: 0 }}><div className="eyebrow"><b>✦</b>Habits · prayers · notes · money</div></div>
          <h1 className="serif" style={{ fontSize: "clamp(64px,10vw,168px)", lineHeight: 0.86 }}>Keep your days <em style={{ color: "var(--red)" }}>in orbit</em>.</h1>
          <p style={{ fontSize: 18, color: "var(--fg-2)", maxWidth: 480, marginTop: 22, lineHeight: 1.5 }}>Routines, Qaza, notes worth remembering, family money and the books you are reading — one calm place.</p>
          <div className="row wrap" style={{ marginTop: 28 }}>
            <button type="button" className="btn red" style={{ height: 52, padding: "0 26px", fontSize: 15 }} onClick={() => go("register")}>Start free <Icon n="arrow" s={16} /></button>
            <button type="button" className="btn" style={{ height: 52 }} onClick={() => go("login")}>I have an account</button>
          </div>
        </div>
        <div aria-hidden="true" style={{ position: "relative", aspectRatio: "1", maxWidth: 520, width: "100%", justifySelf: "center" }}>
          {TONES.map((c, i) => <i key={c} style={{ position: "absolute", inset: `${i * 9}%`, borderRadius: "50%", border: `${14 - i * 2}px solid ${c}`, borderTopColor: "transparent", animation: `orbit ${18 + i * 6}s linear infinite ${i % 2 ? "reverse" : ""}` }} />)}
          <div style={{ position: "absolute", inset: "38%", borderRadius: "50%", background: "var(--fg)", color: "var(--bg)", display: "grid", placeContent: "center", textAlign: "center" }}>
            <b className="serif" style={{ fontSize: "clamp(24px,4vw,40px)", lineHeight: 1 }}>88%</b><span className="mono" style={{ fontSize: 10 }}>today</span></div>
        </div>
      </div>
      <style>{"@keyframes orbit{to{transform:rotate(360deg)}}@media (max-width:860px){.welcome{grid-template-columns:1fr!important}}"}</style>
    </div>
  );
}

export default function Auth({ mode }) {
  const { login } = useAuth();
  const reg = mode === "register";
  const [f, setF] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [remember, setRemember] = useState(() => localStorage.getItem("rememberMe") !== "false");
  const [err, setErr] = useState(""), [touched, setTouched] = useState({}), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const [lock, setLock] = useState(0), [step, setStep] = useState("cred"), [code, setCode] = useState(""), [temp, setTemp] = useState(null);

  const locked = lock > 0;
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setLock(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr(""); };
  const blur = k => () => setTouched(t => ({ ...t, [k]: true }));
  const errs = {
    username: !f.username.trim() ? "Required" : reg && (f.username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(f.username.trim())) ? "3–30 letters, digits, _ . -" : "",
    email: reg && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email" : "",
    password: !f.password ? "Required" : reg && !pwOk(f.password) ? "8+ characters with upper, lower, number and symbol" : "",
    confirmPassword: reg && f.confirmPassword !== f.password ? "Passwords don't match" : "",
  };
  const show_ = k => touched[k] && errs[k];

  const finish = (data, rem) => { localStorage.setItem("rememberMe", rem ? "true" : "false"); login(data.user, data.token, rem); go("dashboard"); };

  const submit = async e => {
    e.preventDefault();
    if (locked || busy) return;
    const keys = reg ? ["username", "email", "password", "confirmPassword"] : ["username", "password"];
    setTouched(Object.fromEntries(keys.map(k => [k, true])));
    if (keys.some(k => errs[k])) return;
    setBusy(true); setErr("");
    try {
      if (reg) {
        const { res, data } = await post("/users/register", { username: f.username.trim(), email: f.email.trim(), password: f.password });
        if (!res.ok) throw new Error(data.error || "We couldn't create your account. Try again.");
        finish(data, false);
      } else {
        const { res, data } = await post("/users/login", { username: f.username.trim(), password: f.password });
        if (res.status === 429) {
          const secs = data.lockoutSeconds ?? (() => { const r = res.headers.get("RateLimit-Reset"); return r ? Math.max(0, Math.ceil(Number(r))) : 60; })();
          setLock(secs);
          throw new Error(data.error || "Too many attempts.");
        }
        if (!res.ok) throw new Error(data.error || "Wrong username or password.");
        if (data.requires2FA) { setTemp(data.tempToken); setStep("2fa"); return; }
        finish(data, remember);
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async e => {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true); setErr("");
    try {
      const { res, data } = await post("/users/login/2fa", { tempToken: temp, totpToken: code });
      if (!res.ok) throw new Error(data.error || "That code didn't work. Try the newest one.");
      finish(data, remember);
    } catch (e2) { setErr(e2.message); setCode(""); }
    finally { setBusy(false); }
  };

  if (mode === "welcome") return <Welcome />;

  const banner = (err || locked) && (
    <div role="alert" style={{ background: "var(--accent-soft)", color: "var(--err)", borderRadius: 16, padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>
      {locked ? <>Too many attempts. Try again in <span className="mono">{mmss(lock)}</span></> : err}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "calc(20px + env(safe-area-inset-top)) 16px 20px" }}>
      <div className="tile" style={{ width: "min(460px,100%)", padding: "clamp(24px,4vw,40px)", borderRadius: 32 }}>
        <button type="button" className="btn ghost sm" onClick={() => (step === "2fa" ? (setStep("cred"), setErr("")) : go("welcome"))} style={{ marginBottom: 16 }}><Icon n="chevL" s={14} />Back</button>
        {step === "2fa" ? (
          <form onSubmit={verify} className="stack" style={{ gap: 14 }}>
            <h1 className="serif" style={{ fontSize: 52, lineHeight: 0.95 }}>One more <em style={{ color: "var(--red)" }}>step</em>.</h1>
            <p className="muted">Enter the 6-digit code from your authenticator.</p>
            {banner}
            <input className="input mono" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-label="Code" value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="000000" style={{ fontSize: 30, textAlign: "center", letterSpacing: ".4em", height: 66 }} />
            <button type="submit" className="btn primary" style={{ width: "100%", height: 50 }} disabled={code.length !== 6 || busy}>{busy ? "Checking…" : "Verify"}</button>
            <button type="button" className="btn ghost" style={{ width: "100%" }} onClick={() => { setStep("cred"); setCode(""); setErr(""); }}>Use a different account</button>
          </form>
        ) : (
          <form onSubmit={submit} className="stack" style={{ gap: 14 }} noValidate>
            <h1 className="serif" style={{ fontSize: 56, lineHeight: 0.92 }}>{reg ? <>Make it <em style={{ color: "var(--red)" }}>yours</em>.</> : <>Welcome <em style={{ color: "var(--red)" }}>back</em>.</>}</h1>
            <p className="muted" style={{ marginBottom: 6 }}>{reg ? "Free forever. Takes a minute." : "Sign in to keep your rhythm."}</p>
            {banner}
            <Field label={reg ? "Username" : "Username or email"} req err={show_("username")}>
              <input className={"input" + (show_("username") ? " bad" : "")} autoFocus value={f.username} onChange={set("username")} onBlur={blur("username")} autoComplete="username" autoCapitalize="none" spellCheck={false} />
            </Field>
            {reg && <Field label="Email" req err={show_("email")}>
              <input className={"input" + (show_("email") ? " bad" : "")} type="email" value={f.email} onChange={set("email")} onBlur={blur("email")} autoComplete="email" placeholder="you@example.com" />
            </Field>}
            <Field label="Password" req err={show_("password")}>
              <div className="pre" style={show_("password") ? { borderColor: "var(--err)" } : undefined}>
                <input type={show ? "text" : "password"} value={f.password} onChange={set("password")} onBlur={blur("password")} style={{ paddingLeft: 16, fontFamily: "inherit" }} autoComplete={reg ? "new-password" : "current-password"} aria-label="Password" />
                <button type="button" className="btn ghost sm icon" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(v => !v)}><Icon n={show ? "eyeOff" : "eye"} s={15} /></button>
              </div>
            </Field>
            {reg && f.password && <PwStrength value={f.password} />}
            {reg && <Field label="Confirm password" req err={show_("confirmPassword")}>
              <input className={"input" + (show_("confirmPassword") ? " bad" : "")} type={show ? "text" : "password"} value={f.confirmPassword} onChange={set("confirmPassword")} onBlur={blur("confirmPassword")} autoComplete="new-password" />
            </Field>}
            {!reg && <div className="row" style={{ gap: 10, fontSize: 13, fontWeight: 600 }}><Toggle on={remember} label="Remember me" onChange={setRemember} /><span>Remember me</span></div>}
            <button className="btn red" type="submit" disabled={locked || busy} style={{ height: 52, fontSize: 15 }}>{busy ? "One moment…" : reg ? "Create account" : "Sign in"} <Icon n="arrow" s={16} /></button>
            <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>{reg ? "Already have an account? " : "New here? "}
              <a href={reg ? "#/login" : "#/register"} onClick={() => { setErr(""); setTouched({}); }}>{reg ? "Sign in" : "Create one"}</a></p>
          </form>
        )}
      </div>
    </div>
  );
}

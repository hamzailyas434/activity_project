import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { API_BASE_URL } from "../../config";
import AuthBrandLockup from "./AuthBrandLockup";

const FEATURES = [
  "Daily habit tracking with streaks",
  "Visual monthly calendar",
  "Notes & Q&A organiser",
  "Qaza Namaz counter",
  "Expenses, books, favourites",
];

function Login({ onLogin, onSwitchToRegister, onBack }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [remember, setRemember] = useState(() => localStorage.getItem("rememberMe") === "true");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("credentials");
  const [tempToken, setTempToken] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const countdownRef = useRef(null);

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const fieldsRef = useRef([]);
  const btnRef = useRef(null);
  const switchRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    const allEls = [
      leftRef.current,
      rightRef.current,
      titleRef.current,
      subRef.current,
      ...fieldsRef.current.filter(Boolean),
      btnRef.current,
      switchRef.current,
    ].filter(Boolean);
    gsap.set(allEls, { clearProps: "all" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.05 });
      tl.fromTo(leftRef.current, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: "power3.out" })
        .fromTo(rightRef.current, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, ease: "power3.out" }, "<")
        .fromTo(titleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.3")
        .fromTo(subRef.current, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, "-=0.3")
        .fromTo(
          fieldsRef.current.filter(Boolean),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.09, ease: "power3.out" },
          "-=0.2"
        )
        .fromTo(
          [btnRef.current, switchRef.current].filter(Boolean),
          { y: 14, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.07, ease: "power3.out", clearProps: "y,scale,opacity" },
          "-=0.15"
        );
    });
    return () => ctx.revert();
  }, []);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setLockoutSeconds(0);
  };

  const startCountdown = useCallback(seconds => {
    clearInterval(countdownRef.current);
    setLockoutSeconds(seconds);
    countdownRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (step === "2fa") {
        const res = await fetch(`${API_BASE_URL}/users/login/2fa`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempToken, totpToken: totpCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid 2FA code");
        localStorage.setItem("rememberMe", remember ? "true" : "false");
        onLogin(data.user, data.token, remember);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const secs =
            data.lockoutSeconds ??
            (() => {
              const reset = res.headers.get("RateLimit-Reset");
              return reset ? Math.max(0, Math.ceil(Number(reset) - Date.now() / 1000)) : 0;
            })();
          if (secs > 0) startCountdown(secs);
        }
        throw new Error(data.error || "Login failed");
      }
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setStep("2fa");
        return;
      }
      localStorage.setItem("rememberMe", remember ? "true" : "false");
      onLogin(data.user, data.token, remember);
    } catch (err) {
      setError(err.message || "We couldn't sign you in. Check your details and try again.");
      if (errorRef.current) gsap.fromTo(errorRef.current, { x: 0 }, { x: [-6, 6, -4, 4, 0], duration: 0.4, ease: "power2.out" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div ref={leftRef} className="auth-panel--brand max-md:hidden">
        <div className="auth-left-grid" aria-hidden />
        <div className="auth-panel--brand-inner">
          <div className="auth-brand-lockup">
            <AuthBrandLockup />
          </div>
          <h2 className="auth-brand-title">A quieter way to keep your days.</h2>
          <p className="auth-brand-lead">
            Track habits, prayers, notes, and spending in one calm dashboard.
          </p>
          <div className="auth-feature-list">
            {FEATURES.map(f => (
              <div key={f} className="auth-feature-row">
                <svg viewBox="0 0 16 16" width="15" height="15" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3.5 3.5L13 4" />
                </svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={rightRef} className="auth-panel--form">
        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <AuthBrandLockup />
          </div>

          {onBack && (
            <button type="button" className="auth-back-link" onClick={onBack}>
              ← Back
            </button>
          )}

          <h1 ref={titleRef} className="auth-title">
            Welcome back
          </h1>
          <p ref={subRef} className="auth-subtitle">
            Sign in to continue to your dashboard.
          </p>

          {error && (
            <div ref={errorRef} className="auth-error" role="alert">
              {error}
              {lockoutSeconds > 0 && (
                <div className="num mt-1 font-semibold">
                  Try again in {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, "0")}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === "2fa" ? (
              <div className="auth-field">
                <p className="auth-2fa-hint">Enter the 6-digit code from your authenticator app.</p>
                <label htmlFor="totp" className="auth-label">
                  Authentication code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="auth-input auth-input--otp num"
                />
                <button
                  type="button"
                  className="auth-text-btn"
                  onClick={() => {
                    setStep("credentials");
                    setTempToken(null);
                    setTotpCode("");
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              [
                {
                  id: "username",
                  label: "Username or email",
                  type: "text",
                  autoComplete: "username",
                  placeholder: "you@example.com",
                },
                {
                  id: "password",
                  label: "Password",
                  type: "password",
                  autoComplete: "current-password",
                  placeholder: "••••••••",
                },
              ].map((field, i) => (
                <div key={field.id} className="auth-field" ref={el => (fieldsRef.current[i] = el)}>
                  <label htmlFor={field.id} className="auth-label">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleChange}
                    required
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    className="auth-input"
                  />
                </div>
              ))
            )}

            {step !== "2fa" && (
              <label className="auth-remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span>Remember me on this device</span>
              </label>
            )}

            <button
              type="submit"
              ref={btnRef}
              disabled={loading || lockoutSeconds > 0}
              className="btn btn-primary auth-submit-btn"
            >
              {loading ? (step === "2fa" ? "Verifying…" : "Signing in…") : step === "2fa" ? "Verify" : "Sign in"}
            </button>
          </form>

          <div ref={switchRef} className="auth-form-footer">
            No account?{" "}
            <button type="button" className="auth-link-accent" onClick={onSwitchToRegister}>
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

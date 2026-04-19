import { useState, useEffect, useRef } from "react";
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

function Register({ onRegister, onSwitchToLogin, onBack }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power3.out" },
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
  };

  const shakeError = () => {
    if (errorRef.current) gsap.fromTo(errorRef.current, { x: 0 }, { x: [-6, 6, -4, 4, 0], duration: 0.4, ease: "power2.out" });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters.");
      shakeError();
      return;
    }
    const pwd = formData.password;
    if (pwd.length < 8 || !/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/\d/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) {
      setError("Password must be 8+ characters with uppercase, lowercase, number, and a special character.");
      shakeError();
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match.");
      shakeError();
      return;
    }
    setLoading(true);
    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      onRegister(data.user, data.token);
    } catch (err) {
      setError(err.message || "We couldn't create your account. Please try again.");
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: "username", label: "Username", type: "text", autoComplete: "username", placeholder: "At least 3 characters" },
    { id: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
    { id: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "8+ chars, mixed case, number, symbol" },
    { id: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", placeholder: "Repeat password" },
  ];

  return (
    <div className="auth-page">
      <div ref={leftRef} className="auth-panel--brand max-md:hidden">
        <div className="auth-left-grid" aria-hidden />
        <div className="auth-panel--brand-inner">
          <div className="auth-brand-lockup">
            <AuthBrandLockup />
          </div>
          <h2 className="auth-brand-title">A place to keep your days in order.</h2>
          <p className="auth-brand-lead">
            Everything you need to build consistent habits — and nothing you don&apos;t.
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
            Create your account
          </h1>
          <p ref={subRef} className="auth-subtitle">
            Free forever. No credit card required.
          </p>

          {error && (
            <div ref={errorRef} className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {fields.map((field, i) => (
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
            ))}

            <button type="submit" ref={btnRef} disabled={loading} className="btn btn-primary auth-submit-btn mt-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div ref={switchRef} className="auth-form-footer">
            Already have an account?{" "}
            <button type="button" className="auth-link-accent" onClick={onSwitchToLogin}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

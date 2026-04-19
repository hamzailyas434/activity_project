import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

import { API_BASE_URL } from "../../config";

const FEATURES = [
  "Daily habit & prayer tracker",
  "Visual monthly calendar",
  "Notes & Q&A organizer",
  "Qaza Namaz counter",
  "Synced to the cloud",
];

function Register({ onRegister, onSwitchToLogin, onBack }) {
  const [formData, setFormData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const leftRef   = useRef(null);
  const rightRef  = useRef(null);
  const titleRef  = useRef(null);
  const subRef    = useRef(null);
  const fieldsRef = useRef([]);
  const btnRef    = useRef(null);
  const switchRef = useRef(null);
  const errorRef  = useRef(null);
  const orb1Ref   = useRef(null);
  const orb2Ref   = useRef(null);
  const orb3Ref   = useRef(null);
  const glowRefs  = useRef([]);

  useEffect(() => {
    // Reset any leftover GSAP state from Strict Mode double-invoke
    const allEls = [
      leftRef.current, rightRef.current, titleRef.current, subRef.current,
      ...fieldsRef.current.filter(Boolean), btnRef.current, switchRef.current,
    ].filter(Boolean);
    gsap.set(allEls, { clearProps: "all" });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.05 });
      tl.fromTo(leftRef.current,  { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.75, ease: "power3.out" })
        .fromTo(rightRef.current, { x: 80,  opacity: 0 }, { x: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, "<")
        .fromTo(titleRef.current, { y: 24,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.5,  ease: "power3.out" }, "-=0.3")
        .fromTo(subRef.current,   { y: 16,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.4,  ease: "power2.out" }, "-=0.3")
        .fromTo(fieldsRef.current.filter(Boolean), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power3.out" }, "-=0.2")
        .fromTo([btnRef.current, switchRef.current].filter(Boolean), { y: 16, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.4)", clearProps: "y,scale,opacity" }, "-=0.15");

      if (orb1Ref.current) gsap.to(orb1Ref.current, { x: 30, y: -25, duration: 7,  repeat: -1, yoyo: true, ease: "sine.inOut" });
      if (orb2Ref.current) gsap.to(orb2Ref.current, { x: -20, y: 30, duration: 9,  repeat: -1, yoyo: true, ease: "sine.inOut", delay: -3 });
      if (orb3Ref.current) gsap.to(orb3Ref.current, { x: 20, y: 20,  duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut", delay: -6 });
    });
    return () => ctx.revert();
  }, []);

  const handleFocus = (i) => { const g = glowRefs.current[i]; if (g) gsap.to(g, { scaleX: 1, duration: 0.35, ease: "power2.out" }); };
  const handleBlur  = (i) => { const g = glowRefs.current[i]; if (g) gsap.to(g, { scaleX: 0, duration: 0.25, ease: "power2.in"  }); };
  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(""); };

  const shakeError = () => {
    if (errorRef.current) gsap.fromTo(errorRef.current, { x: 0 }, { x: [-8, 8, -6, 6, -3, 3, 0], duration: 0.45, ease: "power2.out" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (formData.username.length < 3) { setError("Username must be at least 3 characters"); shakeError(); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/.test(formData.password)) {
      setError("Password must be 8+ characters with uppercase, lowercase, number, and special character");
      shakeError(); return;
    }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); shakeError(); return; }

    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");
      onRegister(data.user, data.token);
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.");
      shakeError();
    } finally { setLoading(false); }
  };

  const fields = [
    { id: "username", label: "Username", type: "text", autoComplete: "username", placeholder: "Choose a username (min 3 chars)" },
    { id: "email",    label: "Email",    type: "email", autoComplete: "email",    placeholder: "Enter your email" },
    { id: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "Min 8 chars, uppercase, lowercase, number & special char" },
    { id: "confirmPassword", label: "Confirm Password", type: "password", autoComplete: "new-password", placeholder: "Repeat your password" },
  ];

  return (
    <div className="flex min-h-screen bg-white font-[Inter,system-ui,-apple-system,sans-serif] max-md:flex-col">
      {/* ── Left decorative panel ── */}
      <div
        ref={leftRef}
        className="w-[42%] relative overflow-hidden flex flex-col justify-center p-12 border-r border-[#fecdd3] max-md:w-full max-md:min-h-[200px] max-md:p-8 max-md:justify-start"
        style={{ background: "linear-gradient(160deg, #fff5f5 0%, #ffe4e6 50%, #fff1f2 100%)" }}
      >
        <div className="auth-left-grid" />
        <div className="absolute rounded-full pointer-events-none blur-[90px]"
          style={{ width: 380, height: 380, background: "#ef4444", opacity: 0.12, top: -120, left: -100 }} />
        <div className="absolute rounded-full pointer-events-none blur-[90px]"
          style={{ width: 280, height: 280, background: "#f97316", opacity: 0.1, bottom: -80, right: -80 }} />
        <div ref={orb1Ref} className="absolute rounded-full pointer-events-none blur-[1px]"
          style={{ width: 90, height: 90, top: "18%", right: "10%",
            background: "radial-gradient(circle at 35% 35%, rgba(239,68,68,0.5), rgba(239,68,68,0.04))",
            boxShadow: "inset 0 0 24px rgba(239,68,68,0.2), 0 6px 24px rgba(239,68,68,0.12)" }} />
        <div ref={orb2Ref} className="absolute rounded-full pointer-events-none blur-[1px]"
          style={{ width: 56, height: 56, bottom: "22%", left: "8%",
            background: "radial-gradient(circle at 35% 35%, rgba(251,113,133,0.5), rgba(251,113,133,0.04))",
            boxShadow: "inset 0 0 16px rgba(251,113,133,0.2), 0 4px 16px rgba(251,113,133,0.1)" }} />
        <div ref={orb3Ref} className="absolute rounded-full pointer-events-none blur-[1px]"
          style={{ width: 40, height: 40, top: "60%", right: "20%",
            background: "radial-gradient(circle at 35% 35%, rgba(253,186,116,0.6), rgba(253,186,116,0.04))",
            boxShadow: "inset 0 0 12px rgba(253,186,116,0.2)" }} />

        <div className="relative z-[1]">
          <div className="flex items-center gap-[0.6rem] text-[1.3rem] font-extrabold text-[#1e293b] mb-10 tracking-[-0.02em]">
            <span className="text-[1.6rem]">📊</span>
            Activity Tracker
          </div>
          <h2 className="text-[1.8rem] font-extrabold leading-[1.2] tracking-[-0.03em] mb-3 text-[#0f172a]">
            Start your journey<br />today.
          </h2>
          <p className="text-[0.9rem] text-[#64748b] leading-[1.65] mb-10 max-md:hidden">
            Join thousands building better daily habits with a dashboard that keeps them on track.
          </p>
          <div className="flex flex-col gap-3 max-md:hidden">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3 text-[0.88rem] text-[#334155]">
                <span className="w-5 h-5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.35)] rounded-full flex items-center justify-center text-[0.65rem] text-[#ef4444] shrink-0">
                  ✓
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div ref={rightRef} className="flex-1 flex items-center justify-center p-10 bg-white relative max-md:items-start max-md:p-6">
        <div className="w-full max-w-[420px]">
          {onBack && (
            <button
              className="inline-flex items-center gap-[0.35rem] bg-transparent border-none text-[#94a3b8] text-[0.82rem] cursor-pointer p-0 mb-8 transition-colors duration-200 font-[inherit] hover:text-[#ef4444]"
              onClick={onBack}
            >
              ← Back to site
            </button>
          )}

          <h1 ref={titleRef} className="text-[1.9rem] font-extrabold text-[#0f172a] m-0 mb-[0.4rem] tracking-[-0.025em]">
            Create account.
          </h1>
          <p ref={subRef} className="text-[0.9rem] text-[#94a3b8] m-0 mb-10">
            Free forever. No credit card required.
          </p>

          {error && (
            <div ref={errorRef} className="bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.25)] text-[#dc2626] px-4 py-[0.7rem] rounded-lg mb-6 text-[0.875rem]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {fields.map((field, i) => (
              <div key={field.id} className="mb-6 relative" ref={el => (fieldsRef.current[i] = el)}>
                <label htmlFor={field.id} className="block text-[0.78rem] font-bold text-[#475569] mb-[0.45rem] tracking-[0.05em] uppercase">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.id}
                    value={formData[field.id]}
                    onChange={handleChange}
                    onFocus={() => handleFocus(i)}
                    onBlur={() => handleBlur(i)}
                    required
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    className="w-full bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] rounded-[10px] text-[#0f172a] text-[0.95rem] px-4 py-[0.8rem] outline-none transition-all duration-200 font-[inherit] placeholder:text-[#cbd5e1] focus:border-[#ef4444] focus:bg-white focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] box-border"
                  />
                  <div className="auth-input-glow" ref={el => (glowRefs.current[i] = el)} />
                </div>
              </div>
            ))}

            <button
              type="submit"
              ref={btnRef}
              disabled={loading}
              className="auth-submit-btn relative overflow-hidden w-full px-4 py-[0.9rem] text-white border-none rounded-[10px] text-base font-bold cursor-pointer mt-2 transition-all duration-200 font-[inherit] tracking-[0.01em] hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(239,68,68,0.4)] disabled:opacity-55 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <div ref={switchRef} className="text-center mt-7 text-[0.875rem] text-[#94a3b8]">
            Already have an account?
            <button
              className="bg-transparent border-none text-[#ef4444] font-semibold cursor-pointer p-0 ml-1 font-[inherit] text-[inherit] transition-colors duration-200 hover:text-[#dc2626]"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

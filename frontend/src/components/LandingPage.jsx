import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    title: "Activities",
    desc: "Daily check-offs, streaks, and a month view that fills in as you go.",
  },
  {
    title: "Notes & Q&A",
    desc: "Categories, links, best-answer marking, and instant search across everything you save.",
  },
  {
    title: "Qaza Namaz",
    desc: "A quiet place to count missed prayers and track your progress over time.",
  },
  {
    title: "Expenses",
    desc: "Monthly ledger with category rollups. Know where every rupee went.",
  },
  {
    title: "Books",
    desc: "Reading dashboard, progress tracking, page notes, and highlights in one place.",
  },
  {
    title: "Sticky notes",
    desc: "Quick colored notes pinned to your dashboard. Always visible, instantly editable.",
  },
];

const PLANS = [
  {
    name: "Free", price: "$0", period: "for keeping your own days",
    badge: null, ctaStyle: "outline", cta: "Get started",
    features: ["Up to 5 daily activities", "Monthly calendar view", "10 notes", "Qaza Namaz tracker"],
  },
  {
    name: "Pro", price: "$4", period: "per month",
    badge: "Most popular", ctaStyle: "solid", cta: "Start Pro",
    features: ["Unlimited activities", "Unlimited notes", "Expenses & books", "Data export", "Priority support"],
  },
  {
    name: "Team", price: "$12", period: "per month",
    badge: null, ctaStyle: "outline", cta: "Contact us",
    features: ["Everything in Pro", "Up to 5 accounts", "Shared activity boards", "Admin dashboard"],
  },
];

function LandingPage({ onGetStarted, onLogin }) {
  const rootRef   = useRef(null);
  const navRef    = useRef(null);
  const titleRef  = useRef(null);
  const subRef    = useRef(null);
  const ctasRef   = useRef(null);
  const mockupRef = useRef(null);
  const heroRef   = useRef(null);
  const featureCardsRef = useRef([]);
  const pricingCardsRef = useRef([]);
  const featuresSectionRef = useRef(null);
  const pricingSectionRef  = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -60, opacity: 0, duration: 0.6, ease: "power3.out" });

      const tl = gsap.timeline({ delay: 0.15 });
      tl
        .from(titleRef.current, { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" })
        .from(subRef.current,   { y: 24, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
        .from(ctasRef.current?.children ?? [], { y: 18, opacity: 0, scale: 0.95, duration: 0.5, stagger: 0.1, ease: "power3.out" }, "-=0.3")
        .from(mockupRef.current, { x: 80, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.8");

      gsap.to(mockupRef.current, { y: -10, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut" });

      featureCardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
          y: 40, opacity: 0, duration: 0.6, delay: i * 0.07, ease: "power3.out",
        });
      });

      gsap.from(featuresSectionRef.current?.querySelectorAll(".lp-section-label, .lp-section-title, .lp-section-sub") ?? [], {
        scrollTrigger: { trigger: featuresSectionRef.current, start: "top 82%" },
        y: 32, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
      });

      pricingCardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
          y: 48, opacity: 0, duration: 0.65, delay: i * 0.1, ease: "power3.out",
        });
      });

      gsap.from(pricingSectionRef.current?.querySelectorAll(".lp-section-label, .lp-section-title, .lp-section-sub") ?? [], {
        scrollTrigger: { trigger: pricingSectionRef.current, start: "top 82%" },
        y: 32, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const scrollToFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div ref={rootRef} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)", fontFamily: "var(--font-sans)", overflowX: "hidden" }}>

      {/* ── Navbar ── */}
      <nav ref={navRef} style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/rhythm-logo.svg" alt="Rhythm" width={24} height={24} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19, letterSpacing: "-0.02em", color: "var(--fg)" }}>
              Rhythm
            </span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={onLogin}
              style={{
                padding: "8px 16px", background: "transparent",
                border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                color: "var(--fg-muted)", cursor: "pointer",
                transition: "background var(--dur-fast), color var(--dur-fast)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-raised-hover)"; e.currentTarget.style.color = "var(--fg)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg-muted)"; }}
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              style={{
                padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)",
                border: "none", borderRadius: "var(--r-md)",
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "background var(--dur-fast) var(--ease)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)"; }}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        style={{ minHeight: "calc(100vh - 58px)", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        {/* Subtle dot grid */}
        <div className="lp-dot-grid" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px", display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "center", width: "100%" }}>
          <div style={{ maxWidth: 580 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>A quieter way to keep your days</div>

            <h1 ref={titleRef} style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(38px, 6vw, 64px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 20px", color: "var(--fg)" }}>
              Track habits, prayers, notes, and spending in one calm dashboard.
            </h1>

            <p ref={subRef} style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 500 }}>
              No streak-shaming. No confetti. Just a quiet place to record what matters, and see it build over time.
            </p>

            <div ref={ctasRef} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={onGetStarted}
                style={{
                  padding: "13px 24px", background: "var(--accent)", color: "#fff",
                  border: "none", borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
                  cursor: "pointer", transition: "background var(--dur-fast) var(--ease)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
              >
                Start for free
              </button>
              <button
                onClick={scrollToFeatures}
                style={{
                  padding: "12px 24px", background: "transparent",
                  border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
                  color: "var(--fg)", cursor: "pointer",
                  transition: "background var(--dur-fast)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-raised-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                See what's inside
              </button>
            </div>

            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--fg-faint)", marginTop: 14 }}>
              No credit card required · Free plan always available
            </p>
          </div>

          {/* Dashboard mockup */}
          <div style={{ position: "relative" }} className="max-lg:hidden">
            <div
              ref={mockupRef}
              style={{
                width: 320, borderRadius: "var(--r-xl)",
                border: "1px solid var(--border)",
                background: "var(--bg-raised)",
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
              }}
            >
              {/* Mock topbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border-faint)", background: "var(--bg)" }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--accent)" }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500, color: "var(--fg)", letterSpacing: "-0.01em" }}>Rhythm</span>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-muted)" }}>April 2026</span>
              </div>
              {/* Mock content */}
              <div style={{ padding: "14px" }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>Today&apos;s progress</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>67%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: "var(--border-faint)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "67%", background: "var(--accent)", borderRadius: 999 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  {["Fajr ✓", "Quran ✓", "Tajweed ✓", "Dua ✓", "Zohar", "Asr"].map((item, i) => (
                    <div key={i} style={{
                      padding: "6px 8px", borderRadius: "var(--r-sm)", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500,
                      background: item.includes("✓") ? "var(--accent-weak)" : "var(--bg-sunken)",
                      color: item.includes("✓") ? "var(--accent)" : "var(--fg-muted)",
                      border: `1px solid ${item.includes("✓") ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--border-faint)"}`,
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Mini calendar strip */}
                <div style={{ display: "flex", gap: 4 }}>
                  {["M","T","W","T","F","S","S"].map((d, i) => (
                    <div key={i} style={{
                      flex: 1, padding: "5px 0", borderRadius: "var(--r-sm)", fontSize: 9,
                      fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "center",
                      background: i < 5 ? "var(--sage-500)" : "var(--bg-sunken)",
                      color: i < 5 ? "#fff" : "var(--fg-muted)",
                    }}>{d}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" ref={featuresSectionRef} style={{ padding: "80px 0", background: "var(--bg-raised)", borderTop: "1px solid var(--border-faint)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="eyebrow lp-section-label" style={{ marginBottom: 14 }}>What&apos;s inside</div>
            <h2 className="lp-section-title" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "var(--text-4xl)", letterSpacing: "-0.025em", lineHeight: 1.08, margin: "0 0 16px", color: "var(--fg)" }}>
              Everything in one calm surface.
            </h2>
            <p className="lp-section-sub" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--fg-muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.55 }}>
              From daily prayer tracking to rich Q&amp;A notes — every tool you need to build better habits.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                ref={el => (featureCardsRef.current[i] = el)}
                style={{
                  padding: "24px 8px 8px", borderRadius: 0,
                  borderTop: "2px solid var(--border)",
                }}
              >
                <h3 style={{
                  fontFamily: "var(--font-display)", fontSize: "var(--text-xl)",
                  fontWeight: 500, letterSpacing: "-0.01em",
                  color: "var(--fg)", margin: "0 0 8px",
                }}>{f.title}</h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--fg-muted)", margin: 0, lineHeight: 1.55 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" ref={pricingSectionRef} style={{ padding: "80px 0", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="eyebrow lp-section-label" style={{ marginBottom: 14 }}>Pricing</div>
            <h2 className="lp-section-title" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "var(--text-3xl)", letterSpacing: "-0.025em", margin: "0 0 14px", color: "var(--fg)" }}>
              Simple, honest pricing.
            </h2>
            <p className="lp-section-sub" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--fg-muted)", margin: 0, lineHeight: 1.55 }}>
              Start free. Upgrade when you need more than one month of history.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                ref={el => (pricingCardsRef.current[i] = el)}
                style={{
                  position: "relative",
                  background: "var(--bg-raised)",
                  border: `1px solid ${plan.badge ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--r-lg)",
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: plan.badge ? "var(--shadow-md)" : "var(--shadow-sm)",
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -11, right: 20,
                    background: "var(--accent)", color: "#fff",
                    fontSize: "var(--text-xs)", letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "3px 10px", borderRadius: "var(--r-full)", fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                  }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 500, marginBottom: 10, color: "var(--fg)" }}>
                  {plan.name}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span className="num" style={{ fontSize: "var(--text-4xl)", fontWeight: 600, color: "var(--fg)" }}>{plan.price}</span>
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginBottom: 20 }}>
                  {plan.period}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {plan.features.map(feat => (
                    <li key={feat} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--fg)" }}>
                      <svg viewBox="0 0 16 16" width="14" height="14" style={{ flexShrink: 0, marginTop: 2, color: "var(--accent)" }} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3.5 3.5L13 4"/>
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: "var(--r-md)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background var(--dur-fast) var(--ease), border-color var(--dur-fast)",
                    background: plan.ctaStyle === "solid" ? "var(--accent)" : "transparent",
                    color: plan.ctaStyle === "solid" ? "#fff" : "var(--accent)",
                    border: `1px solid ${plan.ctaStyle === "solid" ? "var(--accent)" : "var(--accent)"}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = plan.ctaStyle === "solid" ? "var(--accent-hover)" : "var(--accent-weak)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = plan.ctaStyle === "solid" ? "var(--accent)" : "transparent"; }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid var(--border-faint)", textAlign: "center" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <img src="/rhythm-logo.svg" alt="Rhythm" width={20} height={20} style={{ borderRadius: 4 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 16, letterSpacing: "-0.02em", color: "var(--fg)" }}>Rhythm</span>
          </span>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--fg-muted)", margin: 0 }}>
            A quieter way to keep your days.
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--fg-faint)", margin: "6px 0 0" }}>
            © 2026 Rhythm. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

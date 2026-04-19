import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { icon: "📅", title: "Daily Activity Tracker", desc: "Check off routines every day. See streaks build as you stay consistent with your habits." },
  { icon: "📊", title: "Monthly Progress Calendar", desc: "A full visual grid of every day this month — color-coded completions at a glance." },
  { icon: "📝", title: "Notes & Q&A Organizer", desc: "Save questions and answers by category. Attach links, mark the best answers, and search instantly." },
  { icon: "🕌", title: "Qaza Namaz Tracker", desc: "Keep an accurate count of missed prayers and track your make-up progress over time." },
  { icon: "📌", title: "Quick Sticky Notes", desc: "Pin colorful notes right on your dashboard. Always visible, instantly editable." },
  { icon: "💾", title: "Data Export", desc: "Export all your activity data whenever you need it — your data, always under your control." },
];

const PLANS = [
  {
    name: "Free", price: "$0", period: "forever", badge: null,
    features: ["Up to 5 daily activities","Monthly calendar view","Basic notes (10 max)","Qaza Namaz tracker","Community support"],
    cta: "Get Started Free", ctaStyle: "outline",
  },
  {
    name: "Pro", price: "$4", period: "per month", badge: "Most Popular",
    features: ["Unlimited activities","Full progress analytics","Unlimited notes & answers","Sticky notes panel","Data export","Priority support"],
    cta: "Start Pro", ctaStyle: "solid",
  },
  {
    name: "Team", price: "$12", period: "per month", badge: null,
    features: ["Everything in Pro","Up to 5 accounts","Shared activity boards","Admin dashboard","Dedicated support"],
    cta: "Contact Us", ctaStyle: "outline",
  },
];

function LandingPage({ onGetStarted, onLogin }) {
  const rootRef = useRef(null);
  const navRef  = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);
  const subRef   = useRef(null);
  const ctasRef  = useRef(null);
  const noteRef  = useRef(null);
  const mockupRef = useRef(null);
  const heroRef  = useRef(null);
  const glow1Ref = useRef(null);
  const glow2Ref = useRef(null);
  const featureCardsRef = useRef([]);
  const pricingCardsRef = useRef([]);
  const featuresSectionRef = useRef(null);
  const pricingSectionRef  = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -80, opacity: 0, duration: 0.8, ease: "power3.out" });

      const heroTl = gsap.timeline({ delay: 0.2 });
      heroTl
        .from(badgeRef.current, { y: 30, opacity: 0, scale: 0.85, duration: 0.6, ease: "back.out(1.7)" })
        .from(titleRef.current.querySelectorAll(".lp-title-word"), { y: 80, opacity: 0, rotationX: -60, transformOrigin: "0% 50% -40px", duration: 0.8, stagger: 0.12, ease: "power4.out" }, "-=0.2")
        .from(subRef.current,  { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
        .from(ctasRef.current.children, { y: 20, opacity: 0, scale: 0.9, duration: 0.6, stagger: 0.1, ease: "back.out(1.4)" }, "-=0.3")
        .from(noteRef.current, { opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")
        .from(mockupRef.current, { x: 120, opacity: 0, rotationY: 30, scale: 0.88, duration: 1.0, ease: "power3.out" }, "-=1.0");

      gsap.to(mockupRef.current, { y: -14, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut" });

      if (orb1Ref.current) gsap.to(orb1Ref.current, { x: 80, y: -60, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      if (orb2Ref.current) gsap.to(orb2Ref.current, { x: -60, y: 80, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut", delay: -4 });
      if (orb3Ref.current) gsap.to(orb3Ref.current, { x: 50, y: 50, duration: 13, repeat: -1, yoyo: true, ease: "sine.inOut", delay: -7 });

      featureCardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
          y: 60, opacity: 0, scale: 0.92, rotationX: 12, transformOrigin: "50% 100%",
          duration: 0.7, delay: i * 0.08, ease: "power3.out",
        });
      });

      gsap.from(featuresSectionRef.current?.querySelectorAll(".lp-section-label, .lp-section-title, .lp-section-sub") ?? [], {
        scrollTrigger: { trigger: featuresSectionRef.current, start: "top 80%" },
        y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
      });

      pricingCardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
          y: 70, opacity: 0, scale: 0.9, duration: 0.75, delay: i * 0.12, ease: "back.out(1.2)",
        });
      });

      gsap.from(pricingSectionRef.current?.querySelectorAll(".lp-section-label, .lp-section-title, .lp-section-sub") ?? [], {
        scrollTrigger: { trigger: pricingSectionRef.current, start: "top 80%" },
        y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
      });
    }, rootRef);

    const hero   = heroRef.current;
    const mockup = mockupRef.current;
    if (!hero || !mockup) return () => ctx.revert();

    const handleMouseMove = (e) => {
      const { left, top, width, height } = hero.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      gsap.to(mockup, { rotationY: x * 22, rotationX: -y * 16, duration: 0.5, ease: "power2.out", transformPerspective: 900 });
      if (glow1Ref.current) gsap.to(glow1Ref.current, { x: x * 60, y: y * 40, duration: 1.2, ease: "power2.out" });
      if (glow2Ref.current) gsap.to(glow2Ref.current, { x: -x * 40, y: -y * 30, duration: 1.5, ease: "power2.out" });
    };

    const handleMouseLeave = () => {
      gsap.to(mockup, { rotationY: -4, rotationX: 2, duration: 0.8, ease: "elastic.out(1, 0.5)", transformPerspective: 900 });
    };

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      ctx.revert();
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-white font-[Inter,system-ui,-apple-system,sans-serif] overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav ref={navRef} className="sticky top-0 z-[100] bg-white/85 backdrop-blur-[12px] border-b border-[#f1f5f9]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[1.2rem] font-extrabold text-[#0f172a] tracking-[-0.02em]">
            <span className="text-[1.4rem]">📊</span>
            Activity Tracker
          </span>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 bg-transparent border border-[#e2e8f0] rounded-[10px] text-[0.875rem] font-semibold text-[#64748b] cursor-pointer transition-all duration-200 hover:bg-[#f8fafc] hover:border-[#6366f1] hover:text-[#6366f1]"
              onClick={onLogin}
            >
              Login
            </button>
            <button
              className="px-4 py-2 border-none rounded-[10px] text-[0.875rem] font-semibold text-white cursor-pointer transition-all duration-200 hover:opacity-90 hover:translate-y-[-1px]"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
              onClick={onGetStarted}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-[calc(100vh-72px)] flex items-center"
        style={{ background: "linear-gradient(160deg, #f9fafb 0%, #eef2ff 50%, #f0fdf4 100%)" }}
      >
        {/* Ambient glows */}
        <div ref={glow1Ref} className="absolute rounded-full pointer-events-none blur-[120px]"
          style={{ width: 600, height: 600, background: "rgba(99,102,241,0.15)", top: -200, left: -200 }} />
        <div ref={glow2Ref} className="absolute rounded-full pointer-events-none blur-[100px]"
          style={{ width: 500, height: 500, background: "rgba(16,185,129,0.12)", bottom: -150, right: -100 }} />

        {/* 3D orbs */}
        <div ref={orb1Ref} className="absolute rounded-full pointer-events-none blur-[2px]"
          style={{ width: 140, height: 140, top: "15%", right: "25%",
            background: "radial-gradient(circle at 35% 35%, rgba(99,102,241,0.5), rgba(99,102,241,0.04))",
            boxShadow: "inset 0 0 40px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.15)" }} />
        <div ref={orb2Ref} className="absolute rounded-full pointer-events-none blur-[2px]"
          style={{ width: 90, height: 90, bottom: "20%", left: "10%",
            background: "radial-gradient(circle at 35% 35%, rgba(16,185,129,0.5), rgba(16,185,129,0.04))",
            boxShadow: "inset 0 0 28px rgba(16,185,129,0.2), 0 6px 24px rgba(16,185,129,0.12)" }} />
        <div ref={orb3Ref} className="absolute rounded-full pointer-events-none blur-[2px]"
          style={{ width: 60, height: 60, top: "65%", right: "12%",
            background: "radial-gradient(circle at 35% 35%, rgba(245,158,11,0.55), rgba(245,158,11,0.04))",
            boxShadow: "inset 0 0 20px rgba(245,158,11,0.2)" }} />

        {/* Dot grid */}
        <div className="lp-dot-grid absolute inset-0 pointer-events-none opacity-60" />

        <div className="max-w-[1200px] mx-auto px-6 py-24 grid grid-cols-[1fr_auto] gap-16 items-center w-full max-lg:grid-cols-1">
          <div className="max-w-[580px]">
            <div ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[0.85rem] font-semibold mb-6"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#6366f1" }}
            >
              ✨ Your Personal Growth Dashboard
            </div>

            <h1 ref={titleRef} className="text-[3.5rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#0f172a] m-0 mb-6 max-md:text-[2.2rem]">
              <span className="lp-title-line block">
                <span className="lp-title-word">Track Every Habit.</span>
              </span>
              <br />
              <span className="lp-title-line block">
                <span className="lp-title-word" style={{
                  background: "linear-gradient(135deg, #6366f1, #10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>Build Every Day.</span>
              </span>
            </h1>

            <p ref={subRef} className="text-[1.05rem] text-[#64748b] leading-[1.7] m-0 mb-8">
              A beautiful all-in-one tracker for your daily routines, prayers, notes, and personal growth — synced to the cloud and accessible anywhere.
            </p>

            <div ref={ctasRef} className="flex items-center gap-4 flex-wrap">
              <button
                className="px-7 py-[0.875rem] border-none rounded-[12px] text-base font-bold text-white cursor-pointer transition-all duration-200 hover:opacity-90 hover:translate-y-[-2px] hover:shadow-[0_12px_32px_rgba(99,102,241,0.35)]"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                onClick={onGetStarted}
              >
                Get Started Free →
              </button>
              <button
                className="px-7 py-[0.875rem] border border-[#e2e8f0] rounded-[12px] text-base font-semibold text-[#475569] bg-transparent cursor-pointer transition-all duration-200 hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#f8fafc]"
                onClick={scrollToFeatures}
              >
                See Features ↓
              </button>
            </div>

            <p ref={noteRef} className="text-[0.82rem] text-[#94a3b8] mt-4 m-0">
              No credit card required · Free forever plan available
            </p>
          </div>

          {/* 3D UI Mockup */}
          <div className="relative max-lg:hidden">
            <div ref={mockupRef}
              className="w-[340px] rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(99,102,241,0.12)", transform: "rotateY(-4deg) rotateX(2deg)", transformStyle: "preserve-3d" }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f1f5f9]"
                style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)" }}
              >
                {[{ c: "#ef4444" }, { c: "#f59e0b" }, { c: "#10b981" }].map(({ c }, i) => (
                  <span key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
                <span className="ml-3 text-xs font-semibold text-[#64748b] flex-1 text-center">Dashboard</span>
              </div>
              <div className="p-4" style={{ background: "linear-gradient(180deg, #ffffff, #f8fafc)" }}>
                <div className="flex items-center justify-between p-3 rounded-xl mb-3 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white">
                  <div>
                    <div className="text-[0.65rem] opacity-80 font-semibold uppercase tracking-wider">Today&apos;s Progress</div>
                    <div className="text-sm font-bold mt-0.5">12 / 18 activities</div>
                  </div>
                  <div className="text-2xl font-extrabold">67%</div>
                </div>
                <div className="h-1.5 rounded-full bg-[#e2e8f0] mb-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: "67%", background: "linear-gradient(90deg, #6366f1, #10b981)" }} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {["Fajr ✓","Quran ✓","Tajweed ✓","Dua ✓","Zohar","Asr","Maghrib ✓","Isha"].map(item => (
                    <div key={item}
                      className={`px-2 py-1 rounded-md text-[0.7rem] font-semibold ${item.includes("✓") ? "bg-[#6366f1] text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["M","T","W","T","F","S","S"].map((d, i) => (
                    <div key={i}
                      className={`flex-1 py-1.5 rounded text-[0.6rem] font-bold text-center ${i < 5 ? "bg-[#6366f1] text-white" : "bg-[#f1f5f9] text-[#94a3b8]"}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              {/* Shine overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)", borderRadius: "inherit" }} />
            </div>
            <div className="absolute bottom-[-24px] left-[10%] right-[10%] h-[60px] blur-[20px] rounded-full"
              style={{ background: "rgba(99,102,241,0.2)" }} />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white" id="features" ref={featuresSectionRef}>
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="lp-section-label inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.08em] text-[#6366f1] mb-4"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            Everything You Need
          </div>
          <h2 className="lp-section-title text-[2.2rem] font-extrabold text-[#0f172a] m-0 mb-4 tracking-[-0.03em]">
            Features built for consistency
          </h2>
          <p className="lp-section-sub text-[1rem] text-[#64748b] max-w-[500px] mx-auto mb-12 leading-[1.7]">
            From daily prayer tracking to rich Q&amp;A notes — every tool you need to build better habits lives in one place.
          </p>
          <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                ref={el => (featureCardsRef.current[i] = el)}
                className="p-6 rounded-2xl border border-[#f1f5f9] text-left transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-[#e0e7ff] hover:translate-y-[-4px]"
                style={{ background: "linear-gradient(135deg, #f9fafb, #fff)" }}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-[#0f172a] m-0 mb-2">{f.title}</h3>
                <p className="text-[0.875rem] text-[#64748b] m-0 leading-[1.6]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24" id="pricing" ref={pricingSectionRef}
        style={{ background: "linear-gradient(160deg, #f9fafb, #eef2ff 60%, #f0fdf4)" }}>
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="lp-section-label inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.08em] text-[#6366f1] mb-4"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            Pricing
          </div>
          <h2 className="lp-section-title text-[2.2rem] font-extrabold text-[#0f172a] m-0 mb-4 tracking-[-0.03em]">
            Simple, honest pricing
          </h2>
          <p className="lp-section-sub text-[1rem] text-[#64748b] mb-12 leading-[1.7]">
            Start free, upgrade when you&apos;re ready. Cancel anytime.
          </p>
          <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1 max-w-[900px] mx-auto">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                ref={el => (pricingCardsRef.current[i] = el)}
                className={`relative p-8 rounded-2xl text-left flex flex-col ${
                  plan.badge
                    ? "border-2 border-[#6366f1] shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
                    : "border border-[#e2e8f0] bg-white"
                }`}
                style={plan.badge ? { background: "linear-gradient(135deg, #f0f0ff, #fff)" } : {}}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                    {plan.badge}
                  </div>
                )}
                <div className="text-lg font-bold text-[#0f172a] mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[2.5rem] font-extrabold text-[#0f172a] tracking-[-0.03em]">{plan.price}</span>
                  <span className="text-sm text-[#64748b]">/{plan.period}</span>
                </div>
                <ul className="list-none m-0 p-0 flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-[0.875rem] text-[#334155]">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-[#6366f1]"
                        style={{ background: "rgba(99,102,241,0.1)" }}>
                        ✓
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-[10px] text-[0.9rem] font-bold cursor-pointer transition-all duration-200 hover:opacity-90 hover:translate-y-[-1px] border-none ${
                    plan.ctaStyle === "solid"
                      ? "text-white"
                      : "text-[#6366f1] border border-[#6366f1] bg-transparent hover:bg-[#eef2ff]"
                  }`}
                  style={plan.ctaStyle === "solid" ? { background: "linear-gradient(135deg, #6366f1, #4f46e5)" } : {}}
                  onClick={onGetStarted}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-[#f1f5f9] bg-white">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <span className="flex items-center justify-center gap-2 text-[1.2rem] font-extrabold text-[#0f172a] tracking-[-0.02em] mb-3">
            <span className="text-[1.4rem]">📊</span>
            Activity Tracker
          </span>
          <p className="text-[0.9rem] text-[#64748b] m-0 mb-1">Build better habits, one day at a time.</p>
          <p className="text-xs text-[#94a3b8] m-0">© 2026 Activity Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

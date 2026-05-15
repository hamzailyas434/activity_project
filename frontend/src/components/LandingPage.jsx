import "./LandingPage.css";
import ThemeAppearanceMenu from "./ThemeAppearanceMenu";

const FEATURES = [
  {
    ic: "default",
    title: "Activities.",
    desc: "Daily check-offs, streaks, and a month view that fills in as you go.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    ic: "plum",
    title: "Qaza Namaz.",
    desc: "A private, quiet way to track missed prayers and make-up progress.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 12a8 8 0 0 1-14 5.5 8 8 0 0 0 14-5.5z" />
      </svg>
    ),
  },
  {
    ic: "default",
    title: "Notes & Q&A.",
    desc: "Categories, links, best-answer marking, and search that actually works.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 3h6l4 4v10a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7z" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    ic: "sage",
    title: "Expenses.",
    desc: "Monthly ledger with category rollups. Nothing more, nothing less.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 1v22M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
      </svg>
    ),
  },
  {
    ic: "clay",
    title: "Books.",
    desc: "Reading dashboard, currently-on widgets, and notes linked to each book.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" />
        <path d="M4 19a2 2 0 0 1 2-2h13" />
      </svg>
    ),
  },
  {
    ic: "default",
    title: "Sticky notes.",
    desc: "Quick coloured notes pinned to the dashboard. For the one thing you keep forgetting.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2v7" />
        <path d="M7 9h10l-2 5H9z" />
        <path d="M12 14v8" />
      </svg>
    ),
  },
];

const PLANS = [
  {
    name: "Free",
    blurb: "For keeping your own days.",
    price: "$0",
    period: "/month",
    featured: false,
    cta: "Start free",
    ctaVariant: "ghost",
    features: ["All eight modules", "30 days of history", "One device", "Export as CSV"],
  },
  {
    name: "Pro",
    blurb: "For people who want more than one month of history.",
    price: "$6",
    period: "/month",
    featured: true,
    cta: "Start Pro trial",
    ctaVariant: "primary",
    features: [
      "Everything in Free",
      "Unlimited history",
      "All devices · sync",
      "Book-linked notes",
      "2FA & encrypted backups",
    ],
  },
  {
    name: "Team",
    blurb: "For families and small groups keeping days together.",
    price: "$14",
    period: "/month",
    featured: false,
    cta: "Contact sales",
    ctaVariant: "ghost",
    features: ["Everything in Pro", "Up to 6 members", "Shared goals & expenses", "Private per-member notes"],
  },
];

function featureIcClass(ic) {
  if (ic === "plum") return "landing-feature-ic landing-feature-ic--plum";
  if (ic === "sage") return "landing-feature-ic landing-feature-ic--sage";
  if (ic === "clay") return "landing-feature-ic landing-feature-ic--clay";
  return "landing-feature-ic";
}

function LandingPage({
  theme = "dark",
  setTheme,
  colorFamily = "teal",
  setColorFamily,
  onGetStarted,
  onLogin,
}) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Primary">
        <div className="landing-nav-brand">
          <img src="/rhythm-logo.svg" width={28} height={28} alt="" />
          Rhythm
        </div>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#features">Notes</a>
          <button type="button" onClick={onLogin}>
            Sign in
          </button>
        </div>
        <div className="landing-nav-cta">
          {setTheme && setColorFamily ? (
            <ThemeAppearanceMenu
              theme={theme}
              setTheme={setTheme}
              colorFamily={colorFamily}
              setColorFamily={setColorFamily}
              buttonClassName="landing-theme-toggle"
              iconSize={18}
            />
          ) : null}
          <button type="button" className="landing-btn-ghost" onClick={onLogin}>
            Sign in
          </button>
          <button type="button" className="landing-btn-primary" onClick={onGetStarted}>
            Start free
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-eyebrow">
          <span className="landing-hero-dot" />
          New · book-linked notes
        </div>
        <h1>A quieter way to keep your days.</h1>
        <p>
          Track habits, prayers, notes, and spending in one calm dashboard. No streaks-shaming. No confetti. Just your days, kept.
        </p>
        <div className="landing-hero-cta">
          <button type="button" className="landing-btn-primary landing-btn--lg" onClick={onGetStarted}>
            Start free
          </button>
          <button type="button" className="landing-btn-ghost landing-btn--lg" onClick={() => scrollTo("preview")}>
            See it in action
          </button>
        </div>
      </section>

      <div id="preview" className="landing-mock">
        <div className="landing-mock-frame">
          <div className="landing-mock-bar" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className="landing-mock-inner">
            <div className="landing-mock-card">
              <div className="landing-mm-eyebrow">Today&apos;s rhythm · Wed Oct 15</div>
              <div className="landing-mm-title">Good evening, Amina.</div>
              <div className="landing-mm-stat-row">
                <div>
                  <div className="landing-mm-num">
                    4<span className="landing-mm-stat-denom">/5</span>
                  </div>
                  <div className="landing-mm-stat-label">activities</div>
                </div>
                <div>
                  <div className="landing-mm-num">12</div>
                  <div className="landing-mm-stat-label">day streak</div>
                </div>
                <div>
                  <div className="landing-mm-num" style={{ color: "var(--plum-400)" }}>
                    03
                  </div>
                  <div className="landing-mm-stat-label">qaza</div>
                </div>
              </div>
              <div className="landing-mm-row">
                <div className="landing-mm-check">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" aria-hidden>
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </div>
                <div className="landing-mm-row-label">Fajr prayer</div>
                <span className="landing-mm-time">6:12 AM</span>
              </div>
              <div className="landing-mm-row">
                <div className="landing-mm-check">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" aria-hidden>
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </div>
                <div className="landing-mm-row-label">Walk 20 min</div>
                <span className="landing-mm-time">7:30 AM</span>
              </div>
              <div className="landing-mm-row">
                <div className="landing-mm-check landing-mm-check--empty" />
                <div className="landing-mm-row-label">Read · Sapiens</div>
                <span className="landing-mm-time">daily</span>
              </div>
            </div>
            <div className="landing-mock-card landing-mock-card--qaza">
              <div className="landing-mm-eyebrow">Qaza Namaz</div>
              <img src="/qaza-glyph.svg" width={36} height={36} alt="" />
              <div className="landing-mm-num" style={{ color: "var(--plum-400)", fontSize: 44 }}>
                03
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>prayers to make up</div>
              <div className="landing-qaza-progress">
                <div className="landing-qaza-progress-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className="landing-section">
        <h2>Eight modules. One dashboard.</h2>
        <p className="landing-section-lede">
          Everything fits on one page — the day you&apos;re living, not a dozen apps you&apos;re juggling.
        </p>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <div className={featureIcClass(f.ic)}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="landing-section" style={{ paddingTop: 40 }}>
        <h2>Three tiers.</h2>
        <p className="landing-section-lede">
          Free is genuinely free. Pro is for keeping more than one month of history. Team is for households.
        </p>
        <div className="landing-pricing">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`landing-tier${plan.featured ? " landing-tier--featured" : ""}`}>
              <h3>{plan.name}</h3>
              <div className="landing-tier-blurb">{plan.blurb}</div>
              <div className="landing-tier-price">
                {plan.price}
                <small>{plan.period}</small>
              </div>
              <ul>
                {plan.features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {plan.ctaVariant === "primary" ? (
                <button type="button" className="landing-btn-primary landing-tier-cta" onClick={onGetStarted}>
                  {plan.cta}
                </button>
              ) : (
                <button type="button" className="landing-btn-ghost landing-tier-cta" onClick={onGetStarted}>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-foot">
        <div className="landing-foot-brand">
          <img src="/rhythm-logo.svg" width={22} height={22} alt="" />
          <span>Rhythm · made for quieter days</span>
        </div>
        <div>© 2026</div>
      </footer>
    </div>
  );
}

export default LandingPage;

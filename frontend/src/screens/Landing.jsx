import { useState } from "react";
import { Icon } from "../components/ui";
import { go } from "../shell/route";
import "../styles/landing.css";

/* Public landing page (v3 kit Home.html). Every preview shows the demo student's data
   (see backend/scripts/seed_demo_student.js) so the page reads like a real account. */

const RINGS = [["var(--red)", 0, 16, 22], ["var(--gold)", 9, 13, 28, true], ["var(--green)", 18, 10, 34], ["var(--blue)", 27, 7, 40, true]];
const MARQ = ["Daily routines", "Day journal", "Q&A notes", "Flashcard review", "Family ledger", "Gift memory", "PDF reader", "Two-factor"];
const done = { background: "var(--red)", color: "#fff", boxShadow: "none" };
const open = { background: "transparent", boxShadow: "none", border: "1.5px solid var(--line-2)" };

const PRICES = { m: ["PKR 499", " / month", "PKR 999"], y: ["PKR 4,990", " / year", "PKR 9,990"] };
const ARTS = [
  ["var(--red)", "#fff", "Habits", "6 min", "Why 80% is the right daily target", "Perfect days don't build streaks. Here's why Rhythm counts a day as \"good\" at 80% — and what changed for people who stopped chasing 100."],
  ["var(--blue)", "#0C1020", "Study", "7 min", "Active recall beats re-reading", "Turn every heading into a question, answer it from memory, then save it as a note you'll review like a flashcard."],
  ["var(--gold)", "#16130C", "Money", "5 min", "A student budget that survives the month", "Rent, mess, transport and the money you send home — a simple ledger that ends the \"where did it all go?\" question."],
];
const FAQ = [
  ["Is my data private?", "Yes. Your data is yours — no ads, no trackers, nothing sold. You can export everything as CSV from Profile at any time, and delete your account in one step."],
  ["Does it work in Urdu?", "Notes, routines, expenses and people all accept Urdu and English side by side — text direction adjusts automatically as you type."],
  ["Can my family use one account?", "Each person gets their own account on the Family plan. As admin you choose which tabs each person sees — for example, hiding Money for a younger sibling."],
  ["Which devices does it support?", "Rhythm runs in any modern browser on phone, tablet and desktop. The layout adapts — a full bento on desktop, a compact dock and bottom sheets on your phone."],
  ["What happens if I cancel Pro?", "You drop back to Free. Nothing is deleted — older history and extra books are simply read-only until you upgrade again."],
];

// Demo grid: Mon–Sun of the demo student's week (1 done, 0 missed, g/b coloured, f future)
const GRID = [["Lecture review", "1101g1f"], ["Problem set", "1011101"], ["Morning run", "10b1001"], ["German lesson", "0110110"]];
const CELL = { 1: "var(--red)", 0: "var(--bg-2)", g: "var(--green)", b: "var(--blue)" };

function Feat({ k, kick, title, lede, items, flip, children }) {
  return (
    <div className={"feat" + (flip ? " flip" : "")}>
      <div className="ft"><div className="kick" style={{ marginBottom: 14 }}><b>{k}</b>{kick}</div><h3 className="D">{title}</h3>
        {lede && <p className="lede">{lede}</p>}
        <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div className="mock">{children}</div>
    </div>
  );
}

export default function Landing({ theme, setTheme, demo }) {
  const [bill, setBill] = useState("m");
  const [p1, per, p2] = PRICES[bill];
  const jump = id => e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  const nav = to => e => { e.preventDefault(); go(to); };

  return (
    <div className="lp">
      <nav className="nav"><div className="w">
        <a href="/" className="brand" onClick={jump("top")}><i /><span>Rhythm</span></a>
        <div className="nav-l"><a href="#features" onClick={jump("features")}>Features</a><a href="#pricing" onClick={jump("pricing")}>Pricing</a><a href="#journal" onClick={jump("journal")}>Journal</a><a href="#faq" onClick={jump("faq")}>FAQ</a></div>
        <button type="button" className="btn ghost icon" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon n={theme === "dark" ? "sun" : "moonS"} s={18} /></button>
        <a className="btn ghost" href="/login" onClick={nav("login")}>Sign in</a>
        <a className="btn red" href="/register" onClick={nav("register")}>Start free</a>
      </div></nav>

      <header className="hero" id="top"><div className="w">
        <div className="kick"><b>✦</b>Habits · Study · Notes · Money · Books</div>
        <h1 className="D">Keep your days<br /><em>in orbit.</em></h1>
        <div className="hero-g">
          <div>
            <p className="lede">Rhythm is one calm place for the things you do every day — your routines and a journal for each day, the questions you've answered, the money you spend and send home, the people you care about and the books you're reading.</p>
            <div className="row wrap" style={{ marginTop: 30 }}>
              <a className="btn red" style={{ height: 54, padding: "0 28px", fontSize: 15 }} href="/register" onClick={nav("register")}>Start free — no card</a>
              {demo ? <button type="button" className="btn" style={{ height: 54, padding: "0 24px" }} onClick={demo}>Try the live demo →</button>
                : <a className="btn" style={{ height: 54, padding: "0 24px" }} href="/login" onClick={nav("login")}>Sign in →</a>}
            </div>
            <div className="row wrap mono muted" style={{ marginTop: 22, fontSize: 12, gap: 18 }}><span>● Free forever plan</span><span>● Urdu + English</span><span>● Phone, tablet, desktop</span></div>
          </div>
          <div className="rings" aria-hidden="true">
            {RINGS.map(([c, inset, w, dur, rev]) => <i key={c} style={{ inset: inset + "%", borderWidth: w, borderColor: c, animationDuration: dur + "s", animationDirection: rev ? "reverse" : "normal" }} />)}
            <div className="core"><b className="D" style={{ fontSize: "clamp(44px, 6vw, 60px)" }}>88%</b><span className="mono" style={{ fontSize: 11, letterSpacing: ".1em" }}>TODAY</span></div>
          </div>
        </div>
      </div>
      <div className="marq" aria-hidden="true"><div>{[...MARQ, ...MARQ].map((m, i) => <span key={i}><b>✦</b>{m}</span>)}</div></div>
      </header>

      <section style={{ borderBottom: "1px solid var(--line)" }}><div className="stats w" style={{ padding: 0 }}>
        <div><div className="n D">8</div><p>Modules in one app — no switching between five tools.</p></div>
        <div><div className="n D" style={{ color: "var(--red)" }}>1 tap</div><p>To tick a routine from Today. Double-tap a cell for notes.</p></div>
        <div><div className="n D">⌘K</div><p>Jump anywhere, create anything, search every note.</p></div>
        <div><div className="n D" style={{ color: "var(--green)" }}>0</div><p>Ads, trackers or data sold. Export everything as CSV.</p></div>
      </div></section>

      <section className="sec" id="features"><div className="w">
        <div className="kick"><b>01</b>Everything it does · shown with a real demo account</div>
        <h2 className="D" style={{ fontSize: "clamp(52px,8vw,128px)" }}>One app.<br /><em>Eight</em> rhythms.</h2>

        <Feat k="A" kick="Today" title={<>See the day<br />at a <em>glance</em>.</>} lede="Your percentage, the next routine, and a one-tap Done. Everything else for today sits around it."
          items={["Next-up card with a single Done button — or a number field for timed routines", "Checklist grouped into Study, Health and your own routines", "Quick add: type \"350 printouts\" and it files an expense", "Month orbit, 14-day pulse, streak and 7-day average", "Sticky board, monthly goals with dates, and a note to revisit"]}>
          <div className="bento" style={{ gap: 10 }}>
            <div className="tile t-red s6" style={{ minHeight: 220, display: "flex", flexDirection: "column" }}><span className="cap">Today · Ayesha</span><div className="big" style={{ fontSize: 96, marginTop: 10 }}>50<small>%</small></div>
              <div style={{ marginTop: "auto", background: "rgba(0,0,0,.18)", borderRadius: 16, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}><b className="D grow" style={{ fontSize: 22 }}>Lecture review</b><span className="btn sm" style={{ background: "#fff", color: "#111" }}>Done</span></div></div>
            <div className="tile s6"><div className="cap">Study · 2/6</div>
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}><span className="chip" style={done}>✓ Problem set</span><span className="chip" style={open}>Read 20 pages</span><span className="chip" style={{ ...done, background: "var(--fg)", color: "var(--bg)" }}>Coding · 90 min</span><span className="chip" style={open}>German</span></div>
              <div className="cap" style={{ marginTop: 16 }}>Health · 3/3</div>
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}><span className="chip" style={done}>✓ Morning run</span><span className="chip" style={done}>✓ Water</span><span className="chip" style={done}>✓ Sleep by 11:30</span></div></div>
            <div className="tile s6" style={{ background: "var(--gold)", color: "#16130C", fontWeight: 700, lineHeight: 1.4, transform: "rotate(-1.5deg)" }}><div className="cap" style={{ color: "inherit", opacity: 0.7 }}>Sticky</div><p style={{ marginTop: 8, fontSize: 15 }}>DBMS quiz on Thursday — revise joins + normalisation</p></div>
            <div className="tile ink s6"><div className="cap" style={{ color: "#8B867D" }}>Quick add</div><div className="input" style={{ background: "var(--ink-3)", color: "#fff", display: "flex", alignItems: "center", marginTop: 12 }}>350 printouts</div><div className="mono" style={{ fontSize: 11, color: "#8B867D", marginTop: 8 }}>→ PKR 350 · printouts · Other</div></div>
          </div>
        </Feat>

        <Feat flip k="B" kick="Activities" title={<>The whole<br /><em>month</em>, honestly.</>} lede="A routine × day grid that tells you what actually happened — not what you meant to do."
          items={["Week, Month and Ranking views", "Tap to tick, double-tap for notes and a colour", "A journal for every day; a new month starts with last month's routines", "Tick, number (minutes, cards) and text routines"]}>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7,1fr)", gap: 6, alignItems: "center", fontSize: 12.5 }}>
            <span />{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="mono faint" style={{ textAlign: "center" }}>{d}</span>)}
            {GRID.map(([n, row]) => [<b key={n}>{n}</b>, ...[...row].map((c, i) => <i key={n + i} style={{ height: 36, borderRadius: 12, background: c === "f" ? "transparent" : CELL[c], border: c === "f" ? "1px dashed var(--line-2)" : "none" }} />)])}
          </div>
          <div className="tile sunk" style={{ marginTop: 12, padding: 14 }}><div className="cap">Journal · 24 Oct</div><p style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5 }}>Group project meeting went well — I'm doing the login and dashboard screens.</p></div>
        </Feat>

        <Feat k="C" kick="Books" title={<>Read with a<br /><em>pen</em> in hand.</>} lede="Upload a PDF and read it in the app. Notes stay with the page, favourites gather on your shelf, and a daily goal keeps you moving."
          items={["Margin notes per page — bold, lists, quotes and tables", "Bookmarks, highlights and favourite notes in one panel", "Open any note straight at its page", "A daily page goal with a ring on Today"]}>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 16, alignItems: "end" }}>
            <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
              {[["var(--violet)", 210, "Study smarter"], ["var(--blue)", 180, "Clean code"], ["var(--gold)", 230, "DBMS notes"]].map(([c, h, t]) =>
                <div key={t} style={{ width: 50, height: h, borderRadius: 10, background: c, color: "#111", display: "grid", placeItems: "center", boxShadow: "inset -5px 0 0 rgba(0,0,0,.12)" }}><span className="D" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 18 }}>{t}</span></div>)}
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <div className="bn fav"><div className="bn-h"><span className="bn-no mono">01</span><span className="mono faint bn-meta">p.2 · Study Smarter</span></div><div className="bn-body" style={{ fontSize: 13.5 }}><p><strong>Try this:</strong> after each lecture, write 3 questions from memory before opening the slides.</p></div></div>
              <div className="bn"><div className="bn-h"><span className="bn-no mono">02</span><span className="mono faint bn-meta">p.6</span></div><div className="bn-body" style={{ fontSize: 13.5 }}><blockquote><p><em>Sleep IS revision.</em></p></blockquote></div></div>
              <div className="row" style={{ gap: 12 }}><div style={{ width: 54, height: 54, borderRadius: "50%", background: "conic-gradient(var(--blue) 0 40%,var(--bg-2) 0)", display: "grid", placeItems: "center" }}><b className="mono" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-1)", display: "grid", placeItems: "center", fontSize: 13 }}>4</b></div><span style={{ fontSize: 13, fontWeight: 600 }}>4 of 10 pages today<br /><span className="muted">p.7 of 12</span></span></div>
            </div>
          </div>
        </Feat>

        <Feat flip k="D" kick="Notes" title={<>Ask once.<br /><em>Remember</em> forever.</>} lede="Save a question with every answer you've found — formulas, links, page numbers. Then review it like flashcards so it actually stays."
          items={["Many answers per question; mark the best one", "Categories, search with highlights, sort, attachments", "Flashcard review: flip, \"knew it\" / \"not yet\", score"]}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            <div className="tile" style={{ borderTop: "4px solid var(--red)" }}><span className="pill" style={{ background: "color-mix(in oklab,var(--blue) 22%,transparent)" }}>Databases</span><div className="D" style={{ fontSize: 26, marginTop: 12 }}>Explain 1NF, 2NF and 3NF in one line each</div><p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>1NF: atomic values · 2NF: no partial dependency · 3NF: no transitive dependency</p></div>
            <div className="tile ink" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}><span className="cap" style={{ color: "#8B867D" }}>Review · 3 / 15</span><b style={{ fontSize: 17, lineHeight: 1.35 }}>What does ACID stand for?</b><div className="row" style={{ gap: 6 }}><span className="btn sm" style={{ background: "var(--ink-3)", color: "#fff" }}>← Not yet</span><span className="btn sm red">Knew it →</span></div></div>
          </div>
        </Feat>

        <Feat k="E" kick="Money" title={<>Income in.<br /><em>Home</em> first.</>} lede="Built for students and people who support family. Track bills and transfers, see what's left, and keep a ledger of money you hold for others."
          items={["Bills, Family and Other — with one-tap names", "Income, \"remaining sent home\" toggle, memo rows", "Person ledger: held, pending, sent this month"]}>
          <div className="row" style={{ gap: 22, flexWrap: "wrap" }}>
            <div style={{ width: 150, height: 150, borderRadius: "50%", background: "conic-gradient(var(--blue) 0 35%,var(--violet) 0 48%,var(--gold) 0 80%,var(--bg-2) 0)", display: "grid", placeItems: "center" }}><div style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--bg-1)", display: "grid", placeContent: "center", textAlign: "center" }}><b className="D" style={{ fontSize: 34 }}>80%</b><span className="mono faint" style={{ fontSize: 10 }}>used</span></div></div>
            <div className="stack grow" style={{ minWidth: 200 }}>
              {[["Hostel rent", "Bills", "18,000"], ["Mess / food", "Other", "8,800"], ["Sent home", "Family · Mom", "5,200"], ["Books & printouts", "Other", "2,500"]].map(([n, c, a]) =>
                <div key={n} className="list-row"><span className="grow"><b>{n}</b><span className="faint" style={{ display: "block", fontSize: 11.5 }}>{c}</span></span><span className="mono">PKR {a}</span></div>)}
            </div>
          </div>
        </Feat>

        <Feat flip k="F" kick="People · Security" title={<>The small things<br />that <em>matter</em>.</>}
          items={[<><b style={{ color: "var(--fg)" }}>People</b> — shoe sizes, wishes, gifts given and gifts planned</>, <><b style={{ color: "var(--fg)" }}>Goals</b> — monthly goals with date chips like "28 Oct: DBMS mid-term"</>, <><b style={{ color: "var(--fg)" }}>Security</b> — two-factor, active sessions, login lockout</>, <><b style={{ color: "var(--fg)" }}>Admin</b> — roles and per-user tab access for families and small teams</>, <><b style={{ color: "var(--fg)" }}>⌘K</b> — jump, create and search from anywhere</>]}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", overflow: "hidden", flexWrap: "wrap" }}>
            <div className="tile" style={{ flex: "0 0 150px", borderTop: "4px solid var(--violet)" }}><div className="D" style={{ fontSize: 80, color: "var(--violet)" }}>S</div><b className="D" style={{ fontSize: 22 }}>Sara</b><div className="cap">Sibling</div><span className="pill" style={{ marginTop: 10 }}>🎁 22 Oct</span></div>
            <div className="tile" style={{ flex: "1 1 170px" }}><div className="cap">October goals · 2/6</div>
              {[["8 Oct", "Submit OOP assignment", 1], ["28 Oct", "DBMS mid-term", 0], ["31 Oct", "Apply to 3 internships", 0]].map(([d, t, ok]) =>
                <div key={t} className="row" style={{ gap: 8, marginTop: 10, fontSize: 13 }}><span className="pill" style={{ height: 20, fontSize: 10 }}>{d}</span><span style={{ textDecoration: ok ? "line-through" : "none", color: ok ? "var(--fg-4)" : "var(--fg)" }}>{t}</span></div>)}</div>
            <div className="tile ink" style={{ flex: "1 1 150px" }}><div className="cap" style={{ color: "#8B867D" }}>Security</div><div className="row sb" style={{ marginTop: 12 }}><b>2FA</b><span className="pill ok">On</span></div><div className="row sb" style={{ marginTop: 8 }}><b>Sessions</b><span className="mono">2</span></div></div>
          </div>
        </Feat>
      </div></section>

      <section className="sec" id="pricing"><div className="w">
        <div className="row sb wrap" style={{ alignItems: "flex-end", gap: 24 }}><div><div className="kick"><b>02</b>Pricing</div><h2 className="D" style={{ fontSize: "clamp(52px,8vw,128px)" }}>Fair, <em>simple</em><br />pricing.</h2></div>
          <div className="seg" role="group" aria-label="Billing">{[["m", "Monthly"], ["y", "Yearly · 2 months free"]].map(([k, l]) => <button type="button" key={k} className={bill === k ? "on" : ""} aria-pressed={bill === k} onClick={() => setBill(k)}>{l}</button>)}</div></div>
        <div className="plans">
          <div className="plan"><div className="cap">Free</div><div className="pr D">PKR 0<small> forever</small></div><p className="muted">Everything you need to keep one month in rhythm.</p>
            <ul><li>Up to 8 routines</li><li>Current month history</li><li>50 notes</li><li>Expenses for 1 month</li><li>1 book</li></ul><a className="btn" href="/register" onClick={nav("register")}>Start free</a></div>
          <div className="plan hot"><div className="row sb"><div className="cap">Pro</div><span className="pill" style={{ background: "#fff", color: "var(--red)" }}>Most chosen</span></div><div className="pr D">{p1}<small>{per}</small></div><p style={{ opacity: 0.85 }}>For people who live by their routines.</p>
            <ul><li>Unlimited routines &amp; full history</li><li>Unlimited notes, attachments, flashcards</li><li>Money ledger, all months, CSV export</li><li>Unlimited books, highlights, bookmarks</li><li>Two-factor &amp; session control</li></ul><a className="btn" style={{ background: "#fff", color: "#111" }} href="/register" onClick={nav("register")}>Go Pro</a></div>
          <div className="plan"><div className="cap">Family</div><div className="pr D">{p2}<small>{per}</small></div><p className="muted">Pro for up to five people, with an admin.</p>
            <ul><li>Everything in Pro × 5 accounts</li><li>Admin panel, roles</li><li>Per-person tab access</li><li>Audit log</li><li>Priority support</li></ul><a className="btn" href="/register" onClick={nav("register")}>Start Family</a></div>
        </div>
        <p className="mono faint" style={{ fontSize: 12, marginTop: 18 }}>Prices in PKR, taxes included. International cards billed in USD at the day's rate. Cancel anytime from Profile.</p>
      </div></section>

      <section className="sec" id="journal"><div className="w">
        <div><div className="kick"><b>03</b>Journal</div><h2 className="D" style={{ fontSize: "clamp(52px,8vw,128px)" }}>From the<br /><em>journal</em>.</h2></div>
        <div className="arts">{ARTS.map(([bg, fg, tag, len, h, p], i) => (
          <article key={h} className="art"><div className="cv" style={{ background: bg, color: fg }}><span>{String(i + 1).padStart(2, "0")}</span></div>
            <div className="bd"><div className="row mono faint" style={{ fontSize: 11, gap: 10 }}><span>{tag}</span><span>· {len}</span></div><h4>{h}</h4><p>{p}</p></div></article>
        ))}</div>
      </div></section>

      <section className="sec" id="faq"><div className="w">
        <div className="kick"><b>04</b>FAQ</div><h2 className="D" style={{ fontSize: "clamp(52px,8vw,128px)" }}>Questions.</h2>
        <div className="faq">{FAQ.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </div></section>

      <section className="sec cta"><div className="w" style={{ textAlign: "center" }}>
        <h2 className="D" style={{ fontSize: "clamp(64px,11vw,180px)", color: "#fff" }}>Start today.<br />Keep it going.</h2>
        <div className="row" style={{ justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          <a className="btn" style={{ background: "#fff", color: "#111", height: 56, padding: "0 30px", fontSize: 15 }} href="/register" onClick={nav("register")}>Create a free account</a>
          {demo ? <button type="button" className="btn" style={{ background: "rgba(0,0,0,.2)", color: "#fff", height: 56 }} onClick={demo}>Try the demo</button>
            : <a className="btn" style={{ background: "rgba(0,0,0,.2)", color: "#fff", height: 56 }} href="/login" onClick={nav("login")}>Sign in</a>}
        </div>
      </div></section>

      <footer className="foot"><div className="w">
        <div className="foot-g">
          <div><a href="/" className="brand" style={{ padding: 0 }} onClick={jump("top")}><i /><span>Rhythm</span></a><p className="muted" style={{ marginTop: 14, maxWidth: 300, fontSize: 14, lineHeight: 1.6 }}>Keep your days in orbit. Habits, study, notes, money and books — in one calm place.</p></div>
          <div><h5>Product</h5><a href="#features" onClick={jump("features")}>Features</a><a href="#pricing" onClick={jump("pricing")}>Pricing</a><a href="/login" onClick={nav("login")}>Sign in</a></div>
          <div><h5>Learn</h5><a href="#journal" onClick={jump("journal")}>Journal</a><a href="#faq" onClick={jump("faq")}>FAQ</a></div>
          <div><h5>Account</h5><a href="/register" onClick={nav("register")}>Create account</a><a href="/login" onClick={nav("login")}>Sign in</a></div>
        </div>
        <div className="row sb wrap mono faint" style={{ fontSize: 12, marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)" }}><span>© 2026 Rhythm</span><span>Made with care in Pakistan</span></div>
      </div></footer>
    </div>
  );
}

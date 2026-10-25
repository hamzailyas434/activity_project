import { Fragment, useState } from "react";
import { Empty, Icon, Skeleton, TONE_HEX, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import { dayPct } from "../lib/useMonth";
import { MON, MONTHS, daysIn, greeting, isoDate } from "../lib/format";
import { goalParts, stickyTone, useQuickAdd, useToday } from "../lib/today";
import { StickyEdit } from "../screens/Today";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 01 Today — ring + next up, quick capture, KPI strip, list checklist, month map, trend, stickies, goals, revisit, reading */

function DayRing({ acts, isDone, pct, onPick }) {
  const r = 70, C = 2 * Math.PI * r, n = Math.max(acts.length, 1), seg = C / n, gap = n > 1 ? 5 : 0;
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 180 180" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
        {acts.map((a, i) => (
          <circle key={a.id} cx="90" cy="90" r={r} fill="none" strokeWidth="14" strokeLinecap="butt" onClick={() => onPick(a)} style={{ cursor: "pointer", transition: "stroke .3s" }}
            stroke={isDone(a) ? "var(--accent)" : "var(--bg-3)"} strokeDasharray={`${seg - gap} ${C - seg + gap}`} strokeDashoffset={-i * seg}><title>{a.name}</title></circle>
        ))}
      </svg>
      <div className="ring-c"><div className="disp" style={{ fontSize: 64 }}>{Math.round(pct * 100)}<small style={{ fontSize: 26 }}>%</small></div><span className="mono muted" style={{ fontSize: 10.5, letterSpacing: ".14em" }}>TODAY</span></div>
    </div>
  );
}

function QuickCapture(props) {
  const { money, m } = props;
  const { mode, setMode, v, setV, busy, amt, nm, bad, add } = useQuickAdd(props);
  const ph = { sticky: "Pin a quick thought…", goal: `A goal for ${MONTHS[m - 1]}…`, expense: "500 petrol  ·  amount first, then name" };
  return (
    <section className="card qc">
      <div className="card-h"><div><div className="k">Quick capture</div><h3>Drop it here</h3></div><span className="mono muted" style={{ fontSize: 11 }}>↵ to save</span></div>
      <div className="seg" role="tablist">{[["sticky", "Sticky"], ["goal", "Goal"], ["expense", "Expense"]].map(([k, l]) =>
        <button type="button" key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>)}</div>
      <div className="qc-in">
        <input className="input" dir="auto" aria-label={"New " + mode} placeholder={ph[mode]} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button type="button" className="btn primary" disabled={bad || busy} onClick={add}><Icon n="plus" s={14} />Add</button>
      </div>
      {mode === "expense" && v && <div className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>{amt && nm ? `→ ${money(amt)} · ${nm} · Other` : "Type an amount and a name"}</div>}
    </section>
  );
}

function MonthMap({ y, m, d, acts, comp }) {
  const lead = new Date(y, m - 1, 1).getDay(), dim = daysIn(y, m);
  return (
    <section className="card">
      <div className="card-h"><div><div className="k">{MONTHS[m - 1]} · every day</div><h3>Month map</h3></div><button type="button" className="btn sm" onClick={() => go("activities")}>Matrix<Icon n="arrow" s={13} /></button></div>
      <div className="mmap">
        {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={"h" + i} className="mono muted mm-h">{x}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={"b" + i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const day = i + 1, p = day <= d ? dayPct(acts, comp, day) : null;
          const lv = p == null ? "fut" : p >= 0.8 ? "l4" : p >= 0.5 ? "l3" : p > 0 ? "l2" : "l1";
          return <button type="button" key={day} className={"mm-c " + lv + (day === d ? " now" : "")} title={p == null ? `${day} ${MON[m - 1]}` : `${day} ${MON[m - 1]} · ${Math.round(p * 100)}%`} onClick={() => go("activities")}>{day}</button>;
        })}
      </div>
      <div className="row mono muted" style={{ fontSize: 10.5, gap: 6, marginTop: 12 }}>Less<i className="mm-k l1" /><i className="mm-k l2" /><i className="mm-k l3" /><i className="mm-k l4" />80%+</div>
    </section>
  );
}

function Revisit({ list }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * 1000)), [show, setShow] = useState(false);
  const n = list.length ? list[i % list.length] : null;
  if (!n) return <section className="card"><Empty title="No notes yet" body="Notes you save will resurface here." /></section>;
  const ans = n.answers?.[0]?.answer || n.answer || "";
  return (
    <section className="card revisit">
      <div className="card-h"><div><div className="k">Revisit · from your notes</div><h3>Do you remember?</h3></div>{n.category && <span className="badge">{n.category}</span>}</div>
      <p className="rv-q" dir="auto">{String(n.question || "").replace(/<[^>]+>/g, "")}</p>
      {show ? <p className="rv-a ut" dir="auto">{ans.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "") || "No answer saved yet."}</p> : <div className="rv-hide">Think first — then reveal.</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn sm primary" onClick={() => setShow(x => !x)}>{show ? "Hide" : "Reveal answer"}</button>
        <button type="button" className="btn sm" onClick={() => { setI(x => x + 1 + Math.floor(Math.random() * Math.max(1, list.length - 1))); setShow(false); }}>Another</button>
        <span style={{ flex: 1 }} /><button type="button" className="btn sm ghost" onClick={() => go("notes/" + n.id)}>Open</button>
      </div>
    </section>
  );
}

function GoalAdd({ y, m, todos }) {
  const api = useApi();
  const { toast } = useUI();
  const [v, setV] = useState("");
  const add = async () => {
    if (!v.trim()) return;
    try { const g = await api.post("/monthly-todos", { text: v.trim(), month: m, year: y, sort_order: todos.data?.length || 0 }); todos.setData(l => [...(l || []), g]); setV(""); }
    catch (e) { toast(e.message, "err"); }
  };
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <input className="input" dir="auto" placeholder={`Add a goal — "13 ${MON[m - 1]}: …" adds a date`} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
      <button type="button" className="btn icon" aria-label="Add goal" onClick={add}><Icon n="plus" /></button>
    </div>
  );
}

export default function Today({ cur, name }) {
  const t = useToday(cur, name);
  const { toast, money, show, now, y, m, d, todos, stickies, books, notes, sticky, setSticky, acts, comp, isDone, done, pct, next, focus, setPickId,
    last14, avg7, prev7, streak, groups, toggle, setNum, goalToggle, goalDel, noteList, bk, cb, qz, spent, income, left, first, stickyList, goalList } = t;
  const delta = Math.round((avg7 - prev7) * 100);
  const doneIn = g => acts.filter(a => (a.group || "Routines") === g && isDone(a)).length;
  const cellVal = a => comp[`${d}-${a.id}`];
  const kpis = [
    ["Streak · days ≥ 80%", <>{streak}<small> d</small></>, <><Icon n="flame" s={13} />{streak ? "Keep today above 80%" : "Start one today"}</>],
    ["7-day average", <>{Math.round(avg7 * 100)}<small>%</small></>, `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs prior week`, delta >= 0 ? "up" : "down"],
    show.money && [`${income ? "Income left" : "Spent"} · ${MON[m - 1]}`, <span style={{ color: income && left < 0 ? "var(--err)" : undefined }}>{Math.round((income ? left : spent) / 1000)}<small>k</small></span>, income ? `${money(spent)} of ${money(income)}` : "Set income in Expenses"],
    show.qaza && ["Qaza remaining", <>{qz ? (qz.r / 1000).toFixed(1) : "—"}<small>k</small></>, qz ? `${Math.max(0, qz.o - qz.r).toLocaleString()} made up so far` : "Set it up in Qaza"],
    show.books && !show.qaza && ["Pages today", <>{bk?.pages_today ?? 0}<small>/{bk?.daily_pages_goal || 10}</small></>, cb ? cb.title : "No book yet"],
  ].filter(Boolean);

  return (
    <>
      <PageHead idx="01" meta={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", " ·")}
        title={<>{greeting(now.getHours()).split(" ")[0]} <em>{greeting(now.getHours()).split(" ").slice(1).join(" ")}</em>, {first}.</>}
        sub={!acts.length ? "Add a routine to start the day." : next ? `${done} of ${acts.length} routines done today. ${acts.length - done} left.` : "Every routine is in. Rest well."}>
        <button type="button" className="btn" onClick={() => go("activities")}><Icon n="grid" />Open month</button>
      </PageHead>

      {cur.loading && !acts.length ? <Skeleton tiles={[["s8", 260], ["s4", 260], ["s12", 120]]} /> : <>
        <div className="hero-grid">
          <section className="card hero-ring">
            <DayRing acts={acts} isDone={isDone} pct={pct} onPick={a => setPickId(a.id)} />
            <div className="hr-side">
              <div className="k mono muted" style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase" }}>{!acts.length ? "No routines yet" : !focus ? "All done" : focus === next ? "Next up" : isDone(focus) ? "Done ✓" : "Selected"}</div>
              {focus ? <>
                <div className="disp hr-next ut" dir="auto">{focus.name}</div>
                {focus.type === "number" || focus.type === "text"
                  ? <div className="pre" style={{ maxWidth: 200 }}><input key={focus.id} type={focus.type === "number" ? "number" : "text"} dir="auto" aria-label={focus.name} placeholder={focus.type === "number" ? "0" : "…"} defaultValue={cellVal(focus)?.value ?? ""}
                      onKeyDown={e => { if (e.key === "Enter") { setNum(focus, e.currentTarget.value.trim()); toast(focus.name + " logged"); } }} /></div>
                  : isDone(focus)
                    ? <button type="button" className="btn" onClick={() => { toggle(focus); toast(focus.name + " undone"); }}>Undo</button>
                    : <button type="button" className="btn primary" onClick={() => { toggle(focus); toast(focus.name + " done"); }}><Icon n="check" s={14} w={2.5} />Mark done</button>}
                <div className="mono muted" style={{ fontSize: 11 }}>{acts.length - done - (isDone(focus) ? 0 : 1) > 0 ? `then ${acts.length - done - (isDone(focus) ? 0 : 1)} more` : "last one for today"}</div>
              </> : acts.length ? <div className="disp hr-next" style={{ color: "var(--ok)" }}>Day complete</div>
                : <button type="button" className="btn primary" onClick={() => go("activities/new")}><Icon n="plus" s={14} />Add routine</button>}
              <div className="hr-legend">{acts.map(a => <span key={a.id} title={a.name} className={isDone(a) ? "on" : ""} onClick={() => setPickId(id => (id === a.id ? null : a.id))} style={{ cursor: "pointer" }} />)}</div>
            </div>
          </section>
          <QuickCapture y={y} m={m} today={isoDate(now)} stickies={stickies} todos={todos} money={money} onExpense={() => t.money_.reload()} />
        </div>

        <div className={"kpis" + (kpis.length >= 5 ? " kpis-5" : "")} style={{ margin: "16px 0" }}>
          {kpis.map(([k, v, dd, cls]) => <div key={k} className="kpi"><div className="k">{k}</div><div className="v">{v}</div><div className={"d " + (cls || "")}>{dd}</div></div>)}
        </div>

        <div className="grid g-12">
          <section className="card c7">
            <div className="card-h"><div><div className="k">Routines · today</div><h3>Checklist</h3></div><span className="badge red">{acts.length - done} left</span></div>
            {!acts.length ? <Empty title="No routines" body="Add your first routine in Activities." action={<button type="button" className="btn primary" onClick={() => go("activities/new")}>Add routine</button>} /> : (
              <div className="stack">{groups.map(g => (
                <Fragment key={g}>
                  <div className="grp-h"><span>{g}</span><span className="mono">{doneIn(g)}/{acts.filter(a => (a.group || "Routines") === g).length}</span></div>
                  {acts.filter(a => (a.group || "Routines") === g).map(a => {
                    const c = cellVal(a), on = !!c?.done, n = acts.indexOf(a) + 1, val = a.type === "number" || a.type === "text";
                    return (
                      <div key={a.id} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                        <span className="mono muted" style={{ width: 22, fontSize: 11 }}>{String(n).padStart(2, "0")}</span>
                        <span dir="auto" style={{ flex: 1, minWidth: 0, fontWeight: 500, color: on && !val ? "var(--fg-3)" : "var(--fg)", textDecoration: on && !val ? "line-through" : "none" }}>{a.name}</span>
                        {val ? <div className="pre" style={{ width: 120, height: 34 }}><input key={`${a.id}-${c?.value ?? ""}`} type={a.type === "number" ? "number" : "text"} dir="auto" aria-label={a.name} placeholder={a.type === "number" ? "0" : "…"} defaultValue={c?.value ?? ""}
                            onBlur={e => { if (e.currentTarget.value !== String(c?.value ?? "")) setNum(a, e.currentTarget.value.trim()); }} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} /></div>
                          : <button type="button" className={"check " + (on ? "on" : "")} aria-pressed={on} aria-label={"Mark " + a.name} onClick={() => toggle(a)}
                              style={on && c?.color ? { background: c.color, borderColor: c.color } : undefined}><Icon n="check" s={12} w={2.5} /></button>}
                      </div>
                    );
                  })}
                </Fragment>
              ))}</div>
            )}
          </section>
          <div className="c5 stack" style={{ gap: 16 }}>
            <MonthMap y={y} m={m} d={d} acts={acts} comp={comp} />
            <section className="card">
              <div className="card-h"><div><div className="k">Last 14 days</div><h3>Trend</h3></div><span className={"mono " + (delta >= 0 ? "up" : "down")} style={{ fontSize: 11 }}>{delta >= 0 ? "+" : ""}{delta} pts</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 90, borderBottom: "1px solid var(--line)", paddingBottom: 2 }}>
                {last14.map((x, i) => <div key={i} title={`${x.dt.getDate()} ${MON[x.dt.getMonth()]} · ${Math.round(x.p * 100)}%`} style={{ flex: 1, height: Math.max(4, x.p * 86), background: i === 13 ? "var(--accent)" : x.p >= 0.8 ? "var(--fg-2)" : "var(--bg-3)", borderRadius: 2, transition: "height .4s" }} />)}
              </div>
              <div className="row sb mono muted" style={{ fontSize: 10.5, marginTop: 6 }}><span>{last14[0].dt.getDate()} {MON[last14[0].dt.getMonth()]}</span><span>Today</span></div>
            </section>
          </div>

          <section className="card c7">
            <div className="card-h"><div><div className="k">Pinned</div><h3>Sticky notes</h3></div><button type="button" className="btn sm" onClick={() => setSticky({ text: "", tone: "gold" })}><Icon n="plus" s={13} />Note</button></div>
            {stickies.loading && !stickyList.length ? <div className="skel" style={{ height: 120 }} /> : !stickyList.length ? <Empty title="Nothing pinned" body="Quick thoughts live here until you clear them." /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>{stickyList.map((n, i) => {
                const tone = stickyTone(n.color, i);
                return <button type="button" key={n.id} dir="auto" className="sticky ut" onClick={() => setSticky({ ...n, tone })} style={{ background: TONE_HEX[tone], color: tone === "red" ? "#fff" : "#111", "--tilt": (i % 3 - 1) * 1.2 + "deg", whiteSpace: "pre-wrap" }}>{n.text}</button>;
              })}</div>
            )}
          </section>
          <section className="card c5">
            <div className="card-h"><div><div className="k">{MONTHS[m - 1]}</div><h3>Monthly goals</h3></div><span className="mono muted">{goalList.filter(g => g.completed).length}/{goalList.length}</span></div>
            <div className="bar" style={{ marginBottom: 10 }}><i style={{ width: (goalList.length ? (goalList.filter(g => g.completed).length / goalList.length) * 100 : 0) + "%", background: "var(--ok)" }} /></div>
            {goalList.map(g => {
              const [chip, text] = goalParts(g.text);
              return (
                <div key={g.id} className="row" style={{ padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <button type="button" className={"check " + (g.completed ? "on" : "")} aria-pressed={!!g.completed} aria-label={"Toggle " + g.text} onClick={() => goalToggle(g)}><Icon n="check" s={12} w={2.5} /></button>
                  {chip && <span className={"due" + (g.completed ? " done" : "")}>{chip}</span>}
                  <span dir="auto" style={{ flex: 1, minWidth: 0, color: g.completed ? "var(--fg-3)" : "var(--fg)", textDecoration: g.completed ? "line-through" : "none" }}>{text}</span>
                  <button type="button" className="btn sm icon ghost" aria-label={"Delete " + g.text} onClick={() => goalDel(g)}><Icon n="x" s={13} /></button>
                </div>
              );
            })}
            <GoalAdd y={y} m={m} todos={todos} />
          </section>

          <div className={show.books ? "c6" : "c12"}>{notes.loading && !noteList.length ? <div className="skel" style={{ height: 200 }} /> : <Revisit list={noteList} />}</div>
          {show.books && (
            <section className="card c6">
              <div className="card-h"><div><div className="k">Reading</div><h3 dir="auto">{cb ? cb.title : books.loading ? "…" : "No book yet"}</h3></div><button type="button" className="btn sm" onClick={() => go(cb ? "books/" + cb.id : "books")}>Read<Icon n="arrow" s={13} /></button></div>
              {cb && (
                <div className="row gap-3" style={{ alignItems: "stretch" }}>
                  <div style={{ width: 64, minHeight: 90, borderRadius: 3, background: cb.cover_data ? `center/cover url(${cb.cover_data})` : "var(--violet)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}><b>p.{cb.current_page}{cb.total_pages ? ` of ${cb.total_pages}` : ""}</b>
                    <div className="mono muted" style={{ fontSize: 10.5, margin: "12px 0 4px", letterSpacing: ".1em" }}>TODAY · {bk.pages_today}/{bk.daily_pages_goal} PAGES</div>
                    <div className="bar"><i style={{ width: Math.min(100, (bk.pages_today / (bk.daily_pages_goal || 10)) * 100) + "%", background: "var(--gold)" }} /></div>
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>{bk.daily_pages_goal - bk.pages_today > 0 ? `${bk.daily_pages_goal - bk.pages_today} pages to today's goal` : "Goal met today"}</div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </>}
      {sticky && <StickyEdit note={sticky} stickies={stickies} onClose={() => setSticky(null)} />}
    </>
  );
}

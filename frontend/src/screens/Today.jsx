import { useState } from "react";
import { Empty, Field, Head, Icon, Meter, Modal, Ring, Skeleton, TONE_HEX, useUI, cellColor } from "../components/ui";
import { useApi } from "../lib/api";
import { dayPct } from "../lib/useMonth";
import { MON, MONTHS, daysIn, greeting, isoDate, plain } from "../lib/format";
import { go } from "../shell/route";
import { STICKY_T, goalParts, stickyTone, useQuickAdd, useToday } from "../lib/today";




export default function Today({ cur, name }) {
  const { toast, money, show, span, now, y, m, d, todos, stickies, books, qaza, money_, notes, sticky, setSticky, setRv, reveal, setReveal, allSt, setAllSt, acts, comp, isDone, done, pct, next, pickId, setPickId, hoverId, setHoverId, focus, last14, avg7, prev7, streak, groups, toggle, setNum, goalToggle, goalDel, noteList, note, noteAnswer, bk, cb, qz, spent, income, left, first, stickyList, goalList } = useToday(cur, name);
  return (
    <>
      <Head n="01" eyebrow={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", " ·")}
        title={<>{greeting(now.getHours())}, <em>{first}</em>.</>}
        sub={!acts.length ? "Add a routine to start the day." : next ? `${done} of ${acts.length} done. ${acts.length - done} to go before the day closes.` : "Every routine is in. Rest well."}>
        <button type="button" className="btn" onClick={() => go("activities")}><Icon n="grid" />Month</button>
        <button type="button" className="btn primary" onClick={() => go("notes/new")}><Icon n="plus" />Note</button>
      </Head>

      {cur.loading && !acts.length ? <Skeleton tiles={[["s4", 360], ["s5", 360], ["s3", 360], ["s5", 220], ["s4", 220], ["s3", 220]]} /> : (
        <div className="bento">
          <section className="tile t-red s4" style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 360 }}>
            <div className="row sb"><span className="cap">Today</span><span className="mono" style={{ fontSize: 12 }}>{done}/{acts.length}</span></div>
            <div className="big" style={{ fontSize: "clamp(96px,10vw,150px)" }}>{Math.round(pct * 100)}<small>%</small></div>
            <div style={{ display: "flex", gap: 4 }} onMouseLeave={() => setHoverId(null)}>{acts.map(a => {
              const on = isDone(a), sel = focus?.id === a.id;
              return (
                <button type="button" key={a.id} title={a.name} aria-label={`${a.name}, ${on ? "done" : "not done"}`} aria-pressed={pickId === a.id}
                  onMouseEnter={() => setHoverId(a.id)} onFocus={() => setHoverId(a.id)} onBlur={() => setHoverId(null)}
                  onClick={() => { setPickId(id => (id === a.id ? null : a.id)); setHoverId(null); }}
                  style={{ flex: 1, minWidth: 0, height: 22, padding: 0, border: "none", background: "none", cursor: "pointer", display: "grid", alignItems: "center" }}>
                  <i style={{ display: "block", height: sel ? 12 : 8, borderRadius: 99, background: on ? "#fff" : "rgba(255,255,255,.28)", boxShadow: sel ? "0 0 0 2px rgba(0,0,0,.35)" : "none", transition: "height var(--fast)" }} />
                </button>
              );
            })}</div>
            <div style={{ marginTop: "auto" }}>
              <div className="row sb" style={{ marginBottom: 8 }}>
                <span className="cap">{!acts.length ? "No routines yet" : !focus ? "All done" : focus === next && !pickId && !hoverId ? "Next up" : isDone(focus) ? "Done ✓" : "Selected"}{focus?.group ? ` · ${focus.group}` : ""}</span>
                {pickId && <button type="button" className="cap" onClick={() => setPickId(null)} style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", padding: 0 }}>Back to next up</button>}
              </div>
              {focus ? (
                <div className="row" style={{ background: "rgba(0,0,0,.16)", borderRadius: 20, padding: "10px 10px 10px 18px" }}>
                  <span className="serif grow ut" dir="auto" style={{ fontSize: 30, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: isDone(focus) ? 0.75 : 1 }}>{focus.name}</span>
                  {focus.type === "number" || focus.type === "text"
                    ? <input key={focus.id} className="input" type={focus.type === "number" ? "number" : "text"} dir="auto" placeholder={focus.type === "number" ? "0" : "…"} aria-label={focus.name}
                        defaultValue={comp[`${d}-${focus.id}`]?.value ?? ""}
                        style={{ width: 96, height: 42, background: "#fff", color: "#111" }}
                        onKeyDown={e => { if (e.key === "Enter") { setNum(focus, e.currentTarget.value.trim()); toast(focus.name + (e.currentTarget.value.trim() ? " logged" : " cleared")); } }} />
                    : isDone(focus)
                      ? <button type="button" className="btn" style={{ background: "rgba(255,255,255,.22)", color: "#fff" }} onClick={() => { toggle(focus); toast(focus.name + " undone"); }}>Undo</button>
                      : <button type="button" className="btn" style={{ background: "#fff", color: "#111" }} onClick={() => { toggle(focus); toast(focus.name + " ✓"); }}><Icon n="check" s={15} w={2.5} />Done</button>}
                </div>
              ) : acts.length ? <div className="serif" style={{ fontSize: 34 }}>Day complete</div>
                : <button type="button" className="btn" style={{ background: "#fff", color: "#111" }} onClick={() => go("activities/new")}><Icon n="plus" />Add routine</button>}
            </div>
          </section>

          <section className="tile s5">
            <div className="th"><div><div className="cap">Routines</div><h3>The <em>checklist</em></h3></div>{acts.length > 0 && <span className="pill red">{acts.length - done} left</span>}</div>
            {!acts.length ? <Empty title="No routines" body="Add one in Activities." action={<button type="button" className="btn primary" onClick={() => go("activities/new")}>Add routine</button>} /> : (
              <div className="stack" style={{ gap: 14 }}>{groups.map(g => {
                const ga = acts.filter(a => (a.group || "Routines") === g);
                return (
                  <div key={g}>
                    <div className="row sb" style={{ marginBottom: 6 }}><span className="cap">{g}</span><span className="mono faint" style={{ fontSize: 11 }}>{ga.filter(isDone).length}/{ga.length}</span></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ga.map(a => {
                      const c = comp[`${d}-${a.id}`], v = c?.done;
                      return a.type === "number" || a.type === "text"
                        ? <label key={a.id} className="chip" style={{ cursor: "text", paddingRight: 6, background: v ? "var(--fg)" : undefined, color: v ? "var(--bg)" : undefined }}>
                            <span dir="auto">{a.name}</span>
                            <NumIn value={c?.value ?? ""} type={a.type} label={a.name} onSave={val => setNum(a, val)} />
                          </label>
                        : <button type="button" key={a.id} className="chip" aria-pressed={!!v} onClick={() => toggle(a)} style={v ? { background: cellColor(c.color) || "var(--red)", color: "#fff", boxShadow: "none", border: "1.5px solid transparent" } : { background: "transparent", boxShadow: "none", border: "1.5px solid var(--line-2)" }}>
                            {v && <Icon n="check" s={13} w={2.6} />}<span dir="auto">{a.name}</span></button>;
                    })}</div>
                  </div>
                );
              })}</div>
            )}
          </section>

          <div className="s3" style={{ display: "grid", gap: 14 }}>
            <section className="tile t-gold"><div className="cap">Streak · ≥ 80%</div><div className="big" style={{ marginTop: 10 }}>{streak}<small>days</small></div>
              <div style={{ fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{streak ? "Keep today above 80%" : "Start one today"}</div></section>
            <section className="tile"><div className="cap">7-day average</div><div className="big" style={{ marginTop: 10 }}>{Math.round(avg7 * 100)}<small>%</small></div>
              <div className="mono" style={{ fontSize: 12, marginTop: 8, color: avg7 >= prev7 ? "var(--ok)" : "var(--err)" }}>{avg7 >= prev7 ? "▲" : "▼"} {Math.abs(Math.round((avg7 - prev7) * 100))} pts vs last week</div></section>
          </div>

          <QuickAdd y={y} m={m} today={isoDate(now)} stickies={stickies} todos={todos} money={money} onExpense={money_.reload} />

          <section className="tile s4">
            <div className="th"><div><div className="cap">{MONTHS[m - 1]}</div><h3>Month <em>orbit</em></h3></div><button type="button" className="btn sm" onClick={() => go("activities")}>Open</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i} className="mono faint" style={{ fontSize: 10, textAlign: "center" }}>{x}</span>)}
              {Array.from({ length: new Date(y, m - 1, 1).getDay() }, (_, i) => <span key={"b" + i} />)}
              {Array.from({ length: daysIn(y, m) }, (_, i) => {
                const dd = i + 1, p = dd <= d ? dayPct(acts, comp, dd) : null;
                return <button type="button" key={dd} title={p == null ? `${dd} ${MON[m - 1]}` : `${dd} ${MON[m - 1]} · ${Math.round(p * 100)}%`} aria-label={p == null ? `${dd} ${MON[m - 1]}` : `${dd} ${MON[m - 1]}, ${Math.round(p * 100)}%`} onClick={() => go("activities")}
                  style={{ aspectRatio: "1", borderRadius: "50%", border: dd === d ? "2px solid var(--fg)" : "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, display: "grid", placeItems: "center", padding: 0,
                    background: p == null ? "transparent" : `color-mix(in oklab,var(--red) ${Math.round(p * 100)}%,var(--bg-2))`, color: p != null && p >= 0.55 ? "#fff" : "var(--fg-3)", outline: p == null ? "1px dashed var(--line-2)" : "none", outlineOffset: -1 }}>{dd}</button>;
              })}
            </div>
          </section>

          <section className="tile s3"><div className="cap">Last 14 days</div><h3 className="serif" style={{ fontSize: 28, margin: "4px 0 16px" }}>Pulse</h3>
            <svg viewBox="0 0 140 60" width="100%" height="90" preserveAspectRatio="none" role="img" aria-label={`14 day trend, today ${Math.round(pct * 100)}%`}>
              <polyline fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={last14.map((x, i) => `${i * 10 + 5},${56 - x.p * 50}`).join(" ")} />
              {last14.map((x, i) => <circle key={i} cx={i * 10 + 5} cy={56 - x.p * 50} r={i === 13 ? 4 : 2.2} fill={i === 13 ? "var(--red)" : "var(--fg)"} />)}
            </svg>
            <div className="row sb mono faint" style={{ fontSize: 10 }}><span>{last14[0].dt.getDate()} {MON[last14[0].dt.getMonth()]}</span><span>today</span></div>
          </section>

          <section className="tile s6">
            <div className="th"><div><div className="cap">Pinned</div><h3>Sticky <em>board</em></h3></div><div className="row" style={{ gap: 6 }}>
              {stickyList.length > 3 && <button type="button" className="btn sm ghost" aria-expanded={allSt} onClick={() => setAllSt(v => !v)}>{allSt ? "Show less" : `All ${stickyList.length}`}</button>}
              <button type="button" className="btn sm" onClick={() => setSticky({ text: "", tone: STICKY_T[stickyList.length % 5] })}><Icon n="plus" s={14} />Sticky</button></div></div>
            {stickies.loading && !stickyList.length ? <div className="skel" style={{ height: 150 }} /> : !stickyList.length ? <Empty title="Board is clear" body="Pin a thought with Quick add." /> : (
              // three per row; the rest open with "All N"
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, padding: "6px 2px 10px" }}>{(allSt ? stickyList : stickyList.slice(0, 3)).map((n, i) =>
                <button type="button" key={n.id} dir="auto" className="tile ut" onClick={() => setSticky({ ...n, tone: stickyTone(n.color, i) })}
                  // filled with its colour: the ink pass turns t-gold/green/blue/violet tiles white with a thin top bar
                  style={{ background: TONE_HEX[stickyTone(n.color, i)], color: stickyTone(n.color, i) === "red" ? "#fff" : "#111", height: 160, padding: "16px 14px", overflow: "hidden", textAlign: "left", cursor: "pointer", transform: `rotate(${(i % 3 - 1) * 1.6}deg)`, fontWeight: 700, fontSize: "clamp(12px,1.1vw,14px)", lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "break-word", hyphens: "auto", alignItems: "flex-start", display: "block" }}>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.text}</span></button>)}</div>
            )}
          </section>

          <section className="tile s3">
            <div className="th"><div><div className="cap">{MONTHS[m - 1]}</div><h3>Goals</h3></div><span className="mono faint">{goalList.filter(g => g.completed).length}/{goalList.length}</span></div>
            {!goalList.length ? <p className="faint" style={{ fontSize: 13 }}>No goals yet — add one with Quick add. Start with “13 {MON[m - 1]}:” to date it.</p> : (
              <div className="stack" style={{ gap: 2 }}>{goalList.map(g => {
                const [chip, text] = goalParts(g.text);
                return (
                  <div key={g.id} className="list-row" style={{ padding: "8px 0" }}>
                    <button type="button" className={"tick" + (g.completed ? " on" : "")} style={{ width: 22, height: 22 }} aria-pressed={!!g.completed} aria-label={"Toggle " + g.text} onClick={() => goalToggle(g)}><Icon n="check" s={11} w={3} /></button>
                    <span className="grow ut" dir="auto" style={{ fontSize: 13, textDecoration: g.completed ? "line-through" : "none", color: g.completed ? "var(--fg-4)" : "var(--fg)" }}>
                      {chip && <span className="pill" style={{ height: 20, marginRight: 6, fontSize: 10 }}>{chip}</span>}{text}</span>
                    <button type="button" className="btn ghost sm icon" aria-label={"Delete " + g.text} onClick={() => goalDel(g)}><Icon n="x" s={13} /></button>
                  </div>
                );
              })}</div>
            )}
          </section>

          <section className="tile t-violet s3" style={{ display: "flex", flexDirection: "column" }}><div className="cap">Revisit a note</div>
            {note ? <>
              <div className="serif ut" dir="auto" style={{ fontSize: 26, lineHeight: 1.05, margin: "10px 0 12px", textWrap: "balance" }}>{plain(note.question)}</div>
              {reveal && <p className="ut" dir="auto" style={{ fontSize: 13, lineHeight: 1.5, background: "var(--bg-2)", borderRadius: 14, padding: 12, maxHeight: 180, overflow: "auto" }}>{noteAnswer || "No answer yet."}</p>}
              <div className="row wrap" style={{ marginTop: "auto", paddingTop: 12 }}>
                <button type="button" className="btn sm" onClick={() => setReveal(r => !r)}>{reveal ? "Hide" : "Reveal"}</button>
                <button type="button" className="btn sm ghost" onClick={() => { setRv(x => x + 1 + Math.floor(Math.random() * Math.max(1, noteList.length - 1))); setReveal(false); }}>Another</button>
                <button type="button" className="btn sm ghost" onClick={() => go("notes/" + note.id)}>Open</button>
              </div>
            </> : <p style={{ marginTop: 10 }} className="muted">{notes.loading ? "Loading…" : "Saved notes resurface here."}</p>}
          </section>

          {show.books && <section className={"tile t-blue " + span}><div className="row sb"><span className="cap">Reading</span><button type="button" className="btn sm" onClick={() => go("books")}>Read</button></div>
            <div className="serif ut" dir="auto" style={{ fontSize: 34, lineHeight: 1, margin: "12px 0 4px" }}>{cb ? cb.title : books.loading ? "…" : "No book yet"}</div>
            {cb && <div style={{ fontSize: 12.5, fontWeight: 600 }}>p.{cb.current_page}{cb.total_pages ? ` of ${cb.total_pages}` : ""}</div>}
            {bk && <div className="row" style={{ marginTop: 16, gap: 12 }}>
              <Ring v={bk.pages_today / (bk.daily_pages_goal || 10)} size={64} w={8} color="var(--blue)" track="var(--bg-2)"><b className="mono" style={{ fontSize: 13 }}>{bk.pages_today}</b></Ring>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{bk.pages_today} of {bk.daily_pages_goal} pages today<br /><span style={{ opacity: 0.7 }}>{Math.max(0, bk.daily_pages_goal - bk.pages_today)} to go</span></span>
            </div>}
          </section>}

          {show.qaza && <section className={"tile t-green " + span}><div className="row sb"><span className="cap">Qaza remaining</span><button type="button" className="btn sm" onClick={() => go("qaza-namaz")}>Log</button></div>
            <div className="big" style={{ marginTop: 12 }}>{qz ? qz.r.toLocaleString() : "—"}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>{qz ? `${Math.max(0, qz.o - qz.r).toLocaleString()} made up · across five prayers` : qaza.loading ? "Loading…" : "Set it up in Qaza"}</div></section>}

          {show.money && <section className={"tile " + span}><div className="row sb"><span className="cap">Income left · {MON[m - 1]}</span><button type="button" className="btn sm" onClick={() => go("expenses")}>Money</button></div>
            {income > 0 ? <>
              <div className="big" style={{ marginTop: 12, color: left < 0 ? "var(--err)" : undefined }}>{Math.abs(left) >= 1000 ? Math.round(left / 1000) : left}<small>{Math.abs(left) >= 1000 ? "k" : ""}</small></div>
              <Meter v={spent / income} style={{ marginTop: 14 }} />
              <div className="mono muted" style={{ fontSize: 11.5, marginTop: 8 }}>{money(spent)} of {money(income)}</div>
            </> : <>
              <div className="big" style={{ marginTop: 12 }}>{Math.round(spent / 1000)}<small>k spent</small></div>
              <div className="mono muted" style={{ fontSize: 11.5, marginTop: 8 }}>{money_.loading ? "Loading…" : "Set this month's income in Money"}</div>
            </>}
          </section>}
        </div>
      )}
      {sticky && <StickyEdit note={sticky} stickies={stickies} onClose={() => setSticky(null)} />}
    </>
  );
}

/* Number/text value input that saves on blur or Enter, so typing doesn't fire a request per key. */
function NumIn({ value, type, label, onSave }) {
  const [v, setV] = useState(String(value ?? ""));
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setV(String(value ?? "")); }
  const commit = () => { if (v !== String(value ?? "")) onSave(v); };
  return <input type={type === "number" ? "number" : "text"} dir="auto" aria-label={label} value={v} placeholder="0" onChange={e => setV(e.target.value)} onBlur={commit}
    onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
    style={{ width: type === "number" ? 52 : 90, height: 24, border: "none", borderRadius: 99, textAlign: "center", background: "var(--bg-2)", color: "var(--fg)", fontFamily: "var(--font-mono)", fontSize: 12 }} />;
}

function QuickAdd(props) {
  const { money } = props;
  const { mode, setMode, v, setV, busy, amt, nm, bad, add } = useQuickAdd(props);
  return (
    <section className="tile ink s5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><div className="cap" style={{ color: "#8B867D" }}>Quick add</div><h3 className="serif" style={{ fontSize: 30, lineHeight: 1 }}>Say it once, <em style={{ color: "var(--red)" }}>file it</em>.</h3></div>
      <div className="seg" style={{ background: "var(--ink-3)", alignSelf: "flex-start" }}>{[["sticky", "Sticky"], ["goal", "Goal"], ["expense", "Expense"]].map(([k, l]) =>
        <button type="button" key={k} className={mode === k ? "on" : ""} aria-pressed={mode === k} style={mode === k ? { background: "var(--paper-0)", color: "var(--ink-0)" } : { color: "#8B867D" }} onClick={() => setMode(k)}>{l}</button>)}</div>
      <div className="row" style={{ marginTop: "auto" }}>
        <input className="input grow" dir="auto" style={{ background: "var(--ink-3)", color: "#fff" }} aria-label="Quick add" placeholder={mode === "expense" ? "500 petrol" : mode === "goal" ? "A goal for this month" : "Pin a quick thought"}
          value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <button type="button" className="btn red" disabled={bad || busy} onClick={add}><Icon n="plus" />Add</button>
      </div>
      {mode === "expense" && v && <div className="mono" style={{ fontSize: 11.5, color: "#8B867D" }}>{amt && nm ? `→ ${money(amt)} · ${nm} · Other` : "Amount, then a name"}</div>}
    </section>
  );
}

export function StickyEdit({ note, stickies, onClose }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const [text, setText] = useState(note.text), [tone, setTone] = useState(note.tone), [busy, setBusy] = useState(false);
  const dirty = text !== note.text || tone !== note.tone;
  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const body = { text: text.trim(), color: TONE_HEX[tone] };
      if (note.id) { await api.put(`/sticky-notes/${note.id}`, body); stickies.setData(l => l.map(x => x.id === note.id ? { ...x, ...body } : x)); }
      else { const n = await api.post("/sticky-notes", body); stickies.setData(l => [n, ...(l || [])]); }
      toast("Sticky saved"); onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  const del = async () => {
    if (!(await ask({ title: "Remove sticky?", body: text, ok: "Remove", danger: true }))) return;
    try { await api.del(`/sticky-notes/${note.id}`); stickies.setData(l => l.filter(x => x.id !== note.id)); toast("Sticky removed"); onClose(); }
    catch (e) { toast(e.message, "err"); }
  };
  const close = async () => { if (!dirty || await ask({ title: "Discard changes?", body: "Your edits to this sticky will be lost.", ok: "Discard", danger: true })) onClose(); };
  return (
    <Modal size="sm" kicker="Sticky" title={note.id ? "Edit sticky" : "New sticky"} onClose={close}
      foot={<>{note.id && <button type="button" className="btn danger" style={{ marginRight: "auto" }} onClick={del}>Remove</button>}
        <button type="button" className="btn" onClick={close}>Cancel</button><button type="button" className="btn primary" disabled={!text.trim() || busy} onClick={save}>Save</button></>}>
      <Field label="Text" req><textarea className="input" dir="auto" autoFocus value={text} onChange={e => setText(e.target.value)} style={{ background: TONE_HEX[tone], color: "#111", fontWeight: 700, minHeight: 140 }} /></Field>
      <div className="row" role="group" aria-label="Colour">{STICKY_T.map(x => <button type="button" key={x} aria-label={x} aria-pressed={tone === x} onClick={() => setTone(x)}
        style={{ width: 30, height: 30, borderRadius: "50%", border: tone === x ? "3px solid var(--fg)" : "none", background: TONE_HEX[x], cursor: "pointer" }} />)}</div>
    </Modal>
  );
}

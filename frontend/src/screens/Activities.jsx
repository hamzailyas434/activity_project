import { Fragment, useState } from "react";
import { Empty, Field, Head, Icon, Modal, Scrim, Seg, Skeleton, TONES, TONE_HEX, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import useLoad from "../lib/useLoad";
import useMonth, { dayPct, parseNotes } from "../lib/useMonth";
import useNow from "../lib/useNow";
import { DOW, MON, MONTHS, daysIn, ymd } from "../lib/format";
import { go } from "../shell/route";

const GROUPS = ["Prayers", "Dhikr", "Study", "Health"];
const TYPES = [["checkbox", "Tick"], ["number", "Number"], ["text", "Text"]];
const isVal = a => a.type === "number" || a.type === "text";
const toneOf = hex => TONES.find(t => TONE_HEX[t].toLowerCase() === String(hex || "").toLowerCase());

export default function Activities({ cur, sub }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const now = useNow();
  const ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
  const [ym, setYm] = useState([ty, tm]);
  const [y, m] = ym;
  const isCur = y === ty && m === tm;
  const other = useMonth(isCur ? null : api, y, m);
  const mo = isCur ? cur : other;
  const journal = useLoad(api, async a => {
    const rows = await a.get(`/day-journal?year=${y}&month=${m}`).catch(() => []);
    return Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.date, r.text]));
  }, `${y}-${m}`, {});

  const dim = daysIn(y, m), start = new Date(y, m - 1, 1).getDay();
  const future = y > ty || (y === ty && m > tm);
  const lastDay = future ? 0 : isCur ? td : dim; // days that can be ticked / count toward rate
  const weeks = Array.from({ length: Math.ceil((start + dim) / 7) }, (_, w) => Array.from({ length: 7 }, (_, k) => w * 7 + k - start + 1));
  const todayWeek = isCur ? Math.floor((start + td - 1) / 7) : 0;

  const [view, setView] = useState("week"), [wkSel, setWk] = useState(null);
  const wk = Math.min(wkSel ?? todayWeek, weeks.length - 1);
  const [cell, setCell] = useState(null), [jr, setJr] = useState(null), [edit, setEdit] = useState(null);
  const adding = sub === "new";

  const acts = mo.activities, comp = mo.comp;
  const shift = n => { const dt = new Date(y, m - 1 + n, 1); setYm([dt.getFullYear(), dt.getMonth() + 1]); setWk(null); };
  const err = e => toast(e.message || "Something went wrong", "err");
  const toggle = (a, d) => { if (d > lastDay) return; mo.toggle(a, d).catch(err); };
  const setVal = (a, d, v) => mo.setValue(a, d, v).catch(err);

  const move = async (a, dir) => {
    const l = [...acts], i = l.findIndex(x => x.id === a.id), j = i + dir;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    const before = acts;
    mo.setActivities(l);
    try { await api.post("/activities/reorder", { orderedIds: l.map(x => x.id), year: y, month: m }); }
    catch (e) { mo.setActivities(before); err(e); }
  };
  const del = async a => {
    if (!(await ask({ title: `Remove ${a.name}?`, body: `It is removed from ${MONTHS[m - 1]}. Past months keep their data.`, ok: "Remove", danger: true }))) return;
    try {
      const res = await api.raw(`/activities/${a.id}?year=${y}&month=${m}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Couldn't remove the routine");
      mo.setActivities(l => l.filter(x => x.id !== a.id));
      toast(a.name + " removed");
    } catch (e) { err(e); }
  };
  const importPrev = async () => {
    const pm = MONTHS[(m + 10) % 12];
    if (!(await ask({ kicker: "Activities", title: `Import ${pm} routines?`, body: `Routines from ${pm} that are not already here will be added to ${MONTHS[m - 1]}. Existing data is not touched.`, ok: "Import" }))) return;
    try { await api.post("/activities/import-previous-month", { year: y, month: m }); await mo.reload(); toast(`${pm} routines imported`); }
    catch (e) { err(e); }
  };

  const rate = a => { if (!lastDay) return 0; let n = 0; for (let d = 1; d <= lastDay; d++) if (comp[`${d}-${a.id}`]?.done) n++; return n / lastDay; };
  const label = d => `${d} ${MON[m - 1]}`;

  // Plain render function, not a component: a component defined in render would remount on every tick and break dblclick + input focus.
  const cellEl = (a, d, big, key) => {
    if (d < 1 || d > dim) return <span key={key} />;
    const c = comp[`${d}-${a.id}`], fut = d > lastDay, notes = parseNotes(c?.note), nt = notes.length > 0;
    const open = e => { e.preventDefault(); if (!fut) setCell({ a, d }); };
    if (isVal(a) && big && !fut) {
      return (
        <div key={key} style={{ position: "relative" }} onContextMenu={open} onDoubleClick={open}>
          <ValueCell a={a} value={c?.value ?? ""} label={`${a.name} ${label(d)}`} onSave={v => setVal(a, d, v)} />
          {nt && <i style={{ position: "absolute", top: 4, right: 5, width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", pointerEvents: "none" }} />}
        </div>
      );
    }
    const done = !!c?.done;
    const bg = done ? (c.color || "var(--red)") : fut ? "transparent" : "var(--bg-2)";
    return (
      <button type="button" key={key} aria-label={`${a.name} ${label(d)}${done ? ", done" : ""}${nt ? ", has notes" : ""}`} aria-pressed={done} disabled={fut}
        title={isVal(a) && c?.value ? `${c.value} · double-click for notes` : "Click to tick · double-click for notes"}
        onClick={() => (isVal(a) ? setCell({ a, d }) : toggle(a, d))} onContextMenu={open} onDoubleClick={open}
        style={{ position: "relative", height: big ? 44 : 22, width: big ? "100%" : 22, minWidth: big ? 44 : 22, borderRadius: big ? 14 : "50%", border: fut ? "1px dashed var(--line-2)" : "none", padding: 0,
          cursor: fut ? "default" : "pointer", background: bg, color: "#fff", display: "grid", placeItems: "center", transition: "transform .2s cubic-bezier(.3,1.2,.4,1)" }}>
        {done && big && <Icon n="check" s={16} w={2.6} />}
        {nt && <i style={{ position: "absolute", top: big ? 4 : 1, right: big ? 5 : 1, width: 5, height: 5, borderRadius: "50%", background: done ? "#fff" : "var(--gold)" }} />}
      </button>
    );
  };

  return (
    <>
      <Head n="02" eyebrow={`${MONTHS[m - 1]} ${y} · ${acts.length} routines`} title={<>How the <em>month</em> is going.</>}
        sub="Tap to tick. Double-click (or right-click) a cell for notes and a colour. Tap a date for the day's journal.">
        <Seg value={view} onChange={setView} label="View" options={[["week", "Week"], ["month", "Month"], ["rate", "Ranking"]]} />
        <div className="row" style={{ gap: 4, background: "var(--bg-1)", borderRadius: 99, padding: 4 }}>
          <button type="button" className="btn ghost sm icon" aria-label="Previous month" onClick={() => shift(-1)}><Icon n="chevL" s={15} /></button>
          <span className="mono" style={{ fontSize: 12, minWidth: 74, textAlign: "center" }} aria-live="polite">{MON[m - 1]} {y}</span>
          <button type="button" className="btn ghost sm icon" aria-label="Next month" onClick={() => shift(1)}><Icon n="chevR" s={15} /></button>
        </div>
        <button type="button" className="btn" onClick={importPrev}><Icon n="export" />Import {MON[(m + 10) % 12]}</button>
        <button type="button" className="btn primary" onClick={() => go("activities/new")}><Icon n="plus" />Routine</button>
      </Head>

      {mo.loading && !acts.length ? <Skeleton tiles={[["s12", 420]]} />
        : mo.error && !acts.length ? <Empty title="Couldn't load" body={mo.error} action={<button type="button" className="btn primary" onClick={mo.reload}>Try again</button>} />
        : !acts.length ? <Empty title="No routines this month" body="Add one, or import last month's." action={<div className="row" style={{ justifyContent: "center" }}><button type="button" className="btn" onClick={importPrev}>Import</button><button type="button" className="btn primary" onClick={() => go("activities/new")}>Add routine</button></div>} />
        : <>
          {view === "week" && (
            <section className="tile">
              <div className="row sb wrap" style={{ marginBottom: 18 }}>
                <div className="seg">{weeks.map((_, i) => <button type="button" key={i} className={wk === i ? "on" : ""} aria-pressed={wk === i} onClick={() => setWk(i)}>Week {i + 1}</button>)}</div>
                <span className="mono muted" style={{ fontSize: 12 }}>{Math.max(1, weeks[wk][0])}–{Math.min(dim, weeks[wk][6])} {MON[m - 1]}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(150px,1.3fr) repeat(7,minmax(54px,1fr)) 70px", gap: 8, minWidth: 720, alignItems: "center" }}>
                  <span />
                  {weeks[wk].map((d, i) => {
                    const ok = d >= 1 && d <= dim, isT = isCur && d === td, has = ok && journal.data?.[ymd(y, m, d)];
                    return (
                      <button type="button" key={i} disabled={!ok} onClick={() => setJr(d)} aria-label={ok ? `Journal for ${DOW[i]} ${label(d)}` : undefined}
                        style={{ border: "none", background: isT ? "var(--fg)" : "transparent", color: isT ? "var(--bg)" : "var(--fg-2)", borderRadius: 14, padding: "6px 0", cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.2 }}>
                        <div className="cap" style={{ color: "inherit", fontSize: 9.5 }}>{DOW[i]}</div>
                        <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{ok ? d : ""}</div>
                        {has && <i style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: "var(--red)", margin: "3px auto 0" }} />}
                      </button>
                    );
                  })}
                  <span className="cap" style={{ textAlign: "right" }}>Rate</span>
                  {acts.map((a, i) => (
                    <Fragment key={a.id}>
                      <div className="row" style={{ gap: 6, minWidth: 0 }}>
                        <button type="button" className="btn ghost sm icon" style={{ height: 30, width: 26 }} aria-label={"Move " + a.name + " up"} disabled={!i} onClick={() => move(a, -1)}><Icon n="chevU" s={12} /></button>
                        <button type="button" className="grow" onClick={() => setEdit(a)} title="Edit routine" style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0 }}>
                          <b dir="auto" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</b>
                          <span className="faint" style={{ fontSize: 11 }}>{a.group || "Routine"}{isVal(a) ? " · " + (a.type === "number" ? "number" : "text") : ""}</span>
                        </button>
                        <button type="button" className="btn ghost sm icon" aria-label={"Remove " + a.name} onClick={() => del(a)}><Icon n="trash" s={13} /></button>
                      </div>
                      {weeks[wk].map((d, j) => cellEl(a, d, true, j))}
                      <span className="mono" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{Math.round(rate(a) * 100)}%</span>
                    </Fragment>
                  ))}
                </div>
              </div>
            </section>
          )}

          {view === "month" && (
            <section className="tile">
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: `minmax(140px,1fr) repeat(${dim},22px)`, gap: "10px 4px", minWidth: 140 + dim * 26, alignItems: "center" }}>
                  <span />
                  {Array.from({ length: dim }, (_, i) => {
                    const isT = isCur && i + 1 === td;
                    return <button type="button" key={i} onClick={() => setJr(i + 1)} className="mono" aria-label={`Journal for ${label(i + 1)}`}
                      style={{ border: "none", background: "none", fontSize: 9.5, padding: 0, color: isT ? "var(--red)" : "var(--fg-4)", cursor: "pointer", fontWeight: isT ? 800 : 400 }}>{i + 1}</button>;
                  })}
                  {acts.map(a => (
                    <Fragment key={a.id}>
                      <b dir="auto" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</b>
                      {Array.from({ length: dim }, (_, i) => cellEl(a, i + 1, false, i))}
                    </Fragment>
                  ))}
                  <span className="cap">Day %</span>
                  {Array.from({ length: dim }, (_, i) => {
                    const p = i < lastDay ? dayPct(acts, comp, i + 1) : 0;
                    return <i key={i} title={Math.round(p * 100) + "%"} style={{ height: 40, borderRadius: 6, background: `linear-gradient(to top,var(--red) ${p * 100}%,var(--bg-2) ${p * 100}%)` }} />;
                  })}
                </div>
              </div>
            </section>
          )}

          {view === "rate" && (
            <div className="bento">{[...acts].sort((x, z) => rate(z) - rate(x)).map((a, i) => (
              <section key={a.id} className={"tile s3" + (i === 0 ? " t-red" : "")}>
                <div className="row sb"><span className="mono" style={{ fontSize: 12, opacity: 0.7 }}>#{i + 1}</span><span className="pill" style={i === 0 ? { background: "rgba(0,0,0,.2)", color: "#fff" } : {}}>{a.group || "Routine"}</span></div>
                <div className="serif ut" dir="auto" style={{ fontSize: 30, lineHeight: 1, margin: "14px 0 6px" }}>{a.name}</div>
                <div className="big" style={{ fontSize: 64 }}>{Math.round(rate(a) * 100)}<small>%</small></div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{Math.round(rate(a) * lastDay)} of {lastDay} days</div>
              </section>
            ))}</div>
          )}
        </>}

      {cell && <CellNotes a={cell.a} d={cell.d} y={y} m={m} c={comp[`${cell.d}-${cell.a.id}`]} mo={mo} onClose={() => setCell(null)} />}
      {jr && <Journal d={jr} y={y} m={m} acts={acts} comp={comp} past={jr <= lastDay} text={journal.data?.[ymd(y, m, jr)] || ""}
        onSaved={t => journal.setData(j => ({ ...j, [ymd(y, m, jr)]: t }))} onClose={() => setJr(null)} />}
      {(adding || edit) && <RoutineForm a={edit} y={y} m={m} onClose={() => { setEdit(null); if (adding) go("activities"); }}
        onSaved={(a, isNew) => { mo.setActivities(l => (isNew ? [...l, a] : l.map(x => (x.id === a.id ? { ...x, ...a } : x)))); }} />}
    </>
  );
}

/* Number / text cell. Saves on blur or Enter so focus stays put while typing. */
function ValueCell({ a, value, label, onSave }) {
  const [v, setV] = useState(String(value ?? ""));
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setV(String(value ?? "")); }
  const filled = String(value ?? "").trim() !== "";
  return (
    <input className="input mono" type={a.type === "number" ? "number" : "text"} dir="auto" aria-label={label} value={v} placeholder="—"
      onChange={e => setV(e.target.value)} onBlur={() => { if (v !== String(value ?? "")) onSave(v); }} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
      style={{ height: 44, textAlign: "center", padding: "0 4px", borderRadius: 14, background: filled ? "var(--fg)" : undefined, color: filled ? "var(--bg)" : undefined }} />
  );
}

function CellNotes({ a, d, y, m, c, mo, onClose }) {
  const { toast, ask } = useUI();
  const init = { list: parseNotes(c?.note), color: c?.color || "" };
  const [list, setList] = useState(init.list), [color, setColor] = useState(init.color), [draft, setDraft] = useState("");
  const [done, setDone] = useState(!!c?.done), [busy, setBusy] = useState(false);
  const dt = new Date(y, m - 1, d);
  const dirty = !!draft.trim() || done !== !!c?.done || JSON.stringify({ list, color }) !== JSON.stringify(init);
  const add = () => { if (!draft.trim()) return; setList(l => [...l, draft.trim()]); setDraft(""); };
  const close = async () => { if (!dirty || await ask({ title: "Discard changes?", body: "Notes you added here will be lost.", ok: "Discard", danger: true })) onClose(); };
  const save = async () => {
    const l = [...list, ...(draft.trim() ? [draft.trim()] : [])].map(x => x.trim()).filter(Boolean);
    setBusy(true);
    try {
      await mo.saveCell(a, d, { notes: l, color, done: done !== !!c?.done ? done : undefined });
      toast(`Saved to ${a.name} · ${d} ${MON[m - 1]}`); onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  const tone = toneOf(color);
  const tc = color || "var(--line-2)";
  return (
    <Scrim onClose={close}>
      <div className="cn" role="dialog" aria-modal="true" aria-label={`Notes for ${a.name}, ${d} ${MONTHS[m - 1]}`} style={{ "--tc": tc }}>
        <header className="cn-h">
          <div className="cn-date"><span className="cn-d">{d}</span><span className="cn-m">{MON[m - 1]}<br />{DOW[dt.getDay()]}</span></div>
          <div className="grow" style={{ minWidth: 0 }}><div className="cap">{a.group || "Routine"}</div><div className="cn-t" dir="auto">{a.name}</div></div>
          <button type="button" className="btn ghost icon" aria-label="Close" onClick={close}><Icon n="x" /></button>
        </header>
        <button type="button" className={"cn-status" + (done ? " on" : "")} aria-pressed={done} onClick={() => setDone(v => !v)}>
          <span className="tick" style={{ pointerEvents: "none" }}><Icon n="check" s={14} w={2.6} /></span>
          <span className="grow" style={{ textAlign: "left" }}><b>{done ? "Done" : "Not done"}</b>{isVal(a) && c?.value && <span className="mono faint"> · {c.value}</span>}</span>
          <span className="mono faint" style={{ fontSize: 11 }}>tap to {done ? "undo" : "mark done"}</span>
        </button>
        <div className="cn-b">
          <div className="cap">Notes · {list.length}</div>
          {!list.length && <p className="faint" style={{ fontSize: 13 }}>Nothing yet — why it was missed, how it went, a reminder…</p>}
          <ol className="cn-list">{list.map((t, i) => (
            <li key={i}>
              <textarea dir="auto" aria-label={"Note " + (i + 1)} value={t} rows={Math.min(4, Math.max(1, Math.ceil(t.length / 42)))} onChange={e => setList(l => l.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className="btn ghost sm icon" aria-label={"Delete note " + (i + 1)} onClick={() => setList(l => l.filter((_, j) => j !== i))}><Icon n="trash" s={13} /></button>
            </li>
          ))}</ol>
          <div className="cn-add">
            <textarea dir="auto" autoFocus aria-label="New note" placeholder="Write a note…  ↵ to add" value={draft} rows={2} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }} />
            <button type="button" className="btn sm" disabled={!draft.trim()} onClick={add}><Icon n="plus" s={13} />Add</button>
          </div>
          <div className="cap" style={{ marginTop: 6 }}>Mark with a colour</div>
          <div className="cn-sw" role="group" aria-label="Colour">
            <button type="button" aria-label="No colour" aria-pressed={!color} className={!color ? "on" : ""} onClick={() => setColor("")} style={{ background: "var(--bg-2)" }}><Icon n="x" s={12} /></button>
            {TONES.map(x => <button type="button" key={x} aria-label={x} aria-pressed={tone === x} className={tone === x ? "on" : ""} onClick={() => setColor(TONE_HEX[x])} style={{ background: TONE_HEX[x] }} />)}
            <span className="faint" style={{ fontSize: 11.5, marginLeft: 6 }}>{!color ? "Uses the default red" : tone ? "Cell shows in this colour" : "Custom colour (v1)"}</span>
          </div>
        </div>
        <footer className="cn-f">
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn red" disabled={busy} onClick={save}><Icon n="check" s={14} w={2.4} />Save</button>
        </footer>
      </div>
    </Scrim>
  );
}

function Journal({ d, y, m, acts, comp, past, text, onSaved, onClose }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const [t, setT] = useState(text), [busy, setBusy] = useState(false);
  const p = past ? dayPct(acts, comp, d) : null;
  const dt = new Date(y, m - 1, d);
  const close = async () => { if (t === text || await ask({ title: "Discard changes?", body: "Your journal edits will be lost.", ok: "Discard", danger: true })) onClose(); };
  const save = async () => {
    setBusy(true);
    try { await api.put(`/day-journal/${ymd(y, m, d)}`, { text: t }); onSaved(t.trim()); toast("Journal saved"); onClose(); }
    catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal kicker={`${dt.toLocaleDateString("en-GB", { weekday: "long" })} · ${p == null ? "upcoming" : Math.round(p * 100) + "% done"}`} title={`${d} ${MONTHS[m - 1]}`} onClose={close}
      foot={<><button type="button" className="btn" onClick={close}>Close</button><button type="button" className="btn primary" disabled={busy || t === text} onClick={save}>Save</button></>}>
      {p != null && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{acts.map(a => <span key={a.id} dir="auto" className={"pill" + (comp[`${d}-${a.id}`]?.done ? " red" : "")}>{a.name}</span>)}</div>}
      <Field label="Journal"><textarea className="input" dir="auto" autoFocus value={t} onChange={e => setT(e.target.value)} placeholder="How did the day go?" style={{ minHeight: 160 }} /></Field>
    </Modal>
  );
}

function RoutineForm({ a, y, m, onClose, onSaved }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const init = { name: a?.name || "", type: a?.type || "checkbox", group: a?.group || "Prayers" };
  const [f, setF] = useState(init), [touched, setTouched] = useState(false), [busy, setBusy] = useState(false);
  const bad = touched && !f.name.trim();
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const close = async () => { if (!dirty || await ask({ title: "Discard changes?", body: "This routine won't be saved.", ok: "Discard", danger: true })) onClose(); };
  const save = async () => {
    setTouched(true);
    if (!f.name.trim() || busy) return;
    setBusy(true);
    try {
      if (a) {
        const r = await api.put(`/activities/${a.id}`, { name: f.name.trim(), group: f.group });
        onSaved({ ...a, ...r, group: r?.group ?? f.group }, false); toast(f.name.trim() + " updated");
      } else {
        const r = await api.post("/activities", { name: f.name.trim(), type: f.type, group: f.group, year: y, month: m });
        onSaved({ ...r, group: r?.group ?? f.group }, true); toast(f.name.trim() + " added");
      }
      onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal kicker="Activities" title={a ? "Edit routine" : "New routine"} onClose={close}
      foot={<><button type="button" className="btn" onClick={close}>Cancel</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{a ? "Save" : "Add routine"}</button></>}>
      <Field label="Name" req err={bad && "Give it a name"}>
        <input className={"input" + (bad ? " bad" : "")} autoFocus dir="auto" maxLength={100} value={f.name} onBlur={() => setTouched(true)} onChange={e => setF({ ...f, name: e.target.value })}
          onKeyDown={e => e.key === "Enter" && save()} placeholder="e.g. Tajweed" />
      </Field>
      <Field label="Group"><Seg value={f.group} onChange={g => setF({ ...f, group: g })} label="Group" options={GROUPS.map(g => [g, g])} /></Field>
      {a ? <p className="hint">Type: {TYPES.find(t => t[0] === a.type)?.[1] || "Tick"} — the type can't change once a routine has data.</p>
        : <Field label="Type" hint="Number routines log a value, e.g. minutes. Text routines log a word or two."><Seg value={f.type} onChange={t => setF({ ...f, type: t })} label="Type" options={TYPES} /></Field>}
    </Modal>
  );
}

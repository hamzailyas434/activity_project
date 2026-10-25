import { Empty, Icon, Skeleton, cellColor } from "../components/ui";
import { useActivitiesMonth } from "../lib/activities";
import { dayPct, parseNotes } from "../lib/useMonth";
import { DOW, MON, MONTHS, ymd } from "../lib/format";
import { CellNotes, Journal, RoutineForm } from "../screens/Activities";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 02 Activities — matrix table (or by-day cards), strongest / needs attention / manage.
   Click a cell to tick, double-click (or right-click) for notes + colour, click a date for the day journal. */
const isVal = a => a.type === "number" || a.type === "text";

export default function Activities({ cur, sub }) {
  const { y, m, isCur, td, mo, journal, dim, lastDay, view, setView, cell, setCell, jr, setJr, edit, setEdit, adding, acts, comp, shift, toggle, move, del, importPrev } = useActivitiesMonth(cur, sub);
  const v = view === "list" ? "list" : "matrix";
  const rows = acts.map(a => { let n = 0; for (let d = 1; d <= lastDay; d++) if (comp[`${d}-${a.id}`]?.done) n++; return { a, n, p: lastDay ? n / lastDay : 0 }; });
  const best = [...rows].sort((x, z) => z.p - x.p)[0], worst = [...rows].sort((x, z) => x.p - z.p)[0];
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const dow = d => DOW[new Date(y, m - 1, d).getDay()][0];
  const open = (a, d) => e => { e.preventDefault(); if (d <= lastDay) setCell({ a, d }); };

  return (
    <>
      <PageHead idx="02" meta={`${MONTHS[m - 1]} ${y} · ${isCur ? `${td} of ${dim} days` : `${acts.length} routines`}`} title={<>The <em>month</em> at a glance</>}
        sub="Click a cell to check it off. Double-click for notes and a colour. Click a date for the day journal.">
        <div className="seg"><button type="button" className={v === "matrix" ? "on" : ""} onClick={() => setView("matrix")}>Matrix</button><button type="button" className={v === "list" ? "on" : ""} onClick={() => setView("list")}>By day</button></div>
        <div className="row" style={{ gap: 4 }}>
          <button type="button" className="btn icon" aria-label="Previous month" onClick={() => shift(-1)}><Icon n="chevL" /></button>
          <span className="mono" style={{ minWidth: 76, textAlign: "center", fontSize: 12.5 }}>{MON[m - 1]} {y}</span>
          <button type="button" className="btn icon" aria-label="Next month" onClick={() => shift(1)}><Icon n="chevR" /></button>
        </div>
        <button type="button" className="btn" onClick={importPrev}>Import {MON[(m + 10) % 12]}</button>
        <button type="button" className="btn primary" onClick={() => go("activities/new")}><Icon n="plus" />Routine</button>
      </PageHead>

      {mo.loading && !acts.length ? <Skeleton tiles={[["s12", 380]]} />
        : !acts.length ? <Empty title={`No routines in ${MONTHS[m - 1]}`} body="Add one, or import last month's." action={<div className="row" style={{ justifyContent: "center" }}><button type="button" className="btn" onClick={importPrev}>Import</button><button type="button" className="btn primary" onClick={() => go("activities/new")}>Add routine</button></div>} />
        : v === "matrix" ? (
          <section className="card flush" style={{ marginBottom: 16 }}>
            <div className="tbl-wrap">
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr>
                  <th style={{ position: "sticky", left: 0, zIndex: 2, minWidth: 170 }}>Routine</th>
                  {days.map(d => {
                    const now = isCur && d === td, has = journal.data?.[ymd(y, m, d)];
                    return (
                      <th key={d} style={{ padding: "6px 0", textAlign: "center", minWidth: 30, background: now ? "var(--accent-soft)" : undefined }}>
                        <button type="button" className="th-sort" style={{ flexDirection: "column", gap: 0, width: "100%", color: now ? "var(--accent)" : undefined }} onClick={() => setJr(d)} aria-label={`Journal for ${d} ${MON[m - 1]}`}>
                          <span style={{ fontSize: 9 }}>{dow(d)}</span><span className="mono" style={{ fontSize: 11, textDecoration: has ? "underline" : "none" }}>{d}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="num">%</th>
                </tr></thead>
                <tbody>
                  {rows.map(({ a, p }) => (
                    <tr key={a.id}>
                      <td style={{ position: "sticky", left: 0, background: "var(--bg-1)", zIndex: 1, fontWeight: 600, whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} dir="auto">
                        <button type="button" className="th-sort" style={{ fontWeight: 600, color: "var(--fg)" }} onClick={() => setEdit(a)} title="Edit routine">{a.name}</button>
                        {isVal(a) && <span className="badge" style={{ marginLeft: 6, height: 18 }}>{a.type}</span>}
                      </td>
                      {days.map(d => {
                        const c = comp[`${d}-${a.id}`], on = !!c?.done, fut = d > lastDay, note = parseNotes(c?.note).length > 0;
                        return (
                          <td key={d} style={{ padding: 3, textAlign: "center", background: isCur && d === td ? "var(--accent-soft)" : undefined }}>
                            <button type="button" aria-label={`${a.name}, ${d} ${MON[m - 1]}, ${on ? "done" : "not done"}`} aria-pressed={on} disabled={fut}
                              onClick={() => (isVal(a) ? setCell({ a, d }) : toggle(a, d))} onDoubleClick={open(a, d)} onContextMenu={open(a, d)}
                              title={isVal(a) && c?.value ? String(c.value) : undefined}
                              style={{ width: 24, height: 24, borderRadius: 3, border: on ? "none" : "1px solid var(--line)", background: fut ? "transparent" : on ? (cellColor(c.color) || "var(--fg)") : "var(--bg-2)", color: "var(--bg)", fontSize: 9.5, fontFamily: "var(--font-mono)", cursor: fut ? "default" : "pointer", position: "relative", opacity: fut ? 0.3 : 1, overflow: "hidden" }}>
                              {a.type === "number" && on ? String(c.value).slice(0, 3) : ""}
                              {note && <i style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="num" style={{ fontWeight: 600 }}>{Math.round(p * 100)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ position: "sticky", left: 0, background: "var(--bg-2)", zIndex: 1, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 700 }}>Daily %</td>
                    {days.map(d => {
                      const p = d <= lastDay ? dayPct(acts, comp, d) : null;
                      return <td key={d} style={{ padding: "6px 3px", background: "var(--bg-2)", verticalAlign: "bottom" }}>{p != null && <div title={Math.round(p * 100) + "%"} style={{ height: Math.max(3, p * 34), background: p >= 0.8 ? "var(--ok)" : p >= 0.5 ? "var(--warn)" : "var(--err)", borderRadius: 2 }} />}</td>;
                    })}
                    <td style={{ background: "var(--bg-2)" }} />
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="stack gap-2" style={{ marginBottom: 16 }}>
            {Array.from({ length: lastDay }, (_, i) => lastDay - i).map(d => {
              const p = dayPct(acts, comp, d);
              return (
                <div key={d} className="card" style={{ padding: 14 }}>
                  <div className="row sb" style={{ marginBottom: 10 }}>
                    <button type="button" className="th-sort" onClick={() => setJr(d)}><b className="disp" style={{ fontSize: 26 }}>{d} {MON[m - 1]}</b></button>
                    <span className={"badge " + (p >= 0.8 ? "ok" : p >= 0.5 ? "warn" : "red")}>{Math.round(p * 100)}%</span>
                  </div>
                  <div className="row wrap gap-2">{acts.map(a => {
                    const c = comp[`${d}-${a.id}`], on = !!c?.done;
                    return <button type="button" key={a.id} dir="auto" className={"chip " + (on ? "on" : "")} aria-pressed={on} onClick={() => (isVal(a) ? setCell({ a, d }) : toggle(a, d))} onDoubleClick={open(a, d)} onContextMenu={open(a, d)}
                      style={on && c?.color ? { background: cellColor(c.color), color: "#fff" } : undefined}>{on && <Icon n="check" s={12} w={2.5} />}{a.name}{isVal(a) && on ? ` · ${c.value}` : ""}</button>;
                  })}</div>
                </div>
              );
            })}
            {!lastDay && <Empty title="Nothing to show yet" body="This month hasn't started." />}
          </section>
        )}

      {!!acts.length && (
        <div className="grid g-12">
          <section className="card c4"><div className="card-h"><div><div className="k">Strongest</div><h3 dir="auto">{best ? best.a.name : "—"}</h3></div></div>
            <div className="disp" style={{ fontSize: 64 }}>{best ? Math.round(best.p * 100) : 0}<span className="muted" style={{ fontSize: 26 }}>%</span></div>
            <p className="muted" style={{ fontSize: 13 }}>{best ? `${best.n} of ${lastDay} days` : ""}</p></section>
          <section className="card c4"><div className="card-h"><div><div className="k">Needs attention</div><h3 dir="auto">{worst ? worst.a.name : "—"}</h3></div></div>
            <div className="disp" style={{ fontSize: 64, color: "var(--warn)" }}>{worst ? Math.round(worst.p * 100) : 0}<span className="muted" style={{ fontSize: 26 }}>%</span></div>
            <p className="muted" style={{ fontSize: 13 }}>{worst ? `${worst.n} of ${lastDay} days` : ""}</p></section>
          <section className="card c4"><div className="card-h"><div><div className="k">{acts.length} routines</div><h3>Manage</h3></div></div>
            {acts.map((a, i) => (
              <div key={a.id} className="row sb" style={{ padding: "7px 0", borderBottom: "1px solid var(--line-soft)", gap: 4 }}>
                <button type="button" className="th-sort" style={{ flex: 1, minWidth: 0, justifyContent: "flex-start", color: "var(--fg)" }} onClick={() => setEdit(a)}>
                  <span dir="auto" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span className="muted mono" style={{ fontSize: 11, marginLeft: 6 }}>{a.group || a.type}</span>
                </button>
                <button type="button" className="btn sm icon ghost" aria-label={"Move up " + a.name} disabled={!i} onClick={() => move(a, -1)}><Icon n="up" s={13} /></button>
                <button type="button" className="btn sm icon ghost danger" aria-label={"Remove " + a.name} onClick={() => del(a)}><Icon n="trash" s={13} /></button>
              </div>
            ))}
          </section>
        </div>
      )}

      {cell && <CellNotes a={cell.a} d={cell.d} y={y} m={m} c={comp[`${cell.d}-${cell.a.id}`]} mo={mo} onClose={() => setCell(null)} />}
      {jr && <Journal d={jr} y={y} m={m} acts={acts} comp={comp} past={jr <= lastDay} text={journal.data?.[ymd(y, m, jr)] || ""}
        onSaved={t => journal.setData(j => ({ ...j, [ymd(y, m, jr)]: t }))} onClose={() => setJr(null)} />}
      {(adding || edit) && <RoutineForm a={edit} y={y} m={m} onClose={() => { setEdit(null); if (adding) go("activities"); }}
        onSaved={(a, isNew) => { mo.setActivities(l => (isNew ? [...l, a] : l.map(x => (x.id === a.id ? { ...x, ...a } : x)))); }} />}
    </>
  );
}

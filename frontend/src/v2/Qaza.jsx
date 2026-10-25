import { Empty, Field, Icon, Skeleton } from "../components/ui";
import { ago } from "../lib/format";
import { P, owedOf, remOf, useQaza } from "../lib/qaza";
import PageHead from "./PageHead";

/* v2 · 03 Qaza — pace planner with a finish date, overall progress per prayer, years missed, one card per prayer */
export default function Qaza() {
  const { now, data, loading, error, reload, q, pace, setPace, busy, dirty, tot, made, days, fin, years, adj, logAll, setYears, discard, save } = useQaza();
  if (!q && (loading || data)) return <><PageHead idx="03" meta="Qaza Namaz" title={<>Loading <em>qaza</em></>} /><Skeleton tiles={[["s7", 280], ["s5", 280], ["s12", 220]]} /></>;
  if (!q) return <Empty title="Couldn't load" body={error} action={<button type="button" className="btn primary" onClick={reload}>Try again</button>} />;
  const yrs = days / 365;

  return (
    <>
      <PageHead idx="03" meta={`Qaza Namaz · ${years != null ? years + " years missed" : "per prayer"}`} title={<>{tot.r.toLocaleString()} <em>to make up</em></>}
        sub={tot.o ? `${made.toLocaleString()} prayers made up so far. One a day is enough to start — it adds up.` : "Set how many years were missed to start counting."}>
        <button type="button" className="btn" disabled={!dirty || busy} onClick={discard}>Discard</button>
        <button type="button" className="btn primary" disabled={!dirty || busy} onClick={save}><Icon n="check" />{busy ? "Saving…" : "Save progress"}</button>
      </PageHead>

      <div className="grid g-12" style={{ marginBottom: 16 }}>
        <section className="card c7 qz-plan">
          <div className="card-h"><div><div className="k">Pace planner</div><h3>When will I finish?</h3></div></div>
          <div className="qz-pace">{[1, 2, 3, 5].map(n => <button type="button" key={n} className={pace === n ? "on" : ""} aria-pressed={pace === n} onClick={() => setPace(n)}><b className="disp">{n}</b><span>per prayer / day</span></button>)}</div>
          <div className="qz-out">
            <div>
              <div className="disp" style={{ fontSize: "clamp(44px,6vw,76px)", lineHeight: 0.9 }}>{yrs.toFixed(yrs < 10 ? 1 : 0)}<small style={{ fontSize: ".4em", color: "var(--fg-3)" }}> yrs</small></div>
              <div className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>≈ {days.toLocaleString()} days · done around {fin.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, maxWidth: 280 }}>At <b style={{ color: "var(--fg)" }}>{pace * 5}</b> qaza a day ({pace} with each of the five daily prayers). Based on the prayer with the most remaining.</p>
          </div>
          <button type="button" className="btn primary" style={{ marginTop: 16 }} disabled={!tot.r} onClick={logAll}><Icon n="plus" />Log today · +{pace} each</button>
        </section>
        <section className="card c5">
          <div className="card-h"><div><div className="k">Overall</div><h3>Progress</h3></div><span className="mono muted" style={{ fontSize: 11 }}>{tot.o ? ((made / tot.o) * 100).toFixed(2) : "0.00"}%</span></div>
          <div className="qz-dots" aria-label="Made up per prayer">{P.map(n => {
            const owed = owedOf(q, n), mk = owed - remOf(q, n);
            return <div key={n} className="row" style={{ gap: 10 }}><span style={{ width: 62, fontWeight: 600 }}>{n}</span><div className="bar" style={{ flex: 1 }}><i style={{ width: Math.max(0.6, owed ? (mk / owed) * 100 : 0) + "%" }} /></div><span className="mono muted" style={{ fontSize: 11, width: 46, textAlign: "right" }}>{mk}</span></div>;
          })}</div>
          <div className="divider" style={{ margin: "16px 0" }} />
          <Field label="Years missed" hint={years != null ? `= ${Math.floor(years * 365).toLocaleString()} per prayer · made counts are kept` : "Prayers have different years — typing here sets all five."}>
            <input className="input mono" type="number" min="0" max="9999" step="0.5" value={years ?? ""} placeholder="mixed" onChange={e => setYears(e.target.value)} />
          </Field>
        </section>
      </div>

      <div className="qz-grid">
        {P.map((n, i) => {
          const owed = owedOf(q, n), r = remOf(q, n);
          return (
            <section key={n} className="card qz-card">
              <div className="row sb"><span className="mono muted" style={{ fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span><span className="mono muted" style={{ fontSize: 11 }}>updated {q.at[n] ? ago(q.at[n], now.getTime()) : "never"}</span></div>
              <h3 className="disp" style={{ fontSize: 30, marginTop: 6 }}>{n}</h3>
              <div className="disp" style={{ fontSize: "clamp(44px,5vw,60px)", color: r ? "var(--accent)" : "var(--ok)", margin: "6px 0 2px" }}>{r.toLocaleString()}</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>remaining · <b style={{ color: "var(--fg)" }}>{owed - r}</b> made of {owed.toLocaleString()}</div>
              <div className="row">
                <button type="button" className="btn icon" aria-label={`One less ${n}`} disabled={r >= owed} onClick={() => adj(n, -1)}><Icon n="minus" /></button>
                <button type="button" className="btn" style={{ flex: 1 }} disabled={!r} onClick={() => adj(n, 1)}><Icon n="plus" />Made one</button>
                <button type="button" className="btn" disabled={!r} onClick={() => adj(n, 5)}>+5</button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

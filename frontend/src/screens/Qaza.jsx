import { useEffect, useState } from "react";
import { Empty, Field, Head, Icon, Meter, Skeleton, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import useLoad from "../lib/useLoad";
import useNow from "../lib/useNow";
import { ago } from "../lib/format";

const P = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];

/* API shape → editable state. owed = years × 365, remaining = owed + adjustment (made up = owed − remaining). */
const fromApi = d => ({
  years: Object.fromEntries(P.map(n => [n, parseFloat(d?.[n]) || 0])),
  adj: Object.fromEntries(P.map(n => [n, Number(d?.adjustments?.[n] || 0)])),
  at: Object.fromEntries(P.map(n => [n, d?.namaz_updated_at?.[n] || d?.updated_at || null])),
});
const owedOf = (q, n) => Math.floor(q.years[n] * 365);
const remOf = (q, n) => Math.max(0, owedOf(q, n) + q.adj[n]);

export default function Qaza() {
  const api = useApi();
  const { toast } = useUI();
  const now = useNow();
  const { data, setData, loading, error, reload } = useLoad(api, async a => fromApi(await a.get("/qaza-namaz")), "", null);
  const [q, setQ] = useState(null), [base, setBase] = useState(null), [pace, setPace] = useState(1), [busy, setBusy] = useState(false);
  if (data && data !== base) { setBase(data); setQ(data); }

  if (loading && !q) return <><Head n="03" eyebrow="Qaza Namaz" title={<>Loading <em>qaza</em>.</>} /><Skeleton tiles={[["s7", 280], ["s5", 280], ["s12", 260]]} /></>;
  if (error && !q) return <Empty title="Couldn't load" body={error} action={<button type="button" className="btn primary" onClick={reload}>Try again</button>} />;

  const dirty = JSON.stringify({ y: q.years, a: q.adj }) !== JSON.stringify({ y: base.years, a: base.adj });
  const tot = P.reduce((t, n) => ({ o: t.o + owedOf(q, n), r: t.r + remOf(q, n) }), { o: 0, r: 0 });
  const made = Math.max(0, tot.o - tot.r);
  const maxRem = Math.max(0, ...P.map(n => remOf(q, n)));
  const days = Math.ceil(maxRem / pace);
  const fin = new Date(now); fin.setDate(fin.getDate() + days);
  const ys = [...new Set(P.map(n => q.years[n]))];
  const years = ys.length === 1 ? ys[0] : null;

  const adj = (n, delta) => setQ(x => {
    const owed = owedOf(x, n), rem = remOf(x, n);
    const next = Math.max(0, Math.min(owed, rem - delta)); // +delta made up → remaining goes down
    return { ...x, adj: { ...x.adj, [n]: next - owed }, at: { ...x.at, [n]: new Date().toISOString() } };
  });
  const logAll = () => { P.forEach(n => adj(n, pace)); toast(`+${pace} logged for each — save to keep`); };
  const setYears = v => {
    const y = Math.max(0, Math.min(9999, parseFloat(v) || 0));
    setQ(x => ({ ...x, years: Object.fromEntries(P.map(n => [n, y])) })); // made-up counts (adjustments) are kept
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...Object.fromEntries(P.map(n => [n, q.years[n] ? String(q.years[n]) : ""])), adjustments: q.adj };
      await api.post("/qaza-namaz", body);
      const fresh = fromApi(await api.get("/qaza-namaz"));
      setData(fresh);
      toast("Qaza saved");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Head n="03" eyebrow={`Qaza Namaz · ${years != null ? years + " years" : "per prayer"}`} title={<><em>{tot.r.toLocaleString()}</em> left to make up.</>}
        sub={tot.o ? `${made.toLocaleString()} made up so far. Steady beats sudden — pick a pace you can keep.` : "Set how many years were missed to start counting."}>
        <button type="button" className="btn" disabled={!dirty || busy} onClick={() => setQ(base)}>Discard</button>
        <button type="button" className="btn primary" disabled={!dirty || busy} onClick={save}><Icon n="check" />{busy ? "Saving…" : "Save"}</button>
      </Head>

      <div className="bento" style={{ marginBottom: 14 }}>
        <section className="tile t-green s7"><div className="cap">Pace planner</div>
          <div className="row wrap" style={{ gap: 24, marginTop: 14, alignItems: "flex-end" }}>
            <div>
              <div className="big" style={{ fontSize: "clamp(72px,8vw,120px)" }}>{(days / 365).toFixed(days > 3650 ? 0 : 1)}<small>years</small></div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>{maxRem ? `≈ ${days.toLocaleString()} days · done by ${fin.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : "Nothing left — alhamdulillah."}</div>
            </div>
            <div className="grow" style={{ minWidth: 220 }}>
              <label className="cap" htmlFor="pace">Per prayer, per day: <b style={{ fontSize: 16 }}>{pace}</b></label>
              <input id="pace" type="range" min="1" max="10" value={pace} onChange={e => setPace(+e.target.value)} style={{ width: "100%", accentColor: "var(--green)", marginTop: 10, height: 28 }} />
              <div className="row sb mono" style={{ fontSize: 10.5, opacity: 0.7 }}><span>1</span><span>10</span></div>
            </div>
          </div>
          <button type="button" className="btn" style={{ marginTop: 18 }} disabled={!maxRem} onClick={logAll}><Icon n="plus" />Log today · +{pace} each</button>
        </section>

        <section className="tile s5">
          <div className="th"><div><div className="cap">Calculator</div><h3>Missed <em>period</em></h3></div></div>
          <Field label="Years missed" hint={years != null ? `= ${Math.floor(years * 365).toLocaleString()} per prayer. Made-up counts are kept.` : "Prayers have different years — typing here sets all five."}>
            <input className="input mono" type="number" min="0" max="9999" step=".5" value={years ?? ""} placeholder="mixed" onChange={e => setYears(e.target.value)} />
          </Field>
          <div className="row sb" style={{ marginTop: 18 }}><span className="cap">Overall</span><span className="mono" style={{ fontSize: 12 }}>{tot.o ? (made / tot.o * 100).toFixed(2) : "0.00"}%</span></div>
          <Meter v={tot.o ? Math.max(0.01, made / tot.o) : 0} color="var(--green)" style={{ marginTop: 8 }} />
        </section>
      </div>

      <Qibla />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
        {P.map(n => {
          const owed = owedOf(q, n), r = remOf(q, n), mk = owed - r;
          return (
            <section key={n} className="tile" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
              <span className="mono faint" style={{ fontSize: 10.5 }}>updated {q.at[n] ? ago(q.at[n], now.getTime()) : "—"}</span>
              <div style={{ width: 64, height: 180, borderRadius: 99, background: "var(--bg-2)", position: "relative", overflow: "hidden" }} role="img" aria-label={`${n}: ${mk} of ${owed} made up`}>
                <i style={{ position: "absolute", inset: "auto 0 0 0", height: Math.max(6, owed ? (mk / owed) * 100 : 0) + "%", background: "var(--green)", borderRadius: 99, transition: "height .6s" }} />
              </div>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>{n}</div>
              <div><div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--accent)" }}>{r.toLocaleString()}</div>
                <div className="faint" style={{ fontSize: 11.5 }}>{mk.toLocaleString()} made of {owed.toLocaleString()}</div></div>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn sm icon" aria-label={"One less " + n} disabled={!mk} onClick={() => adj(n, -1)}><Icon n="minus" s={14} /></button>
                <button type="button" className="btn sm primary" disabled={!r} onClick={() => adj(n, 1)} aria-label={`${n} plus 1`}>+1</button>
                <button type="button" className="btn sm" disabled={!r} onClick={() => adj(n, 5)} aria-label={`${n} plus 5`}>+5</button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/* Qibla: great-circle bearing + distance to the Kaaba; the dial turns with the device compass. */
function Qibla() {
  const [st, setSt] = useState("idle"), [pos, setPos] = useState({ lat: 31.5204, lon: 74.3587, label: "Lahore (default)" }), [head, setHead] = useState(0);
  const K = { lat: 21.4225, lon: 39.8262 }, r = x => x * Math.PI / 180, dg = x => x * 180 / Math.PI;
  const y = Math.sin(r(K.lon - pos.lon)) * Math.cos(r(K.lat));
  const x = Math.cos(r(pos.lat)) * Math.sin(r(K.lat)) - Math.sin(r(pos.lat)) * Math.cos(r(K.lat)) * Math.cos(r(K.lon - pos.lon));
  const brg = (dg(Math.atan2(y, x)) + 360) % 360;
  const dist = 6371 * 2 * Math.asin(Math.sqrt(Math.sin(r(K.lat - pos.lat) / 2) ** 2 + Math.cos(r(pos.lat)) * Math.cos(r(K.lat)) * Math.sin(r(K.lon - pos.lon) / 2) ** 2));
  const card = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(brg / 45) % 8];

  useEffect(() => {
    const h = e => {
      if (e.webkitCompassHeading != null) setHead(e.webkitCompassHeading);
      else if (e.alpha != null) setHead(360 - e.alpha);
    };
    window.addEventListener("deviceorientation", h);
    return () => window.removeEventListener("deviceorientation", h);
  }, []);

  const locate = async () => {
    // iOS needs an explicit permission prompt for the compass, from a tap
    try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch { /* compass optional */ }
    if (!navigator.geolocation) return setSt("none");
    setSt("busy");
    navigator.geolocation.getCurrentPosition(
      p => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location" }); setSt("ok"); },
      () => setSt("denied"), { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <section className="tile" style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 28, alignItems: "center" }}>
      <div style={{ width: 200, height: 200, position: "relative", flexShrink: 0 }} role="img" aria-label={`Qibla ${Math.round(brg)} degrees ${card}`}>
        <svg viewBox="0 0 200 200" width="200" height="200" style={{ transform: `rotate(${-head}deg)`, transition: "transform .3s" }}>
          <circle cx="100" cy="100" r="94" fill="none" stroke="var(--line-2)" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="74" fill="none" stroke="var(--line)" strokeDasharray="2 6" />
          {Array.from({ length: 72 }, (_, i) => <line key={i} x1="100" y1="8" x2="100" y2={i % 9 === 0 ? 20 : 13} stroke={i % 18 === 0 ? "var(--fg)" : "var(--fg-4)"} strokeWidth={i % 18 === 0 ? 2 : 1} transform={`rotate(${i * 5} 100 100)`} />)}
          {["N", "E", "S", "W"].map((l, i) => <text key={l} x="100" y="38" textAnchor="middle" fontFamily="Geist Mono" fontSize="12" fontWeight="600" fill={l === "N" ? "var(--red)" : "var(--fg-3)"} transform={`rotate(${i * 90} 100 100)`}>{l}</text>)}
          <g transform={`rotate(${brg} 100 100)`} style={{ transition: "transform .6s cubic-bezier(.3,1.2,.4,1)" }}>
            <path d="M100 26 L109 100 L100 92 L91 100 Z" fill="var(--red)" /><path d="M100 174 L109 100 L100 108 L91 100 Z" fill="var(--fg-4)" />
            <rect x="93" y="16" width="14" height="14" rx="2" fill="var(--fg)" />
          </g>
          <circle cx="100" cy="100" r="6" fill="var(--bg-1)" stroke="var(--fg)" strokeWidth="2" />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="cap">Qibla direction</div>
        <div className="big" style={{ fontSize: "clamp(64px,7vw,104px)", margin: "8px 0" }}>{Math.round(brg)}°<small>{card}</small></div>
        <div className="mono muted" style={{ fontSize: 12 }}>{pos.label} · {pos.lat.toFixed(3)}, {pos.lon.toFixed(3)} · {Math.round(dist).toLocaleString()} km to the Kaaba</div>
        {st === "denied" && <p role="alert" style={{ color: "var(--err)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>Location blocked — allow it in your browser settings, or use the default city.</p>}
        {st === "none" && <p role="alert" style={{ color: "var(--err)", fontSize: 13, marginTop: 10 }}>This browser can't share location.</p>}
        <div className="row wrap" style={{ marginTop: 14 }}>
          <button type="button" className="btn primary" disabled={st === "busy"} onClick={locate}><Icon n="compass" s={15} />{st === "busy" ? "Locating…" : st === "ok" ? "Update location" : "Use my location"}</button>
          <span className="hint">On a phone, the dial turns with your compass.</span>
        </div>
      </div>
    </section>
  );
}

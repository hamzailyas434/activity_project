/* Rhythm v3 primitives — markup mirrors ui_kits/v3/kit.jsx + ui_kits/v2/core.jsx so classes port 1:1. */
import Icon from "./Icon";
import { AV, pwScore } from "./helpers";


/* Page heading: numbered eyebrow, Anton title (<em> shows red), sub-text, actions. `title` may contain <em>. */
export function Head({ n, eyebrow, title, sub, children }) {
  return (
    <header className="hd">
      <div>
        <div className="eyebrow"><b>{n}</b>{eyebrow}</div>
        <h1 className="ut">{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="hd-a">{children}</div>
    </header>
  );
}

export function Button({ variant = "", size = "", icon, children, className = "", type = "button", ...rest }) {
  const cls = ["btn", variant, size, !children && icon ? "icon" : "", className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest}>{icon && <Icon n={icon} s={size === "sm" ? 14 : 16} />}{children}</button>;
}

export function Tile({ as, tone, span, ink, flush, sunk, className = "", children, ...rest }) {
  const Tag = as || "section";
  const cls = ["tile", tone && "t-" + tone, span && "s" + span, ink && "ink", flush && "flush", sunk && "sunk", className].filter(Boolean).join(" ");
  return <Tag className={cls} {...rest}>{children}</Tag>;
}

/* Tile heading: cap + Anton h3 + right slot */
export function TileHead({ cap, title, children }) {
  return (
    <div className="th">
      <div>{cap && <div className="cap">{cap}</div>}{title && <h3>{title}</h3>}</div>
      {children}
    </div>
  );
}

export function Ring({ v, size = 120, w = 12, color = "var(--red)", track = "var(--bg-2)", children }) {
  const r = (size - w) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={w} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(0, Math.min(1, v || 0)))} style={{ transition: "stroke-dashoffset .6s cubic-bezier(.3,1.2,.4,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      style={{ width: 46, height: 26, borderRadius: 99, border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, background: on ? "var(--green)" : "var(--bg-3)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
      <i style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .25s cubic-bezier(.3,1.2,.4,1)", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

/* Segmented control. options: [[value, label], …] */
export function Seg({ value, onChange, options, label, style, className = "" }) {
  return (
    <div className={"seg " + className} role="group" aria-label={label} style={style}>
      {options.map(([k, l]) => (
        <button type="button" key={k} className={value === k ? "on" : ""} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

export function Chip({ on, count, children, className = "", ...rest }) {
  return (
    <button type="button" className={"chip" + (on ? " on" : "") + (className ? " " + className : "")} aria-pressed={on === undefined ? undefined : !!on} {...rest}>
      {children}{count != null && <span className="c">{count}</span>}
    </button>
  );
}

export function Pill({ tone = "", children, style, title }) {
  return <span className={"pill " + tone} style={style} title={title}>{children}</span>;
}

export function Meter({ v, color, style }) {
  return <div className="meter" style={style}><i style={{ width: Math.max(0, Math.min(100, (v || 0) * 100)) + "%", background: color }} /></div>;
}

export function Field({ label, req, hint, err, children, style }) {
  return (
    <label className="field" style={style}>
      <span className="label">{label}{req && <span className="req">*</span>}</span>
      {children}
      {err ? <span className="err-text" role="alert">{err}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Empty({ title, body, action }) {
  return <div className="empty"><h4>{title}</h4>{body && <p>{body}</p>}{action}</div>;
}

export function Avatar({ name, c = 0, s = 36, src }) {
  if (src) return <img src={src} alt="" className="av" style={{ width: s, height: s, objectFit: "cover" }} />;
  return <span className="av" style={{ width: s, height: s, fontSize: s * 0.44, background: AV[c % AV.length] }}>{(String(name || "?").trim()[0] || "?").toUpperCase()}</span>;
}

/* Loading: a bento of skeleton tiles */
export function Skeleton({ tiles = [["s4", 300], ["s5", 300], ["s3", 300]] }) {
  return (
    <div className="bento" aria-busy="true" aria-label="Loading">
      {tiles.map(([s, h], i) => <div key={i} className={"skel " + s} style={{ height: h }} />)}
    </div>
  );
}

export function Search({ value, onChange, placeholder = "Search…", style, label = "Search", inputRef }) {
  return (
    <div className="search" style={style}>
      <Icon n="search" s={16} />
      <input ref={inputRef} className="input" dir="auto" type="search" aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

/* 4-bar strength meter */
export function PwStrength({ value }) {
  const n = pwScore(value), col = ["var(--bg-3)", "var(--red)", "var(--gold)", "var(--blue)", "var(--green)"][n];
  return (
    <div className="row" style={{ gap: 6 }} aria-label={`Password strength ${n} of 4`}>
      {[1, 2, 3, 4].map(i => <i key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i <= n ? col : "var(--bg-3)", transition: "background .2s" }} />)}
      <span className="mono faint" style={{ fontSize: 10.5, minWidth: 44, textAlign: "right" }}>{["", "weak", "fair", "good", "strong"][n]}</span>
    </div>
  );
}

export { Icon };

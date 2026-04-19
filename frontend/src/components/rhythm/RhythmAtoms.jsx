/** Presentational primitives from Rhythm UI kit (Atoms.jsx). */

export function Card({ children, className = "", ...p }) {
  return (
    <div className={`card ${className}`.trim()} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({ eyebrow, title, right }) {
  return (
    <div className="card-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h3 className="card-title">{title}</h3>
      </div>
      {right}
    </div>
  );
}

export function Ring({ pct, color, size = 72, label, sub }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 320ms var(--ease)",
          }}
        />
      </svg>
      <div className="ring-label">
        <div className="ring-pct">{label ?? `${pct}%`}</div>
        {sub && <div className="ring-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function StreakPill({ n }) {
  return (
    <span className="streak-pill">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
        <path d="M12 2C9 6 6 8 6 13a6 6 0 0 0 12 0c0-3-2-5-3-7-1 2-2 3-3 3z" />
      </svg>
      {n}
    </span>
  );
}

export function RhythmCheck({ done, onClick, color = "var(--sage-500)", type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={`rhythm-check${done ? " done" : ""}`}
      onClick={onClick}
      style={done ? { background: color, borderColor: color } : undefined}
      {...rest}
    >
      {done && (
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

const ICON_PATHS = {
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  chevron: (
    <>
      <path d="M9 18l6-6-6-6" />
    </>
  ),
  chevronL: (
    <>
      <path d="M15 18l-6-6 6-6" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18M6 6l12 12" />
    </>
  ),
  export: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  moon: (
    <>
      <path d="M20 12a8 8 0 0 1-14 5.5 8 8 0 0 0 14-5.5z" />
    </>
  ),
};

export function Icon({ name, size = 16 }) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}

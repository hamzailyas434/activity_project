import { useId } from "react";

/** 7-day rolling trend sparkline — from Activity Tracker Design System ActivitiesMatrix.jsx */
export default function TrendSpark({ trend, daysInMonth, tone = "faithful" }) {
  const w = 1000;
  const h = 140;
  const pad = 14;
  const uid = useId().replace(/\W/g, "");

  const pts = trend
    .map((v, i) => {
      if (v == null) return null;
      return [(i / Math.max(1, daysInMonth - 1)) * w, h - pad - v * (h - pad * 2)];
    })
    .filter(Boolean);

  const smooth = p => {
    if (p.length < 2) return "";
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] || p2;
      const t = 0.22;
      const c1x = p1[0] + (p2[0] - p0[0]) * t;
      const c1y = p1[1] + (p2[1] - p0[1]) * t;
      const c2x = p2[0] - (p3[0] - p1[0]) * t;
      const c2y = p2[1] - (p3[1] - p1[1]) * t;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  const d = smooth(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area =
    d && last && first
      ? `${d} L${last[0].toFixed(1)},${h} L${first[0].toFixed(1)},${h} Z`
      : "";

  const c1 = tone === "dots" ? "#5B9487" : "#6B9D8E";
  const c2 = tone === "dots" ? "#7E6AB8" : "#A08FCD";

  const avg = pts.length ? pts.reduce((a, b) => a + b[1], 0) / pts.length : 0;

  if (!d || !last) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-trend-svg" preserveAspectRatio="none" aria-hidden />
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-trend-svg" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c2} stopOpacity="0.32" />
          <stop offset="60%" stopColor={c1} stopOpacity="0.14" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[0.25, 0.5, 0.75].map(y => (
        <line
          key={y}
          x1="0"
          x2={w}
          y1={h - pad - y * (h - pad * 2)}
          y2={h - pad - y * (h - pad * 2)}
          stroke="var(--border-faint)"
          strokeDasharray="1 6"
        />
      ))}

      <line
        x1="0"
        x2={w}
        y1={avg}
        y2={avg}
        stroke={c1}
        strokeOpacity="0.28"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      <path d={area} fill={`url(#area-${uid})`} />

      <path
        d={d}
        fill="none"
        stroke={c1}
        strokeOpacity="0.18"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d={d}
        fill="none"
        stroke={`url(#stroke-${uid})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${uid})`}
      />

      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === pts.length - 1 ? 0 : 1.8}
          fill={c2}
          opacity={i === pts.length - 1 ? 0 : 0.55}
        />
      ))}

      <circle cx={last[0]} cy={last[1]} r="10" fill={c2} opacity="0.14">
        <animate attributeName="r" values="7;12;7" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.24;0.05;0.24" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={last[0]} cy={last[1]} r="4.5" fill={c2} stroke="var(--bg-raised)" strokeWidth="2" />
    </svg>
  );
}

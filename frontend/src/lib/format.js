/* Date + money helpers. Dates are local (Pakistan is UTC+5 — toISOString() would flip the day before 5am). */
export const pad = n => String(n).padStart(2, "0");
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const daysIn = (y, m) => new Date(y, m, 0).getDate();
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MON = MONTHS.map(m => m.slice(0, 3));
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* "2026-10-24" or a Date → local Date (avoids the UTC shift of new Date("2026-10-24")) */
export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.000)?Z?$)/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
export const fmtDate = v => { const d = toDate(v); return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; };
export const fmtShort = v => { const d = toDate(v); return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"; };
export const fmtDateTime = v => { const d = toDate(v); return d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; };

export function ago(v, now = Date.now()) {
  const d = toDate(v); if (!d) return "—";
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  const n = Math.round(s / 86400);
  return n < 31 ? n + "d ago" : n < 365 ? Math.round(n / 30) + "mo ago" : Math.round(n / 365) + "y ago";
}

export const greeting = (h = new Date().getHours()) => (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

/* "Hamza Ilyas" from first/last name, else name, else username */
export function displayName(u) {
  if (!u) return "";
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return full || u.name || u.username || "";
}

/* strip HTML for previews / search */
export const plain = html => String(html || "").replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|li|h\d)>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

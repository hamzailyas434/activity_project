import { useEffect, useState } from "react";

/* Path router: /notes/123 → { route: "notes", sub: "123" }. Existing activeTab ids are kept as routes.
   Old #/notes/123 links (v3 before clean URLs) are rewritten to /notes/123 on load.
   Production hosting must serve index.html for unknown paths (see public/.htaccess). */
const EV = "rhythm:route";
if (typeof location !== "undefined" && location.hash.startsWith("#/")) history.replaceState(null, "", location.hash.slice(1));

const read = () => {
  const [route = "", ...rest] = location.pathname.replace(/^\/+/, "").split("/");
  return { route: route || "dashboard", sub: rest.join("/") };
};

export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => {
    const h = () => setR(read());
    window.addEventListener("popstate", h);
    window.addEventListener(EV, h);
    return () => { window.removeEventListener("popstate", h); window.removeEventListener(EV, h); };
  }, []);
  return r;
}

export function go(path) {
  const next = "/" + path;
  if (location.pathname === next) return;
  history.pushState(null, "", next);
  window.dispatchEvent(new Event(EV));
  if (!path.includes("/")) window.scrollTo(0, 0);
}

/* Drop a consumed sub-route (e.g. /notes/new once the modal is open) without adding history. */
export function clearSub(route) {
  if (read().sub) {
    history.replaceState(null, "", "/" + route);
    window.dispatchEvent(new Event(EV));
  }
}

export const NAV = [
  { id: "dashboard", label: "Today", icon: "dash" },
  { id: "activities", label: "Activities", icon: "grid" },
  { id: "qaza-namaz", label: "Qaza Namaz", icon: "moonS" },
  { id: "notes", label: "Notes", icon: "notes" },
  { id: "expenses", label: "Expenses", icon: "wallet" },
  { id: "favourites", label: "Favourites", icon: "star" },
  { id: "books", label: "Books", icon: "book" },
];
export const DOCK = [...NAV, { id: "profile", label: "Profile", icon: "user" }, { id: "admin", label: "Admin", icon: "shield" }];

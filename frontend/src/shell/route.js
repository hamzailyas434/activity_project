import { useEffect, useState } from "react";

/* Hash router: #/notes/123 → { route: "notes", sub: "123" }. Existing activeTab ids are kept as routes. */
const read = () => {
  const [route = "", ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  return { route: route || "dashboard", sub: rest.join("/") };
};

export function useRoute() {
  const [r, setR] = useState(read);
  useEffect(() => {
    const h = () => setR(read());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return r;
}

export function go(path) {
  const next = "#/" + path;
  if (location.hash === next) return;
  location.hash = "/" + path;
  if (!path.includes("/")) window.scrollTo(0, 0);
}

/* Drop a consumed sub-route (e.g. #/notes/new once the modal is open) without adding history. */
export function clearSub(route) {
  if (read().sub) {
    history.replaceState(null, "", "#/" + route);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
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

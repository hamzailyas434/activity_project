import { useState } from "react";
import { useApi } from "./api";
import useLoad from "./useLoad";
import useNow from "./useNow";
import { isoDate } from "./format";

/* People list + sub-routes (new · id · id/edit), shared by both designs */
export function usePeople(sub) {
  const api = useApi();
  const now = useNow();
  const today = isoDate(now);
  const [q, setQ] = useState("");
  const people = useLoad(api, async a => {
    const list = await a.get("/favourite-profiles");
    const ps = Array.isArray(list) ? list : [];
    // gifts per person, for the upcoming-gift pill on each card
    const recs = await Promise.all(ps.map(p => a.get(`/favourite-profiles/${p.id}/records`).catch(() => [])));
    return ps.map((p, i) => ({ ...p, gifts: Array.isArray(recs[i]) ? recs[i] : [] }));
  }, "", []);
  const all = Array.isArray(people.data) ? people.data : [];
  const list = all.filter(p => !q || `${p.name} ${p.relation || p.category || ""}`.toLowerCase().includes(q.toLowerCase()));

  const [sid, mode] = sub.split("/");
  const openId = /^\d+$/.test(sid) ? +sid : null;
  const editing = sid === "new" ? "new" : openId && mode === "edit" ? openId : null;

  return { now, today, q, setQ, people, all, list, openId, editing };
}

/* Every preference category the user has used, for the category chips (presets + custom) */
export function usePrefCats() {
  const api = useApi();
  const r = useLoad(api, a => a.get("/favourite-profiles/pref-categories"), "", []);
  return { list: Array.isArray(r.data) ? r.data : [], reload: r.reload };
}

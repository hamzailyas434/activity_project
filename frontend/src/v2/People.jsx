import { Avatar, Empty, Icon, Modal, Skeleton, TONES } from "../components/ui";
import { toDate } from "../lib/format";
import { usePeople } from "../lib/people";
import { PersonForm, PersonSheet } from "../screens/People";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 06 Favourites — person cards (avatar, relation, prefs / gifts, birthday soon), sheet + form shared with v3 */
const OLD = { dusk: "red", ochre: "gold", teal: "green", mineral: "blue", iris: "violet", fog: "violet" };
const toneIdx = (c, i) => Math.max(0, TONES.indexOf(TONES.includes(c) ? c : OLD[c] || TONES[i % 5]));
const daysToBday = (b, now) => {
  const d = toDate(b);
  if (!d) return null;
  const n = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (n < new Date(now.getFullYear(), now.getMonth(), now.getDate())) n.setFullYear(n.getFullYear() + 1);
  return Math.round((n - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
};

export default function People({ sub }) {
  const { today, q, setQ, people, all, list, openId, editing } = usePeople(sub);
  const now = toDate(today) || new Date();
  return (
    <>
      <PageHead idx="06" meta={`${all.length} ${all.length === 1 ? "person" : "people"}`} title={<>People <em>who matter</em></>} sub="What they like, what you gave, and when to remember them.">
        <div className="search" style={{ width: 240 }}><Icon n="search" s={14} /><input className="input" aria-label="Search people" placeholder="Search name or relation" value={q} onChange={e => setQ(e.target.value)} /></div>
        <button type="button" className="btn primary" onClick={() => go("favourites/new")}><Icon n="plus" />Person</button>
      </PageHead>

      {people.loading && !all.length ? <Skeleton tiles={[["s4", 220], ["s4", 220], ["s4", 220]]} />
        : !list.length ? <Empty title="No one here" body={q ? `No match for “${q}”.` : "Add someone you want to remember things about."} action={!q && <button type="button" className="btn primary" onClick={() => go("favourites/new")}>Add person</button>} />
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>{list.map((p, i) => {
              const nb = daysToBday(p.bday, now), rel = p.relation || p.category || "—";
              return (
                <article key={p.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <button type="button" onClick={() => go("favourites/" + p.id)} style={{ textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: 20, flex: 1, color: "inherit" }}>
                    <div className="row sb"><Avatar name={p.name} c={toneIdx(p.color, i)} s={52} />{nb != null && nb < 45 && <span className="badge red"><Icon n="cal" s={11} />{nb ? `${nb}d` : "Today"}</span>}</div>
                    <h3 className="disp ut" dir="auto" style={{ fontSize: 38, marginTop: 16 }}>{p.name}</h3>
                    <div className="label" style={{ marginTop: 6 }}>{rel}</div>
                    <div className="row mono muted" style={{ fontSize: 11.5, marginTop: 16, gap: 14 }}><span>{Number(p.prefs_count || 0)} prefs</span><span>{p.gifts?.length || 0} gifts</span></div>
                  </button>
                  <div className="row" style={{ borderTop: "1px solid var(--line)", padding: 8 }}>
                    <button type="button" className="btn sm ghost" style={{ flex: 1 }} onClick={() => go("favourites/" + p.id)}>Open</button>
                    <button type="button" className="btn sm ghost" style={{ flex: 1 }} onClick={() => go(`favourites/${p.id}/edit`)}><Icon n="edit" s={13} />Edit</button>
                  </div>
                </article>
              );
            })}</div>
          )}

      {openId && !editing && <PersonSheet p={all.find(x => x.id === openId)} loading={people.loading} today={today} onChanged={people.reload} />}
      {editing && editing !== "new" && !all.find(x => x.id === editing) && (
        <Modal size="lg" kicker="Favourites" title={people.loading ? "Loading…" : "Not found"} onClose={() => go("favourites")}>
          {people.loading ? <div className="skel" style={{ height: 240 }} /> : <Empty title="Person not found" body="They may have been removed." />}
        </Modal>
      )}
      {editing && (editing === "new" || all.find(x => x.id === editing)) && <PersonForm key={editing} person={editing === "new" ? null : all.find(x => x.id === editing)}
        onClose={() => go(editing === "new" ? "favourites" : "favourites/" + editing)} onSaved={async id => { await people.reload(); go("favourites/" + id); }} />}
    </>
  );
}

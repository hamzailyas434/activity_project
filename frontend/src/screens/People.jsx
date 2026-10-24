import { useState } from "react";
import { Avatar, Drawer, Empty, Field, Head, Icon, Modal, Search, Seg, Skeleton, TONES, TONE_HEX, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import useLoad from "../lib/useLoad";
import useNow from "../lib/useNow";
import { fmtDate, isoDate, toDate } from "../lib/format";
import { useCurrency } from "../hooks/useCurrency";
import { go } from "../shell/route";

const RELS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Colleague", "Other"];
const PREF_K = ["Shoes", "Perfume", "Books", "Jewellery", "Clothes", "Gadgets"];
// v1 stored palette names; map them onto the v3 tones
const OLD = { dusk: "red", ochre: "gold", teal: "green", mineral: "blue", iris: "violet", fog: "violet" };
const toneOf = (c, i = 0) => (TONES.includes(c) ? c : OLD[c] || TONES[i % 5]);
const dstr = v => { const d = toDate(v); return d ? isoDate(d) : ""; };
/* Planned when dated in the future, or a 0-amount "dena hai" (to give) entry; otherwise Given */
const isPlanned = (g, today) => { const d = dstr(g.gift_date); return (d && d > today) || (!Number(g.amount) && /dena hai/i.test(`${g.gift_item} ${g.note || ""}`)); };

export default function People({ sub }) {
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

  return (
    <>
      <Head n="06" eyebrow={`${all.length} ${all.length === 1 ? "person" : "people"}`} title={<>The people who <em>matter</em>.</>} sub="Sizes, wishes and the gifts you gave — so you never have to guess.">
        <Search value={q} onChange={setQ} label="Search people" placeholder="Search" style={{ width: 240 }} />
        <button type="button" className="btn primary" onClick={() => go("favourites/new")}><Icon n="plus" />Person</button>
      </Head>

      {people.loading && !all.length ? <Skeleton tiles={[["s3", 250], ["s3", 250], ["s3", 250], ["s3", 250]]} />
        : people.error && !all.length ? <Empty title="Couldn't load" body={people.error} action={<button type="button" className="btn primary" onClick={people.reload}>Try again</button>} />
        : !list.length ? <Empty title="No one here" body={q ? `No match for “${q}”.` : "Add someone you care about."} action={!q && <button type="button" className="btn primary" onClick={() => go("favourites/new")}>Add person</button>} />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(230px,100%),1fr))", gap: 14 }}>
            {list.map((p, i) => {
              const tone = toneOf(p.color, i);
              const up = p.gifts.filter(g => isPlanned(g, today)).sort((a, b) => dstr(a.gift_date).localeCompare(dstr(b.gift_date)))[0];
              return (
                <button type="button" key={p.id} onClick={() => go("favourites/" + p.id)} className={"tile t-" + tone}
                  style={{ cursor: "pointer", textAlign: "left", minHeight: 250, display: "flex", flexDirection: "column" }}>
                  <div className="serif" style={{ fontSize: 110, lineHeight: 0.8, color: tone === "red" ? "#fff" : TONE_HEX[tone] }}>{(String(p.name).trim()[0] || "?").toUpperCase()}</div>
                  <div style={{ marginTop: "auto", minWidth: 0 }}>
                    <div className="serif ut" dir="auto" style={{ fontSize: 34, lineHeight: 1 }}>{p.name}</div>
                    <div className="cap" style={{ marginTop: 6 }}>{p.relation || p.category || "—"}</div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                      <span className="pill" style={{ background: "rgba(0,0,0,.14)" }}>{Number(p.prefs_count || 0)} prefs</span>
                      <span className="pill" style={{ background: "rgba(0,0,0,.14)" }}>{p.gifts.length} gifts</span>
                      {up && <span className="pill" style={{ background: "rgba(255,255,255,.55)", color: "#111" }}><Icon n="gift" s={11} />{dstr(up.gift_date) ? fmtDate(up.gift_date) : "planned"}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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

function PersonSheet({ p, loading, today, onChanged }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const { format: money } = useCurrency();
  const id = p?.id;
  const prefs = useLoad(api, a => (id ? a.get(`/favourite-profiles/${id}/categories`) : []), String(id), []);
  const gifts = useLoad(api, a => (id ? a.get(`/favourite-profiles/${id}/records`) : []), String(id), []);
  const [tab, setTab] = useState("prefs"), [k, setK] = useState(""), [v, setV] = useState(""), [g, setG] = useState({ n: "", d: today, a: "" }), [busy, setBusy] = useState(false);
  const close = () => go("favourites");
  if (!p) return <Drawer title={loading ? "Loading…" : "Not found"} onClose={close}>{!loading && <Empty title="Person not found" body="They may have been removed." />}</Drawer>;

  const pl = Array.isArray(prefs.data) ? prefs.data : [], gl = Array.isArray(gifts.data) ? gifts.data : [];
  const grouped = Object.entries(pl.reduce((m, x) => { const c = String(x.category || "Other").trim() || "Other"; (m[c] = m[c] || []).push(x); return m; }, {}));
  const tone = toneOf(p.color);

  const addPref = async () => {
    if (!k.trim() || busy) return;
    setBusy(true);
    try { const r = await api.post(`/favourite-profiles/${id}/categories`, { category: k.trim(), notes: v.trim(), sort_order: pl.length }); prefs.setData(l => [...l, r]); setV(""); onChanged(); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };
  const delPref = async x => {
    if (!(await ask({ title: "Remove preference?", body: `${x.category}${x.notes ? " · " + x.notes : ""}`, ok: "Remove", danger: true }))) return;
    try { await api.del(`/favourite-profiles/categories/${x.id}`); prefs.setData(l => l.filter(y => y.id !== x.id)); onChanged(); }
    catch (e) { toast(e.message, "err"); }
  };
  const logGift = async () => {
    if (!g.n.trim() || busy) return;
    setBusy(true);
    try {
      await api.post(`/favourite-profiles/${id}/records`, { gift_item: g.n.trim(), gift_date: g.d || null, amount: +g.a || 0, note: "" });
      await gifts.reload(); onChanged(); setG({ n: "", d: today, a: "" }); toast("Gift logged");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };
  const delGift = async x => {
    if (!(await ask({ title: "Delete gift?", body: x.gift_item, ok: "Delete", danger: true }))) return;
    try { await api.del(`/favourite-profiles/records/${x.id}`); gifts.setData(l => l.filter(y => y.id !== x.id)); onChanged(); }
    catch (e) { toast(e.message, "err"); }
  };
  const remove = async () => {
    if (!(await ask({ title: `Remove ${p.name}?`, body: "Preferences and gift history will be deleted.", ok: "Remove", danger: true }))) return;
    try { await api.del(`/favourite-profiles/${id}`); toast("Removed"); onChanged(); close(); }
    catch (e) { toast(e.message, "err"); }
  };

  return (
    <Drawer kicker={p.relation || p.category || "Favourite"} title={p.name} onClose={close} lead={<Avatar name={p.name} c={TONES.indexOf(tone)} s={48} />}
      foot={<><button type="button" className="btn danger" style={{ marginRight: "auto" }} onClick={remove}>Remove</button>
        <button type="button" className="btn primary" onClick={() => go(`favourites/${id}/edit`)}><Icon n="edit" s={14} />Edit</button></>}>
      <Seg value={tab} onChange={setTab} label="Section" options={[["prefs", "Preferences"], ["gifts", "Gifts"], ["info", "Details"]]} />

      {tab === "prefs" && <>
        {prefs.loading && !pl.length ? <div className="skel" style={{ height: 120 }} /> : !grouped.length ? <Empty title="No preferences" body="Sizes, brands, wishes…" />
          : grouped.map(([cat, items]) => (
            <div key={cat} className="tile sunk" style={{ padding: 16 }}>
              <b className="serif ut" dir="auto" style={{ fontSize: 22 }}>{cat}</b>
              <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>{items.map(x => (
                <span key={x.id} className="chip" style={{ boxShadow: "none" }}><span dir="auto" className="ut">{x.notes || "—"}</span>
                  <button type="button" aria-label={`Remove ${cat} ${x.notes || ""}`} onClick={() => delPref(x)} style={{ border: "none", background: "none", cursor: "pointer", display: "grid", color: "inherit" }}><Icon n="x" s={12} /></button></span>
              ))}</div>
            </div>
          ))}
        <div className="row wrap" style={{ alignItems: "flex-end" }}>
          <Field label="Category" style={{ flex: "1 1 140px" }}><input className="input" dir="auto" value={k} list="pref-k" onChange={e => setK(e.target.value)} placeholder="Shoes" /></Field>
          <datalist id="pref-k">{[...new Set([...PREF_K, ...pl.map(x => x.category)])].map(x => <option key={x} value={x} />)}</datalist>
          <Field label="Detail" style={{ flex: "2 1 180px" }}><input className="input" dir="auto" value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && addPref()} placeholder="39.7 EU" /></Field>
          <button type="button" className="btn primary" disabled={!k.trim() || busy} onClick={addPref}>Add</button>
        </div>
      </>}

      {tab === "gifts" && <>
        {gifts.loading && !gl.length ? <div className="skel" style={{ height: 120 }} /> : !gl.length ? <Empty title="No gifts yet" body="Log gifts to avoid repeats and plan ahead." />
          : [...gl].sort((a, b) => dstr(b.gift_date).localeCompare(dstr(a.gift_date))).map(x => {
            const planned = isPlanned(x, today);
            return (
              <div key={x.id} className="list-row">
                <span style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", flexShrink: 0, background: planned ? "color-mix(in oklab,var(--gold) 30%,transparent)" : "var(--bg-2)" }}><Icon n="gift" s={17} /></span>
                <div className="grow"><b dir="auto" className="ut">{x.gift_item}</b><div className="faint mono" style={{ fontSize: 11.5 }}>{x.gift_date ? fmtDate(x.gift_date) : "No date"}{x.note ? " · " + x.note : ""}</div></div>
                <span className={"pill " + (planned ? "warn" : "ok")}>{planned ? "Planned" : "Given"}</span>
                <b className="mono" style={{ whiteSpace: "nowrap" }}>{Number(x.amount) ? money(Number(x.amount)) : "—"}</b>
                <button type="button" className="btn ghost sm icon" aria-label={"Delete " + x.gift_item} onClick={() => delGift(x)}><Icon n="trash" s={13} /></button>
              </div>
            );
          })}
        <div className="tile sunk" style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, alignItems: "end" }}>
          <Field label="Gift"><input className="input" dir="auto" value={g.n} onChange={e => setG({ ...g, n: e.target.value })} style={{ background: "var(--bg-1)" }} /></Field>
          <Field label="Date"><input className="input mono" type="date" value={g.d} onChange={e => setG({ ...g, d: e.target.value })} style={{ background: "var(--bg-1)" }} /></Field>
          <Field label="Amount"><input className="input mono" type="number" min="0" value={g.a} onChange={e => setG({ ...g, a: e.target.value })} style={{ background: "var(--bg-1)" }} /></Field>
          <button type="button" className="btn primary" disabled={!g.n.trim() || busy} onClick={logGift}>{g.d > today ? "Plan" : "Log"}</button>
        </div>
      </>}

      {tab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          {[["Relation", p.relation || p.category], ["Birthday", p.bday && fmtDate(p.bday)], ["Phone", p.phone], ["Shoe size", p.shoe_number], ["Dress colour", p.dress_color]].map(([a, b]) => (
            <div key={a} className="tile sunk" style={{ padding: 14 }}><div className="cap">{a}</div><div dir="auto" className="ut" style={{ fontWeight: 700, marginTop: 4, color: b ? "var(--fg)" : "var(--fg-4)" }}>{b || "Not set"}</div></div>
          ))}
          <div className="tile sunk" style={{ padding: 14, gridColumn: "1/-1" }}><div className="cap">Private notes</div>
            <p dir="auto" className="ut" style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap", color: p.notes ? "var(--fg)" : "var(--fg-4)" }}>{p.notes || "No notes yet."}</p></div>
        </div>
      )}
    </Drawer>
  );
}

function PersonForm({ person, onClose, onSaved }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const editing = !!person;
  const existing = useLoad(api, a => (person ? a.get(`/favourite-profiles/${person.id}/categories`) : []), String(person?.id || 0), []);
  const mk = p => ({
    name: p?.name || "", rel: p?.relation || p?.category || "", tone: toneOf(p?.color, 0), bday: dstr(p?.bday), phone: p?.phone || "",
    shoe: p?.shoe_number || "", dress: p?.dress_color || "", notes: p?.notes || "",
  });
  const [init] = useState(() => mk(person));
  const [f, setF] = useState(init);
  const [adds, setAdds] = useState([]), [dels, setDels] = useState([]), [t, setT] = useState(false), [pk, setPk] = useState(""), [pv, setPv] = useState(""), [busy, setBusy] = useState(false);

  const oldPrefs = (Array.isArray(existing.data) ? existing.data : []).filter(x => !dels.includes(x.id));
  const prefCount = oldPrefs.length + adds.length;
  const err = t && !f.name.trim();
  const dirty = JSON.stringify(f) !== JSON.stringify(init) || adds.length > 0 || dels.length > 0;
  const close = async () => { if (!dirty || await ask({ title: editing ? "Discard changes?" : "Discard this person?", body: "What you typed will be lost.", ok: "Discard", danger: true })) onClose(); };
  const addPref = () => { if (!pk.trim()) return; setAdds(a => [...a, { k: pk.trim(), v: pv.trim() }]); setPk(""); setPv(""); };
  const save = async () => {
    setT(true);
    if (!f.name.trim() || busy) return;
    setBusy(true);
    try {
      const body = { name: f.name.trim(), relation: f.rel, color: f.tone, bday: f.bday || null, phone: f.phone, notes: f.notes, shoe_number: f.shoe, dress_color: f.dress };
      const r = editing ? await api.put(`/favourite-profiles/${person.id}`, body) : await api.post("/favourite-profiles", body);
      const id = r?.id || person?.id;
      for (const x of dels) await api.del(`/favourite-profiles/categories/${x}`);
      for (const [i, x] of adds.entries()) await api.post(`/favourite-profiles/${id}/categories`, { category: x.k, notes: x.v, sort_order: oldPrefs.length + i });
      toast(editing ? "Saved" : `${f.name.trim()} added`);
      onSaved(id);
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  const I = (k, l, type = "text", ph = "") => (
    <Field label={l}><input className="input" type={type} dir={type === "text" ? "auto" : undefined} placeholder={ph} value={f[k] || ""} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  const chipX = (label, onX) => (
    <button type="button" aria-label={"Remove " + label} onClick={onX} style={{ border: "none", background: "none", cursor: "pointer", display: "grid", color: "inherit" }}><Icon n="x" s={12} /></button>
  );

  return (
    <Modal size="lg" kicker="Favourites" title={editing ? "Edit person" : "Add a person"} onClose={close}
      foot={<><span className="hint" style={{ marginRight: "auto" }}>{f.name.trim() ? (dirty ? "Unsaved changes" : "No changes") : "Only the name is required"}</span>
        <button type="button" className="btn" onClick={close}>Cancel</button>
        <button type="button" className="btn red" disabled={busy} onClick={save}><Icon n="check" s={15} w={2.4} />{busy ? "Saving…" : editing ? "Save changes" : "Add person"}</button></>}>
      <div className="pf">
        <aside className="pf-prev" style={{ "--tc": TONE_HEX[f.tone] }}>
          <div className="pf-card">
            <div className="pf-letter">{(f.name.trim()[0] || "?").toUpperCase()}</div>
            <div className="pf-name" dir="auto">{f.name.trim() || "Name"}</div>
            <div className="cap" style={{ color: "var(--tc)" }}>{f.rel || "Relation"}</div>
            <div className="pf-facts">
              {f.bday && <span className="pill">{fmtDate(f.bday)}</span>}{f.shoe && <span className="pill">Shoe {f.shoe}</span>}
              {f.dress && <span className="pill">{f.dress}</span>}{prefCount > 0 && <span className="pill">{prefCount} prefs</span>}
            </div>
          </div>
          <div className="field"><span className="label">Card colour</span>
            <div className="row" role="group" aria-label="Card colour">{TONES.map(x => <button type="button" key={x} aria-label={x} aria-pressed={f.tone === x} onClick={() => setF({ ...f, tone: x })} className="pf-sw"
              style={{ background: TONE_HEX[x], outline: f.tone === x ? "3px solid var(--fg)" : "none" }} />)}</div></div>
        </aside>
        <div className="pf-form">
          <section className="pf-sec"><div className="pf-h"><b>01</b>Who</div>
            <Field label="Name" req err={err && "Add a name"}>
              <input className={"input" + (err ? " bad" : "")} autoFocus dir="auto" maxLength={200} placeholder="e.g. Wife, Mother, Ahmed" value={f.name} onBlur={() => setT(true)} onChange={e => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Relation"><div className="row wrap" style={{ gap: 6 }}>
              {[...new Set([...RELS, ...(f.rel && !RELS.includes(f.rel) ? [f.rel] : [])])].map(r => <button type="button" key={r} className={"chip" + (f.rel === r ? " on" : "")} aria-pressed={f.rel === r} onClick={() => setF({ ...f, rel: f.rel === r ? "" : r })}>{r}</button>)}
            </div></Field>
          </section>
          <section className="pf-sec"><div className="pf-h"><b>02</b>Details</div>
            <div className="pf-grid">{I("bday", "Birthday", "date")}{I("phone", "Phone", "tel", "+92 …")}{I("shoe", "Shoe size", "text", "39.7 EU")}{I("dress", "Dress colour", "text", "Black")}</div>
          </section>
          <section className="pf-sec"><div className="pf-h"><b>03</b>Likes &amp; wishes</div>
            <div className="row wrap" style={{ gap: 6 }}>{PREF_K.map(k => <button type="button" key={k} className={"chip" + (pk === k ? " on" : "")} onClick={() => setPk(k)}>{k}</button>)}</div>
            <div className="pf-add">
              <input className="input" dir="auto" aria-label="Category" placeholder="Category" value={pk} onChange={e => setPk(e.target.value)} />
              <input className="input" dir="auto" aria-label="Detail" placeholder="Detail — size, brand, colour…" value={pv} onChange={e => setPv(e.target.value)} onKeyDown={e => e.key === "Enter" && addPref()} />
              <button type="button" className="btn" disabled={!pk.trim()} onClick={addPref}><Icon n="plus" s={14} />Add</button>
            </div>
            {prefCount > 0 && (
              <div className="row wrap" style={{ gap: 6 }}>
                {oldPrefs.map(x => <span key={"o" + x.id} className="chip" style={{ boxShadow: "none", background: "var(--bg-2)" }}><b dir="auto">{x.category}</b>{x.notes && <span className="faint" dir="auto">· {x.notes}</span>}{chipX(x.category, () => setDels(d => [...d, x.id]))}</span>)}
                {adds.map((x, i) => <span key={"n" + i} className="chip" style={{ boxShadow: "none", background: "var(--bg-2)" }}><b dir="auto">{x.k}</b>{x.v && <span className="faint" dir="auto">· {x.v}</span>}{chipX(x.k, () => setAdds(a => a.filter((_, j) => j !== i)))}</span>)}
              </div>
            )}
          </section>
          <section className="pf-sec"><div className="pf-h"><b>04</b>Private notes</div>
            <textarea className="input" dir="auto" aria-label="Private notes" placeholder="Allergies, favourite food, things to avoid…" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
          </section>
        </div>
      </div>
    </Modal>
  );
}

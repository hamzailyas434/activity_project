import { useEffect, useState } from "react";
import { Drawer, Empty, Field, Head, Icon, Modal, RichEditor, RichView, Search, Seg, Skeleton, TONES, TONE_HEX, Toggle, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, plain } from "../lib/format";
import { go } from "../shell/route";
import { answersOf, useNote, useNotesList } from "../lib/notes";

const CAT_T = c => TONES[[...String(c || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 5];
const kb = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

/* answers[] from the API, falling back to the legacy notes.answer column as Answer 01 */

function Hl({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? text : <>{text.slice(0, i)}<mark className="hl">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}


export default function Notes({ sub }) {
  const { toast, q, setQ, cat, setCat, sort, setSort, lim, setLim, catM, setCatM, notes, allCats, list, openId, editing, reviewing, refresh, del, addCat } = useNotesList(sub);
  return (
    <>
      <Head n="04" eyebrow={`${list.length}${list.length >= lim ? "+" : ""} notes · ${allCats.length} categories`} title={<>Things worth <em>remembering</em>.</>}
        sub="Ask once, keep the answer. Review them like flashcards so they stay.">
        <button type="button" className="btn" disabled={!list.length} onClick={() => go("notes/review")}><Icon n="flame" />Review {list.length}</button>
        <button type="button" className="btn" onClick={() => setCatM(true)}><Icon n="plus" />Category</button>
        <button type="button" className="btn primary" onClick={() => go("notes/new")}><Icon n="plus" />Note</button>
      </Head>

      <div className="row wrap" style={{ marginBottom: 18, gap: 8 }}>
        <Search value={q} onChange={setQ} label="Search notes" placeholder="Search questions and answers" style={{ flex: "1 1 260px", maxWidth: 420 }} />
        <div className="row" style={{ gap: 6, overflowX: "auto", paddingBottom: 2, maxWidth: "100%" }}>
          {["All", ...allCats].map(c => <button type="button" key={c} className={"chip" + (cat === c ? " on" : "")} aria-pressed={cat === c} onClick={() => setCat(c)}><span dir="auto">{c}</span></button>)}
        </div>
        <select className="input" aria-label="Show" value={lim} onChange={e => setLim(+e.target.value)} style={{ width: "auto", height: 40, marginLeft: "auto", borderRadius: 99 }}>
          {[25, 50, 100, 200].map(n => <option key={n} value={n}>Show {n}</option>)}
        </select>
        <Seg value={sort} onChange={setSort} label="Sort" options={[["new", "Newest"], ["old", "Oldest"], ["ans", "Most answers"]]} />
      </div>

      {notes.loading && !list.length ? <Skeleton tiles={[["s4", 220], ["s4", 260], ["s4", 200], ["s4", 240], ["s4", 200], ["s4", 220]]} />
        : notes.error && !list.length ? <Empty title="Couldn't load notes" body={notes.error} action={<button type="button" className="btn primary" onClick={notes.reload}>Try again</button>} />
        : !list.length ? <Empty title={q ? "No match" : "No notes yet"} body={q ? `Nothing matches “${q}”.` : "Start with a question you keep asking."} action={<button type="button" className="btn primary" onClick={() => go("notes/new")}>New note</button>} />
        : (
          <div className="notes-mason" style={{ columns: "300px", columnGap: 14 }}>
            {list.map((n, i) => {
              const lead = i === 0 && !q, ans = answersOf(n), qs = plain(n.question);
              return (
                <button type="button" key={n.id} className={"tile note-card" + (lead ? " lead" : "")} onClick={() => go("notes/" + n.id)}>
                  <div className="row sb" style={{ marginBottom: 12 }}>
                    <span className="pill" dir="auto" style={{ background: `color-mix(in oklab,${TONE_HEX[CAT_T(n.category)]} 22%,transparent)`, color: "var(--fg)" }}>{n.category}</span>
                    <span className="mono faint" style={{ fontSize: 11 }}>{fmtDate(n.created_at)}</span>
                  </div>
                  <div className="nq" dir="auto"><Hl text={qs} q={q.trim()} /></div>
                  {ans[0] && <p className="na" dir="auto"><Hl text={plain(ans[0].answer).slice(0, 400)} q={q.trim()} /></p>}
                  <div className="nm">
                    <span>{`${ans.length} answer${ans.length !== 1 ? "s" : ""}`}</span>
                    {ans.some(a => a.is_very_good) && <span className="pill ok" style={{ height: 20 }}>good</span>}
                    {n.attachments_count > 0 && <span>· {n.attachments_count} file{n.attachments_count > 1 ? "s" : ""}</span>}
                    <span style={{ marginLeft: "auto" }}><Icon n="arrow" s={13} /></span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

      {openId && !editing && <NoteDrawer id={openId} cached={list.find(n => n.id === openId)} onDelete={del} />}
      {editing && <NoteEdit id={editing === "new" ? null : editing} cached={list.find(n => n.id === editing)} cats={allCats} defaultCat={cat !== "All" ? cat : allCats[0]}
        onClose={() => go(editing === "new" ? "notes" : "notes/" + editing)} onSaved={id => { refresh(); go("notes/" + id); }} />}
      {reviewing && <Review notes={list} onClose={() => go("notes")} />}
      {catM && <CatAdd cats={allCats} onClose={() => setCatM(false)} onAdd={c => { addCat(c); toast("Category added"); setCatM(false); }} />}
    </>
  );
}


export function NoteDrawer({ id, cached, onDelete }) {
  const api = useApi();
  const { toast } = useUI();
  const { n, loading, error, files } = useNote(id, cached);
  const close = () => go("notes");
  const openFile = async f => {
    const w = window.open("", "_blank");
    try {
      const res = await api.raw(`/notes/attachments/${f.id}`);
      if (!res.ok) throw new Error("Couldn't open the file");
      const u = URL.createObjectURL(await res.blob());
      if (w) w.location.href = u; else location.href = u;
      setTimeout(() => URL.revokeObjectURL(u), 60000);
    } catch (e) { w?.close(); toast(e.message, "err"); }
  };
  if (!n) return <Drawer title={loading ? "Loading…" : "Not found"} onClose={close}>{error && <Empty title="Couldn't open note" body={error} />}</Drawer>;
  const ans = answersOf(n), fl = Array.isArray(files.data) ? files.data : [];
  return (
    <Drawer kicker={`${n.category} · ${fmtDate(n.created_at)}`} title="Note" onClose={close}
      foot={<><button type="button" className="btn danger" style={{ marginRight: "auto" }} onClick={() => onDelete(n)}><Icon n="trash" s={14} />Delete</button>
        <button type="button" className="btn primary" onClick={() => go(`notes/${n.id}/edit`)}><Icon n="edit" s={14} />Edit</button></>}>
      <h2 className="serif ut" dir="auto" style={{ fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.02, textWrap: "balance" }}>{plain(n.question)}</h2>
      {!ans.length && <p className="faint">No answer yet.</p>}
      {ans.map((a, i) => (
        <div key={a.id ?? i} className="tile sunk" style={{ borderLeft: a.is_very_good ? "4px solid var(--green)" : undefined }}>
          <div className="row sb" style={{ marginBottom: 8 }}><span className="cap">Answer {String(i + 1).padStart(2, "0")}</span>{!!a.is_very_good && <span className="pill ok">Very good</span>}</div>
          <RichView html={a.answer} />
        </div>
      ))}
      <div>
        <div className="cap" style={{ marginBottom: 8 }}>Attachments</div>
        {fl.length ? <div className="row wrap">{fl.map(f => <button type="button" key={f.id} className="chip" onClick={() => openFile(f)}><Icon n="clip" s={13} /><span dir="auto">{f.file_name}</span><span className="c">{kb(f.file_size)}</span></button>)}</div>
          : <p className="faint" style={{ fontSize: 13 }}>{files.loading ? "Loading…" : "No files. Add some from Edit."}</p>}
      </div>
    </Drawer>
  );
}

const readB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Couldn't read " + f.name)); r.readAsDataURL(f); });

export function NoteEdit({ id, cached, cats, defaultCat, onClose, onSaved }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const loaded = useNote(id || 0, cached);
  const src = id ? loaded.n : null;
  const blank = { category: defaultCat || "general", question: "", answers: [{ answer: "", is_very_good: false }] };
  const fromNote = n => ({ category: n.category || "general", question: plain(n.question), answers: answersOf(n).map(a => ({ answer: a.answer || "", is_very_good: !!a.is_very_good })) });
  const [init, setInit] = useState(id ? null : blank);
  const [d, setD] = useState(init);
  if (id && src && !init) { const v = fromNote(src); setInit(v); setD(v); }
  const [newCat, setNewCat] = useState(null), [touched, setTouched] = useState(false), [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const [adds, setAdds] = useState([]), [removed, setRemoved] = useState([]);
  const existing = (Array.isArray(loaded.files.data) && id ? loaded.files.data : []).filter(f => !removed.includes(f.id));

  if (!d) return <Modal size="lg" kicker="Edit note" title="Loading…" onClose={onClose}><div className="skel" style={{ height: 200 }} /></Modal>;

  const hasAnswer = d.answers.some(a => plain(a.answer) || /<img|<a /i.test(a.answer));
  const errQ = touched && !d.question.trim(), errA = touched && !hasAnswer;
  const dirty = JSON.stringify(d) !== JSON.stringify(init) || adds.length > 0 || removed.length > 0;
  const close = async () => { if (!dirty || await ask({ title: "Discard changes?", body: "Your edits to this note will be lost.", ok: "Discard", danger: true })) onClose(); };
  const A = (i, patch) => setD(x => ({ ...x, answers: x.answers.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const pick = list => {
    const ok = [...list].filter(f => ACCEPT.split(",").includes(f.type));
    if (ok.length < list.length) toast("Only images (JPEG, PNG, GIF, WebP) and PDFs can be attached", "err");
    const big = ok.filter(f => f.size > 7 * 1024 * 1024);
    if (big.length) toast(`${big[0].name} is over 7 MB`, "err");
    setAdds(a => [...a, ...ok.filter(f => f.size <= 7 * 1024 * 1024)]);
  };
  const save = async () => {
    setTouched(true);
    if (!d.question.trim() || !hasAnswer || busy) return;
    setBusy(true);
    try {
      const body = { category: d.category.trim() || "general", question: d.question.trim(), answers: d.answers.filter(a => plain(a.answer) || /<img|<a /i.test(a.answer)) };
      const n = id ? await api.put(`/notes/${id}`, body) : await api.post("/notes", body);
      const nid = n?.id || id;
      for (const fid of removed) await api.del(`/notes/attachments/${fid}`);
      for (const f of adds) await api.post(`/notes/${nid}/attachments`, { fileData: await readB64(f), fileName: f.name, mimeType: f.type });
      toast(id ? "Note updated" : "Note created");
      onSaved(nid);
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };

  return (
    <Modal size="lg" kicker={id ? "Edit note" : "New note"} title={id ? "Refine it" : "Capture a question"} onClose={close}
      foot={<><span className="hint" style={{ marginRight: "auto" }}>{dirty ? "Unsaved changes" : "No changes"}</span>
        <button type="button" className="btn" onClick={close}>Cancel</button>
        <button type="button" className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : id ? "Save" : "Create note"}</button></>}>
      <Field label="Category">
        <div className="row wrap" style={{ gap: 6 }}>
          {[...new Set([...cats, d.category])].filter(Boolean).map(c => <button type="button" key={c} className={"chip" + (d.category === c ? " on" : "")} aria-pressed={d.category === c} onClick={() => setD({ ...d, category: c })}><span dir="auto">{c}</span></button>)}
          {newCat == null ? <button type="button" className="chip" onClick={() => setNewCat("")}><Icon n="plus" s={12} />New</button>
            : <input className="input" autoFocus dir="auto" aria-label="New category" value={newCat} placeholder="Category name" maxLength={50}
                onChange={e => setNewCat(e.target.value)} onBlur={() => { if (newCat.trim()) setD({ ...d, category: newCat.trim() }); setNewCat(null); }}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.stopPropagation(); setNewCat(null); } }} style={{ width: 180, height: 34, borderRadius: 99 }} />}
        </div>
      </Field>
      <Field label="Question" req err={errQ && "Write the question"}>
        <textarea className={"input" + (errQ ? " bad" : "")} dir="auto" autoFocus value={d.question} onBlur={() => setTouched(true)} onChange={e => setD({ ...d, question: e.target.value })}
          placeholder="What do you want to remember?" style={{ minHeight: 70, fontFamily: "var(--font-display)", fontSize: 22, textTransform: "uppercase", lineHeight: 1.1 }} />
      </Field>
      {d.answers.map((a, i) => (
        <div key={i} className="tile sunk" style={{ padding: 16, overflow: "visible" }}>
          <div className="row sb" style={{ marginBottom: 8 }}>
            <span className="cap">Answer {String(i + 1).padStart(2, "0")}</span>
            <div className="row" style={{ gap: 6 }}>
              <span className="row" style={{ gap: 8, fontSize: 12.5, fontWeight: 700 }}><Toggle on={a.is_very_good} onChange={v => A(i, { is_very_good: v })} label={`Answer ${i + 1} very good`} />Very good</span>
              {d.answers.length > 1 && <button type="button" className="btn ghost sm icon" aria-label={`Remove answer ${i + 1}`} onClick={() => setD(x => ({ ...x, answers: x.answers.filter((_, j) => j !== i) }))}><Icon n="trash" s={13} /></button>}
            </div>
          </div>
          <RichEditor value={a.answer} onChange={v => A(i, { answer: v })} label={`Answer ${i + 1}`} placeholder="Answer, link, page reference… Use the bar for bold, lists and links." />
        </div>
      ))}
      {errA && <span className="err-text" role="alert">Add at least one answer</span>}
      <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setD(x => ({ ...x, answers: [...x.answers, { answer: "", is_very_good: false }] }))}><Icon n="plus" s={14} />Another answer</button>
      <Field label="Attachments" hint="Images and PDFs up to 7 MB — stored with the note.">
        <label className={"drop" + (over ? " on" : "")} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}>
          <input type="file" multiple accept={ACCEPT} style={{ display: "none" }} onChange={e => { pick(e.target.files); e.target.value = ""; }} />
          <Icon n="upload" s={18} /><b>Drop files or click to add</b>
        </label>
        {(existing.length > 0 || adds.length > 0) && (
          <div className="row wrap">
            {existing.map(f => <span key={"e" + f.id} className="chip"><span dir="auto">{f.file_name}</span><span className="c">{kb(f.file_size)}</span>
              <button type="button" aria-label={"Remove " + f.file_name} onClick={() => setRemoved(r => [...r, f.id])} style={{ border: "none", background: "none", cursor: "pointer", display: "grid", color: "inherit" }}><Icon n="x" s={12} /></button></span>)}
            {adds.map((f, i) => <span key={"n" + i} className="chip"><span dir="auto">{f.name}</span><span className="c">new · {kb(f.size)}</span>
              <button type="button" aria-label={"Remove " + f.name} onClick={() => setAdds(a => a.filter((_, j) => j !== i))} style={{ border: "none", background: "none", cursor: "pointer", display: "grid", color: "inherit" }}><Icon n="x" s={12} /></button></span>)}
          </div>
        )}
      </Field>
    </Modal>
  );
}

export function CatAdd({ cats, onClose, onAdd }) {
  const [v, setV] = useState("");
  const dup = cats.some(c => c.toLowerCase() === v.trim().toLowerCase());
  const ok = v.trim() && !dup;
  return (
    <Modal size="sm" kicker="Notes" title="New category" onClose={onClose}
      foot={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn primary" disabled={!ok} onClick={() => onAdd(v.trim())}>Add</button></>}>
      <Field label="Name" req err={dup && "Already exists"} hint="It shows in the list once a note uses it.">
        <input className="input" autoFocus dir="auto" maxLength={50} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && ok && onAdd(v.trim())} />
      </Field>
    </Modal>
  );
}

export function Review({ notes, onClose }) {
  const [deck] = useState(() => [...notes].sort(() => Math.random() - 0.5));
  const [i, setI] = useState(0), [flip, setFlip] = useState(false), [k, setK] = useState(0);
  const n = deck[i], end = i >= deck.length;
  const mark = ok => { setK(x => x + (ok ? 1 : 0)); setFlip(false); setI(x => x + 1); };
  useEffect(() => {
    const h = e => {
      if (end || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      if (e.key === " ") { e.preventDefault(); setFlip(f => !f); }
      if (flip && e.key === "ArrowRight") mark(true);
      if (flip && e.key === "ArrowLeft") mark(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  if (!deck.length) return <Modal size="sm" kicker="Review" title="Nothing to review" onClose={onClose}><p className="muted">Add a few notes first.</p></Modal>;
  return (
    <Modal size="lg" kicker={end ? "Done" : `Card ${i + 1} of ${deck.length}`} title={end ? "Session complete" : "Do you remember?"} onClose={onClose}
      foot={end ? <button type="button" className="btn primary" onClick={onClose}>Close</button>
        : flip ? <><button type="button" className="btn" onClick={() => mark(false)}>← Not yet</button><button type="button" className="btn red" onClick={() => mark(true)}>Knew it →</button></>
          : <><span className="hint" style={{ marginRight: "auto" }}>Space to flip</span><button type="button" className="btn primary" onClick={() => setFlip(true)}>Flip card</button></>}>
      <div className="meter"><i style={{ width: (i / deck.length) * 100 + "%" }} /></div>
      {end ? (
        <div style={{ textAlign: "center", padding: 20 }}><div className="big" style={{ fontSize: 120 }}>{k}<small>/{deck.length}</small></div><p className="muted">remembered</p></div>
      ) : (
        <div role="button" tabIndex={0} onClick={() => setFlip(f => !f)} onKeyDown={e => e.key === "Enter" && setFlip(f => !f)} aria-label={flip ? "Answer — click to flip back" : "Question — click to flip"}
          className={"tile " + (flip ? "ink" : "t-" + CAT_T(n.category))} style={{ minHeight: 280, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14, transition: "background .3s" }}>
          <span className="cap" dir="auto">{flip ? "Answer" : n.category}</span>
          {flip ? <div className="stack">{answersOf(n).length ? answersOf(n).map((a, j) => <div key={j}>{!!a.is_very_good && <span className="pill ok" style={{ marginBottom: 6 }}>★ Very good</span>}<RichView html={a.answer} /></div>) : <p>No answer saved.</p>}</div>
            : <div className="serif ut" dir="auto" style={{ fontSize: "clamp(30px,4vw,48px)", lineHeight: 1, textWrap: "balance" }}>{plain(n.question)}</div>}
          <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>{flip ? "← / →" : "tap to flip"}</span>
        </div>
      )}
    </Modal>
  );
}

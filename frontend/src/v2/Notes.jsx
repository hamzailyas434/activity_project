import { Empty, Icon, RichView, Skeleton, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import { fmtDate, plain } from "../lib/format";
import { answersOf, useNote, useNotesList } from "../lib/notes";
import { CatAdd, NoteEdit, Review } from "../screens/Notes";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 04 Notes — search + category chips + sort, question list on the left, the open note on the right */
const kb = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

function Hl({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? text : <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function Detail({ id, cached, list, onDelete }) {
  const api = useApi();
  const { toast } = useUI();
  const { n, loading, error, files } = useNote(id, cached);
  if (!n) return <article className="card notes-detail">{loading ? <div className="skel" style={{ height: 240 }} /> : <Empty title="Couldn't open note" body={error || "It may have been deleted."} />}</article>;
  const ans = answersOf(n), fl = Array.isArray(files.data) ? files.data : [];
  const idx = list.findIndex(x => x.id === n.id);
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
  return (
    <article className="card notes-detail">
      <div className="row sb nd-top">
        <button type="button" className="btn sm ghost nd-back" onClick={() => go("notes")}><Icon n="chevL" s={14} />All notes</button>
        <span className="badge red">{n.category}</span>
        <div className="row" style={{ marginLeft: "auto" }}>
          <button type="button" className="btn sm" onClick={() => go(`notes/${n.id}/edit`)}><Icon n="edit" s={13} />Edit</button>
          <button type="button" className="btn sm danger" aria-label="Delete note" onClick={() => onDelete(n)}><Icon n="trash" s={13} /></button>
        </div>
      </div>
      <h2 className="disp nd-q ut" dir="auto">{plain(n.question)}</h2>
      <div className="row mono muted" style={{ fontSize: 11, margin: "12px 0 22px", gap: 14, flexWrap: "wrap" }}>
        <span>Created {fmtDate(n.created_at)}</span><span>{ans.length} answer{ans.length !== 1 ? "s" : ""}</span>{idx >= 0 && <span>{idx + 1} / {list.length}</span>}
      </div>
      <div className="stack">
        {!ans.length && <p className="muted">No answer yet.</p>}
        {ans.map((a, i) => (
          <div key={a.id ?? i} className={"nd-ans" + (a.is_very_good ? " good" : "")}>
            <span className="disp nd-n">{String(i + 1).padStart(2, "0")}</span>
            <div style={{ minWidth: 0 }}><RichView html={a.answer} />{!!a.is_very_good && <span className="badge ok" style={{ marginTop: 10 }}><Icon n="check" s={11} w={2.5} />Very good</span>}</div>
          </div>
        ))}
      </div>
      {!!fl.length && <div className="row wrap" style={{ marginTop: 18 }}>{fl.map(f => <button type="button" key={f.id} className="chip" onClick={() => openFile(f)}><Icon n="clip" s={13} /><span dir="auto">{f.file_name}</span><span className="c">{kb(f.file_size)}</span></button>)}</div>}
      <div className="nd-nav">
        <button type="button" className="btn sm" disabled={idx <= 0} onClick={() => go("notes/" + list[idx - 1].id)}><Icon n="chevL" s={13} />Previous</button>
        <button type="button" className="btn sm" disabled={idx < 0 || idx >= list.length - 1} onClick={() => go("notes/" + list[idx + 1].id)}>Next<Icon n="chevR" s={13} /></button>
      </div>
    </article>
  );
}

export default function Notes({ sub }) {
  const { toast, q, setQ, cat, setCat, sort, setSort, lim, setLim, catM, setCatM, notes, allCats, list, openId, editing, reviewing, refresh, del, addCat } = useNotesList(sub);
  const selId = openId || list[0]?.id || null;
  const good = list.filter(n => answersOf(n).some(a => a.is_very_good)).length;
  const count = c => list.filter(n => n.category === c).length;

  return (
    <>
      <PageHead idx="04" meta={`${list.length}${list.length >= lim ? "+" : ""} notes · ${allCats.length} categories · ${good} marked good`} title={<>Questions <em>&amp;</em> answers</>} sub="Keep what you learn. Search it later. Review it so it sticks.">
        <button type="button" className="btn" disabled={!list.length} onClick={() => go("notes/review")}><Icon n="flame" />Review {list.length}</button>
        <button type="button" className="btn" onClick={() => setCatM(true)}><Icon n="plus" />Category</button>
        <button type="button" className="btn primary" onClick={() => go("notes/new")}><Icon n="plus" />New note</button>
      </PageHead>

      <div className="notes-bar">
        <div className="search"><Icon n="search" s={14} /><input className="input" dir="auto" aria-label="Search notes" placeholder="Search questions and answers" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="chips-scroll">{["All", ...allCats].map(c => <button type="button" key={c} className={"chip " + (cat === c ? "on" : "")} onClick={() => setCat(c)}>{c}{cat === "All" && <span className="c">{c === "All" ? list.length : count(c)}</span>}</button>)}</div>
        <select className="input" aria-label="Sort notes" value={sort} onChange={e => setSort(e.target.value)} style={{ width: "auto" }}><option value="new">Newest</option><option value="old">Oldest</option><option value="ans">Most answers</option></select>
      </div>

      {notes.loading && !list.length ? <Skeleton tiles={[["s5", 420], ["s7", 420]]} /> : (
        <div className={"notes-split" + (openId ? " show-detail" : "")}>
          <section className="card flush notes-list">
            {!list.length ? <div style={{ padding: 16 }}><Empty title="No notes" body={q ? `Nothing matches “${q}”.` : "Start with a question you keep asking."} /></div> : <>
              {list.map((n, i) => {
                const on = selId === n.id, ans = answersOf(n);
                return (
                  <button type="button" key={n.id} className={"nl-item" + (on ? " on" : "")} onClick={() => go("notes/" + n.id)}>
                    <span className="nl-num mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="nl-body">
                      <span className="row sb" style={{ marginBottom: 6 }}><span className="badge">{n.category}</span><span className="mono muted" style={{ fontSize: 11 }}>{fmtDate(n.created_at)}</span></span>
                      <span className="nl-q ut" dir="auto"><Hl text={plain(n.question)} q={q.trim()} /></span>
                      <span className="nl-meta">{ans.length} answer{ans.length !== 1 ? "s" : ""}{ans.some(a => a.is_very_good) && <><span className="dot-ok" />good</>}</span>
                    </span>
                  </button>
                );
              })}
              {list.length >= lim && <div style={{ padding: 12 }}><button type="button" className="btn sm" style={{ width: "100%" }} onClick={() => setLim(l => l + 50)}>Show more</button></div>}
            </>}
          </section>
          {selId ? <Detail key={selId} id={selId} cached={list.find(n => n.id === selId)} list={list} onDelete={del} /> : <div />}
        </div>
      )}

      {editing && <NoteEdit id={editing === "new" ? null : editing} cached={list.find(n => n.id === editing)} cats={allCats} defaultCat={cat !== "All" ? cat : allCats[0]}
        onClose={() => go(editing === "new" ? "notes" : "notes/" + editing)} onSaved={id => { refresh(); go("notes/" + id); }} />}
      {reviewing && <Review notes={list} onClose={() => go("notes")} />}
      {catM && <CatAdd cats={allCats} onClose={() => setCatM(false)} onAdd={c => { addCat(c); toast("Category added"); setCatM(false); }} />}
    </>
  );
}

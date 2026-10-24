import { useCallback, useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Empty, Field, Head, Icon, Modal, Ring, Skeleton, TONES, TONE_HEX, useUI } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { useApi, url } from "../lib/api";
import useLoad from "../lib/useLoad";
import { ago, plain } from "../lib/format";
import { go } from "../shell/route";
import EpubView from "./EpubView";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const toneOf = b => TONES[(b.id || 0) % 5];
const pctOf = b => (b.total_pages ? Math.min(1, (b.current_page || 1) / b.total_pages) : 0);
const ls = (k, d) => { try { const v = +localStorage.getItem(k); return v || d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* optional */ } };

export default function Books({ sub }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const books = useLoad(api, a => a.get("/books"), "", []);
  const summary = useLoad(api, a => a.get("/books/dashboard-summary"), "", null);
  const [up, setUp] = useState(false), [goal, setGoal] = useState(false);
  const list = Array.isArray(books.data) ? books.data : [];
  const today = summary.data?.pages_today || 0, target = summary.data?.daily_pages_goal || 10;
  // most recently read first; fall back to newest upload
  const cur = [...list].sort((a, b) => String(b.last_read_date || "").localeCompare(String(a.last_read_date || "")))[0];
  // #/books/4 opens the reader at the saved page, #/books/4/161 at page 161
  const [, idS, pgS] = String(sub || "").match(/^(\d+)(?:\/(\d+))?$/) || [];
  const openId = idS ? +idS : null, openPg = pgS ? +pgS : null;
  const reading = openId && list.find(b => b.id === openId);

  const del = async b => {
    if (!(await ask({ title: `Delete ${b.title}?`, body: "The book file, its notes, bookmarks and highlights will be removed.", ok: "Delete", danger: true }))) return;
    try { await api.del(`/books/${b.id}`); books.setData(l => l.filter(x => x.id !== b.id)); toast("Book deleted"); }
    catch (e) { toast(e.message, "err"); }
  };

  if (openId && books.loading && !list.length) return <div className="boot" aria-busy="true"><i /></div>;
  if (reading) return <Reader key={`${reading.id}-${openPg || ""}`} b={reading} start={openPg} onClose={() => go("books")} onProgress={(id, page, total) => { books.setData(l => l.map(x => (x.id === id ? { ...x, current_page: page, total_pages: total || x.total_pages, last_read_date: new Date().toISOString() } : x))); summary.reload(); }}
    onCover={(id, cover) => books.setData(l => l.map(x => (x.id === id ? { ...x, cover_data: cover } : x)))} />;

  return (
    <>
      <Head n="07" eyebrow={`${list.length} books · ${today}/${target} pages today`} title={<>A shelf, <em>slowly</em> read.</>}
        sub="Pick up where you left off. Notes, bookmarks and highlights stay with the page.">
        <button type="button" className="btn" onClick={() => setGoal(true)}><Icon n="flame" />Goal · {target}</button>
        <button type="button" className="btn primary" onClick={() => setUp(true)}><Icon n="upload" />Upload book</button>
      </Head>
      {openId && !reading && !books.loading && <div style={{ marginBottom: 14 }}><Empty title="Book not found" body="It may have been deleted." action={<button type="button" className="btn primary" onClick={() => go("books")}>Back to shelf</button>} /></div>}

      {books.loading && !list.length ? <Skeleton tiles={[["s8", 300], ["s4", 300], ["s12", 300]]} />
        : books.error && !list.length ? <Empty title="Couldn't load books" body={books.error} action={<button type="button" className="btn primary" onClick={books.reload}>Try again</button>} />
        : !list.length ? <Empty title="Shelf is empty" body="Upload a PDF or EPUB to start reading." action={<button type="button" className="btn primary" onClick={() => setUp(true)}>Upload</button>} />
        : <>
          <div className="bento" style={{ marginBottom: 14 }}>
            <section className={"tile s8 t-" + toneOf(cur)} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 26, alignItems: "end", minHeight: 300 }}>
              <Spine b={cur} h={250} />
              <div style={{ minWidth: 0 }}>
                <div className="cap">Continue reading</div>
                <div className="serif ut" dir="auto" style={{ fontSize: "clamp(40px,6vw,84px)", lineHeight: 0.9, margin: "10px 0" }}>{cur.title}</div>
                {cur.author && <div dir="auto" style={{ fontWeight: 700 }}>{cur.author}</div>}
                <div className="row" style={{ marginTop: 18, gap: 14 }}>
                  <div className="meter grow"><i style={{ width: pctOf(cur) * 100 + "%" }} /></div>
                  <span className="mono" style={{ fontSize: 12 }}>p.{cur.current_page || 1}{cur.total_pages ? "/" + cur.total_pages : ""}</span>
                </div>
                <button type="button" className="btn primary" style={{ marginTop: 16 }} onClick={() => go("books/" + cur.id)}><Icon n="book" />Open at p.{cur.current_page || 1}</button>
              </div>
            </section>
            <section className="tile s4" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <Ring v={today / target} size={170} w={16}><div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{today}</div><span className="mono faint" style={{ fontSize: 11 }}>of {target} pages</span></Ring>
              <span className="muted" style={{ fontSize: 13 }}>{target - today > 0 ? `${target - today} pages to today's goal` : "Goal met — well done"}</span>
            </section>
          </div>
          <section className="tile">
            <div className="th"><div><div className="cap">Library</div><h3>The <em>shelf</em></h3></div></div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", overflowX: "auto", paddingBottom: 14, borderBottom: "6px solid var(--bg-3)" }}>
              {list.map(b => <button type="button" key={b.id} onClick={() => go("books/" + b.id)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, textAlign: "left" }} aria-label={"Open " + b.title}><Spine b={b} h={200 + ((b.total_pages || b.id * 7) % 60)} /></button>)}
              <button type="button" aria-label="Upload a book" onClick={() => setUp(true)} style={{ width: 70, height: 200, borderRadius: 10, border: "2px dashed var(--line-2)", background: "none", cursor: "pointer", color: "var(--fg-3)", flexShrink: 0 }}><Icon n="plus" /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))", gap: 10, marginTop: 16 }}>
              {list.map(b => (
                <div key={b.id} className="row" style={{ gap: 10 }}>
                  <i style={{ width: 8, height: 34, borderRadius: 4, background: TONE_HEX[toneOf(b)], flexShrink: 0 }} />
                  <button type="button" className="grow" onClick={() => go("books/" + b.id)} style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", padding: 0, color: "inherit", minWidth: 0 }}>
                    <b dir="auto" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</b>
                    <div className="mono faint" style={{ fontSize: 11 }}>{Math.round(pctOf(b) * 100)}% · p.{b.current_page || 1}{b.total_pages ? "/" + b.total_pages : ""}</div>
                  </button>
                  <button type="button" className="btn ghost sm icon" aria-label={"Delete " + b.title} onClick={() => del(b)}><Icon n="trash" s={13} /></button>
                </div>
              ))}
            </div>
          </section>
          <BookNotes api={api} books={list} />
        </>}

      {up && <Upload onClose={() => setUp(false)} onDone={id => { books.reload(); go("books/" + id); }} />}
      {goal && <Goal value={target} onClose={() => setGoal(false)} onSaved={v => summary.setData(s => ({ ...(s || {}), daily_pages_goal: v }))} />}
    </>
  );
}

/* All page notes outside the reader: Favourites or one book. A card opens the reader at its page. */
function BookNotes({ api, books }) {
  const { toast } = useUI();
  const sum = useLoad(api, a => a.get("/books/notes-summary"), "", null);
  const favs = useLoad(api, a => a.get("/books/favourite-notes"), "", []);
  const withNotes = (sum.data?.books || []).filter(x => books.some(b => b.id === x.id));
  const favList = Array.isArray(favs.data) ? favs.data : [];
  const [pick, setPick] = useState(null);
  const sel = pick ?? (favList.length ? "fav" : withNotes[0]?.id ?? "fav");
  const one = useLoad(api, a => (sel === "fav" ? Promise.resolve(null) : a.get(`/books/${sel}/page-notes-all`)), String(sel), null);
  const raw = sel === "fav" ? favList : Array.isArray(one.data) ? one.data : [];
  const notes = raw.filter(n => plain(n.content));
  const loading = sel === "fav" ? favs.loading : one.loading;
  if (!sum.loading && !withNotes.length && !favList.length) return null;

  const fav = async n => {
    try {
      const r = await api.patch(`/books/page-notes/${n.id}/favourite`);
      const upd = l => (Array.isArray(l) ? l.map(x => (x.id === n.id ? { ...x, is_favourite: r.is_favourite } : x)) : l);
      one.setData(upd);
      favs.setData(l => (r.is_favourite ? [...(l || []).filter(x => x.id !== n.id), { ...n, is_favourite: 1 }] : (l || []).filter(x => x.id !== n.id)));
      toast(r.is_favourite ? "Added to favourites" : "Removed from favourites");
    } catch (e) { toast(e.message, "err"); }
  };

  return (
    <section className="tile" style={{ marginTop: 14 }}>
      <div className="th"><div><div className="cap">Margins</div><h3>Book <em>notes</em></h3></div><span className="mono faint">{notes.length}</span></div>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button type="button" className={sel === "fav" ? "on" : ""} aria-pressed={sel === "fav"} onClick={() => setPick("fav")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon n="heart" s={12} />Favourites {favList.length}</button>
        {withNotes.map(x => <button type="button" key={x.id} dir="auto" className={sel === x.id ? "on" : ""} aria-pressed={sel === x.id} onClick={() => setPick(x.id)} style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{x.title} {x.note_count}</button>)}
      </div>
      {loading && !notes.length ? <div className="skel" style={{ height: 140 }} />
        : !notes.length ? <p className="faint" style={{ fontSize: 13 }}>{sel === "fav" ? "Tap the heart on a note in the reader to keep it here." : "No notes in this book yet."}</p>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 12 }}>
          {notes.map(n => {
            const t = plain(n.content), title = n.book_title || books.find(b => b.id === n.book_id)?.title || "";
            return (
              <div key={n.id} className="tile sunk" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="row sb" style={{ gap: 8 }}>
                  <span className="pill">p.{n.page_number}</span>
                  {sel === "fav" && <span className="mono faint" dir="auto" style={{ fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{title}</span>}
                </div>
                <p className="ut" dir="auto" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{t.length > 260 ? t.slice(0, 260) + "…" : t}</p>
                <div className="row" style={{ marginTop: "auto", gap: 4, justifyContent: "flex-end" }}>
                  <button type="button" className="btn ghost sm icon" aria-label={n.is_favourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={!!n.is_favourite} onClick={() => fav(n)} style={{ color: n.is_favourite ? "var(--red)" : undefined }}><Icon n="heart" s={14} fill={n.is_favourite ? "currentColor" : undefined} /></button>
                  <button type="button" className="btn sm" onClick={() => go(`books/${n.book_id || sel}/${n.page_number}`)}><Icon n="book" s={13} />Open p.{n.page_number}</button>
                </div>
              </div>
            );
          })}
        </div>}
    </section>
  );
}

function Spine({ b, h }) {
  const tone = toneOf(b);
  return (
    <div style={{ width: 70, height: h, borderRadius: 10, background: TONE_HEX[tone], color: tone === "red" ? "#fff" : "#111", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "14px 0", flexShrink: 0, position: "relative", overflow: "hidden", boxShadow: "inset -6px 0 0 rgba(0,0,0,.12), 0 12px 24px -14px rgba(0,0,0,.5)" }}>
      {b.cover_data && <img src={b.cover_data} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22, mixBlendMode: "multiply" }} />}
      <span className="mono" style={{ fontSize: 9, opacity: 0.7, position: "relative" }}>{Math.round(pctOf(b) * 100)}%</span>
      <span className="serif" dir="auto" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 22, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxHeight: h - 70, position: "relative" }}>{b.title}</span>
      <i style={{ width: 22, height: 3, borderRadius: 2, background: "currentColor", opacity: 0.4, position: "relative" }} />
    </div>
  );
}

function Upload({ onClose, onDone }) {
  const api = useApi();
  const { toast } = useUI();
  const [f, setF] = useState(null), [title, setTitle] = useState(""), [author, setAuthor] = useState(""), [busy, setBusy] = useState(false), [over, setOver] = useState(false), [t, setT] = useState(false);
  const pick = x => {
    if (!x) return;
    if (x.type !== "application/pdf" && !/\.epub$/i.test(x.name)) return toast("Choose a PDF or EPUB file", "err");
    setF(x); if (!title) setTitle(x.name.replace(/\.(pdf|epub)$/i, ""));
  };
  const save = async () => {
    setT(true);
    if (!f || !title.trim() || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("pdf", f); fd.append("title", title.trim()); fd.append("author", author.trim());
      const r = await api.post("/books", fd);
      toast("Book added"); onDone(r.id); onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal kicker="Books" title="Upload a book" onClose={onClose}
      foot={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn primary" disabled={!f || busy} onClick={save}>{busy ? "Uploading…" : "Add to shelf"}</button></>}>
      <label className={"drop" + (over ? " on" : "")} style={{ padding: 28 }} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
        <input type="file" accept="application/pdf,.pdf,application/epub+zip,.epub" style={{ display: "none" }} onChange={e => pick(e.target.files[0])} />
        <Icon n="upload" s={22} /><b className="ut">{f ? f.name : "Choose a PDF or EPUB"}</b><span>{f ? (f.size / 1048576).toFixed(1) + " MB" : "Click to browse or drop it here · up to 100 MB"}</span>
      </label>
      <Field label="Title" req err={t && !title.trim() && "Give it a title"}><input className={"input" + (t && !title.trim() ? " bad" : "")} dir="auto" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Author"><input className="input" dir="auto" value={author} onChange={e => setAuthor(e.target.value)} /></Field>
    </Modal>
  );
}

function Goal({ value, onClose, onSaved }) {
  const api = useApi();
  const { toast } = useUI();
  const [v, setV] = useState(String(value));
  const save = async n => {
    const g = Math.max(1, Math.min(1000, +n || 0));
    if (!g) return;
    try { await api.put("/books/reading-goal", { daily_pages_goal: g }); onSaved(g); setV(String(g)); toast(`Goal: ${g} pages`); }
    catch (e) { toast(e.message, "err"); }
  };
  return (
    <Modal size="sm" kicker="Reading" title="Daily goal" onClose={onClose} foot={<button type="button" className="btn primary" onClick={onClose}>Done</button>}>
      <Field label="Pages per day">
        <div className="row wrap">
          {[5, 10, 20, 30].map(n => <button type="button" key={n} className={"chip" + (+v === n ? " on" : "")} aria-pressed={+v === n} onClick={() => save(n)}>{n}</button>)}
          <input className="input mono" type="number" min="1" max="1000" aria-label="Custom goal" value={v} onChange={e => setV(e.target.value)} onBlur={() => +v !== value && save(v)} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} style={{ width: 90 }} />
        </div>
      </Field>
    </Modal>
  );
}

/* Full-screen reader: real PDF via react-pdf, floating Shelf button, zoom / bookmark / highlight / notes pill,
   bottom page-nav pill, resizable side panel with Notes · Bookmarks · Highlights. */
function Reader({ b, start, onClose, onProgress, onCover }) {
  const api = useApi();
  const { token } = useAuth();
  const { toast, ask } = useUI();
  const [pg, setPg] = useState(start || b.current_page || 1), [pgIn, setPgIn] = useState(String(start || b.current_page || 1)), [pages, setPages] = useState(b.total_pages || 0);
  const [zoom, setZoom] = useState(100), [side, setSide] = useState(() => window.innerWidth > 900), [tab, setTab] = useState("notes");
  const [sw, setSw] = useState(() => Math.max(320, Math.min(760, ls("books-notes-width-v2", 460)))), [fs, setFs] = useState(() => Math.max(11, Math.min(20, ls("books-notes-font-size", 14))));
  const [paneW, setPaneW] = useState(800), [txt, setTxt] = useState(""), [busy, setBusy] = useState(false);
  const pane = useRef(null), saveT = useRef(null), noteT = useRef({});
  const [file] = useState(() => ({ url: url(`/books/${b.id}/file`), httpHeaders: { Authorization: `Bearer ${token}` } }));
  const [coverDone, setCoverDone] = useState(!!b.cover_data);
  const isEpub = b.format === "epub", epubSel = useRef(""); // EPUB text lives in an iframe, so its selection is reported here
  const coverCanvas = useRef(null);

  const notes = useLoad(api, a => a.get(`/books/${b.id}/page-notes/${pg}`), `${b.id}-${pg}`, []);
  const marks = useLoad(api, a => a.get(`/books/${b.id}/favourite-pages`), String(b.id), []);
  const hls = useLoad(api, a => a.get(`/books/${b.id}/highlights`), String(b.id), []);
  const nl = Array.isArray(notes.data) ? notes.data : [], ml = Array.isArray(marks.data) ? marks.data : [], hl = Array.isArray(hls.data) ? hls.data : [];
  const marked = ml.includes(pg);

  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPaneW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goPage = useCallback(p => {
    const n = Math.max(1, Math.min(pages || 1, p));
    setPg(n); setPgIn(String(n));
    clearTimeout(saveT.current);
    saveT.current = setTimeout(async () => {
      try { await api.put(`/books/${b.id}/progress`, { current_page: n, total_pages: pages || undefined }); onProgress(b.id, n, pages); }
      catch { /* progress is best-effort */ }
    }, 600);
  }, [api, b.id, pages, onProgress]);
  useEffect(() => () => clearTimeout(saveT.current), []);

  useEffect(() => {
    const h = e => {
      const el = document.activeElement;
      if (/INPUT|TEXTAREA|SELECT/.test(el?.tagName) || el?.isContentEditable || document.querySelector(".scrim")) return;
      if (e.key === "ArrowRight") goPage(pg + 1);
      if (e.key === "ArrowLeft") goPage(pg - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pg, goPage, onClose]);

  const saveCover = async () => {
    const c = coverCanvas.current;
    if (!c || coverDone) return;
    setCoverDone(true);
    try {
      const t = document.createElement("canvas"), r = Math.min(1, 300 / c.width);
      t.width = Math.round(c.width * r); t.height = Math.round(c.height * r);
      t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
      const data = t.toDataURL("image/jpeg", 0.7);
      await api.put(`/books/${b.id}/cover`, { cover_data: data });
      onCover(b.id, data);
    } catch { /* cover is optional */ }
  };

  const addNote = async () => {
    if (!txt.trim() || busy) return;
    setBusy(true);
    try { const n = await api.post(`/books/${b.id}/page-notes`, { page_number: pg, title: "", content: txt.trim() }); notes.setData(l => [...l, n]); setTxt(""); toast("Note saved to p." + pg); }
    catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  };
  const [saving, setSaving] = useState({}); // note id → "saving" | "saved"
  const editNote = (n, content) => {
    notes.setData(l => l.map(x => (x.id === n.id ? { ...x, content } : x)));
    setSaving(s => ({ ...s, [n.id]: "saving" }));
    clearTimeout(noteT.current[n.id]);
    noteT.current[n.id] = setTimeout(() => api.put(`/books/page-notes/${n.id}`, { title: "", content })
      .then(() => setSaving(s => ({ ...s, [n.id]: "saved" })))
      .catch(e => { setSaving(s => ({ ...s, [n.id]: undefined })); toast(e.message, "err"); }), 700);
  };
  const favNote = async n => {
    try { const r = await api.patch(`/books/page-notes/${n.id}/favourite`); notes.setData(l => l.map(x => (x.id === n.id ? { ...x, is_favourite: r.is_favourite } : x))); }
    catch (e) { toast(e.message, "err"); }
  };
  const delNote = async n => {
    if (!(await ask({ title: "Delete note?", body: plain(n.content).slice(0, 140), ok: "Delete", danger: true }))) return;
    try { await api.del(`/books/page-notes/${n.id}`); notes.setData(l => l.filter(x => x.id !== n.id)); }
    catch (e) { toast(e.message, "err"); }
  };
  const mark = async (page = pg) => {
    try {
      const r = await api.post(`/books/${b.id}/favourite-pages`, { page_number: page });
      marks.setData(l => (r.favourited ? [...l, page].sort((x, y) => x - y) : l.filter(x => x !== page)));
      toast(r.favourited ? `Bookmarked p.${page}` : "Bookmark removed");
    } catch (e) { toast(e.message, "err"); }
  };
  const highlight = async () => {
    const sel = String(window.getSelection() || "").trim() || epubSel.current;
    if (!sel) return toast("Select text on the page first", "err");
    try {
      const h = await api.post(`/books/${b.id}/highlights`, { page_number: pg, selected_text: sel.slice(0, 5000), note: null, color: TONE_HEX.gold });
      hls.setData(l => [...l, h]); window.getSelection()?.removeAllRanges(); epubSel.current = ""; toast("Highlighted"); setTab("hl"); setSide(true);
    } catch (e) { toast(e.message, "err"); }
  };
  const delHl = async h => {
    if (!(await ask({ title: "Delete highlight?", body: `“${h.selected_text.slice(0, 140)}”`, ok: "Delete", danger: true }))) return;
    try { await api.del(`/books/highlights/${h.id}`); hls.setData(l => l.filter(x => x.id !== h.id)); }
    catch (e) { toast(e.message, "err"); }
  };
  const grip = e => {
    e.preventDefault();
    const x0 = e.clientX, w0 = sw;
    const mv = ev => { const w = Math.max(320, Math.min(760, w0 + x0 - ev.clientX)); setSw(w); lsSet("books-notes-width-v2", w); };
    const upF = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", upF); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", upF);
  };
  const font = d => { const v = Math.max(11, Math.min(20, fs + d)); setFs(v); lsSet("books-notes-font-size", v); };

  const narrow = typeof window !== "undefined" && window.innerWidth <= 760;
  const panelW = narrow ? 0 : side ? sw + 24 : 0;
  const pageW = Math.max(240, Math.min(820, paneW - 32) * (zoom / 100));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--bg-2)", display: "flex" }}>
      <div ref={pane} className="grow" style={{ overflow: "auto", padding: "calc(78px + env(safe-area-inset-top)) 16px calc(110px + env(safe-area-inset-bottom))", marginRight: panelW }}>
        <div style={{ width: isEpub ? Math.max(240, Math.min(820, paneW - 32)) : pageW, margin: "0 auto", borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 80px -40px rgba(0,0,0,.5)", background: "#FBF8F1" }}>
          {isEpub ? (
            <EpubView id={b.id} token={token} pg={pg} width={Math.max(240, Math.min(820, paneW - 32))} zoom={zoom} coverDone={coverDone}
              onPages={n => { setPages(n); if (b.total_pages !== n) api.put(`/books/${b.id}/progress`, { current_page: pg, total_pages: n }).catch(() => {}); }}
              onMoved={goPage} onSelect={t => { epubSel.current = t; }}
              onCover={data => { setCoverDone(true); api.put(`/books/${b.id}/cover`, { cover_data: data }).then(() => onCover(b.id, data)).catch(() => {}); }}
              onError={() => toast("Couldn't open this EPUB", "err")} />
          ) : (
            <Document file={file} onLoadSuccess={({ numPages }) => { setPages(numPages); if (!b.total_pages) api.put(`/books/${b.id}/progress`, { current_page: pg, total_pages: numPages }).catch(() => {}); }}
              onLoadError={() => toast("Couldn't load this PDF", "err")}
              loading={<div className="skel" style={{ height: pageW * 1.35, borderRadius: 0 }} />}
              error={<div style={{ padding: 40 }}><Empty title="Couldn't open PDF" body="The file may be missing on the server." /></div>}>
              <Page pageNumber={pg} width={pageW} renderTextLayer renderAnnotationLayer loading={<div className="skel" style={{ height: pageW * 1.35, borderRadius: 0 }} />} />
              {!coverDone && <div style={{ position: "absolute", opacity: 0, pointerEvents: "none", left: -9999 }} aria-hidden="true">
                <Page pageNumber={1} width={300} renderTextLayer={false} renderAnnotationLayer={false} canvasRef={coverCanvas} onRenderSuccess={saveCover} /></div>}
            </Document>
          )}
        </div>
      </div>

      <div style={{ position: "fixed", top: "calc(14px + env(safe-area-inset-top))", left: 14, right: panelW + 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, pointerEvents: "none" }}>
        <button type="button" className="btn" style={{ pointerEvents: "auto", boxShadow: "var(--tile-shadow)", background: "var(--bg-1)" }} onClick={onClose}><Icon n="chevL" s={15} />Shelf</button>
        <div className="row" style={{ pointerEvents: "auto", background: "var(--bg-1)", borderRadius: 99, padding: 4, boxShadow: "var(--tile-shadow)", gap: 2 }}>
          <button type="button" className="btn ghost sm icon" aria-label="Zoom out" disabled={zoom <= 60} onClick={() => setZoom(z => Math.max(60, z - 10))}><Icon n="zoomOut" s={15} /></button>
          <span className="mono" style={{ fontSize: 11, width: 38, textAlign: "center" }}>{zoom}%</span>
          <button type="button" className="btn ghost sm icon" aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(z => Math.min(200, z + 10))}><Icon n="zoomIn" s={15} /></button>
          <button type="button" className="btn ghost sm icon" aria-label="Bookmark page" aria-pressed={marked} onClick={() => mark()} style={{ color: marked ? "var(--red)" : undefined }}><Icon n="bookmark" s={15} fill={marked ? "currentColor" : undefined} /></button>
          <button type="button" className="btn ghost sm" onMouseDown={e => e.preventDefault()} onClick={highlight}><Icon n="pen" s={14} />Highlight</button>
          <button type="button" className="btn ghost sm icon" aria-label={side ? "Hide notes panel" : "Show notes panel"} aria-pressed={side} onClick={() => setSide(v => !v)}><Icon n="panel" s={15} /></button>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: "calc(18px + env(safe-area-inset-bottom))", left: `calc((100% - ${panelW}px) / 2)`, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "#000", border: "1px solid var(--ink-4)", color: "#fff", borderRadius: 99, padding: 6, zIndex: 3 }}>
        <button type="button" className="btn sm icon" style={{ background: "var(--ink-3)", color: "#fff" }} aria-label="Previous page" disabled={pg <= 1} onClick={() => goPage(pg - 1)}><Icon n="chevL" s={15} /></button>
        <input className="mono" inputMode="numeric" aria-label="Page" value={pgIn} onChange={e => setPgIn(e.target.value.replace(/\D/g, ""))} onBlur={() => +pgIn && goPage(+pgIn)} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
          style={{ width: 54, height: 34, border: "none", borderRadius: 99, background: "var(--ink-3)", color: "#fff", textAlign: "center" }} />
        <span className="mono" style={{ fontSize: 11, opacity: 0.6, padding: "0 6px" }}>/ {pages || "…"}</span>
        <button type="button" className="btn sm icon" style={{ background: "var(--red)", color: "#fff" }} aria-label="Next page" disabled={!!pages && pg >= pages} onClick={() => goPage(pg + 1)}><Icon n="chevR" s={15} /></button>
      </div>

      {side && (
        <aside aria-label="Reader panel" style={narrow
          ? { position: "fixed", left: 0, right: 0, bottom: 0, height: "62vh", background: "var(--bg-1)", borderRadius: "var(--r-xl) var(--r-xl) 0 0", boxShadow: "var(--pop)", display: "flex", flexDirection: "column", zIndex: 4 }
          : { position: "fixed", top: 12, right: 12, bottom: 12, width: sw, background: "var(--bg-1)", borderRadius: 26, boxShadow: "var(--pop)", display: "flex", flexDirection: "column", zIndex: 2 }}>
          {!narrow && <div className="rd-grip" role="separator" aria-orientation="vertical" aria-label="Resize notes panel" title="Drag to resize" onMouseDown={grip} />}
          <div className="row sb" style={{ padding: "18px 18px 10px" }}>
            <b className="serif" style={{ fontSize: 26 }}>Page {pg}</b>
            <div className="row" style={{ gap: 2, marginLeft: "auto", marginRight: 4 }}>
              <button type="button" className="btn ghost sm" aria-label="Smaller note text" disabled={fs <= 11} onClick={() => font(-1)} style={{ padding: "0 8px", fontSize: 11 }}>A−</button>
              <span className="mono faint" style={{ fontSize: 10.5, width: 22, textAlign: "center" }}>{fs}</span>
              <button type="button" className="btn ghost sm" aria-label="Larger note text" disabled={fs >= 20} onClick={() => font(1)} style={{ padding: "0 8px", fontSize: 14 }}>A+</button>
            </div>
            <button type="button" className="btn ghost sm icon" aria-label="Close panel" onClick={() => setSide(false)}><Icon n="x" s={15} /></button>
          </div>
          <div style={{ padding: "0 18px" }}>
            <div className="seg">{[["notes", `Notes ${nl.length}`], ["marks", `Bookmarks ${ml.length}`], ["hl", `Highlights ${hl.length}`]].map(([k, l]) =>
              <button type="button" key={k} className={tab === k ? "on" : ""} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
          </div>
          <div className="stack" style={{ padding: 18, flex: 1, overflowY: "auto" }}>
            {tab === "notes" && <>
              {notes.loading && !nl.length ? <div className="skel" style={{ height: 120, borderRadius: 18 }} />
                : !nl.length && <div className="bn-empty"><Icon n="edit" s={20} /><b>Nothing in the margin yet</b><span>Jot a thought, a summary or a question for p.{pg} below.</span></div>}
              {nl.map((n, i) => <PageNote key={n.id} n={n} i={i} pg={pg} size={fs} state={saving[n.id]} onChange={v => editNote(n, v)} onFav={() => favNote(n)} onDel={() => delNote(n)} />)}
            </>}
            {tab === "marks" && (ml.length ? ml.map(m => (
              <div key={m} className="row" style={{ gap: 6 }}>
                <button type="button" className="chip grow" onClick={() => goPage(m)} style={{ justifyContent: "space-between" }}>Page {m}<Icon n="arrow" s={13} /></button>
                <button type="button" className="btn ghost sm icon" aria-label={`Remove bookmark p.${m}`} onClick={() => mark(m)}><Icon n="x" s={13} /></button>
              </div>
            )) : <p className="faint" style={{ fontSize: 13 }}>Tap the bookmark to save a page.</p>)}
            {tab === "hl" && (hl.length ? [...hl].sort((x, y) => x.page_number - y.page_number).map(h => (
              <div key={h.id} className="tile sunk" style={{ padding: 12, borderLeft: `4px solid ${h.color || "var(--gold)"}` }}>
                <div className="row sb"><button type="button" className="mono faint" onClick={() => goPage(h.page_number)} style={{ fontSize: 10.5, border: "none", background: "none", cursor: "pointer", padding: 0 }}>p.{h.page_number} →</button>
                  <button type="button" className="btn ghost sm icon" aria-label="Delete highlight" onClick={() => delHl(h)}><Icon n="trash" s={13} /></button></div>
                <p className="ut" dir="auto" style={{ fontSize: fs - 1 }}>“{h.selected_text}”</p>
                {h.note && <p className="faint ut" dir="auto" style={{ fontSize: 12, marginTop: 4 }}>{h.note}</p>}
              </div>
            )) : <p className="faint" style={{ fontSize: 13 }}>Select text on the page, then tap Highlight.</p>)}
          </div>
          {tab === "notes" && (
            <div className="bn-compose">
              <span className="bn-pg mono">p.{pg}</span>
              <textarea dir="auto" aria-label={`New note for page ${pg}`} placeholder="Write in the margin…" value={txt} rows={2} onChange={e => setTxt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addNote(); } }} style={{ fontSize: fs }} />
              <div className="row sb"><span className="mono faint" style={{ fontSize: 10.5 }}>⌘↵ to save</span>
                <button type="button" className="btn primary sm" disabled={!txt.trim() || busy} onClick={addNote}><Icon n="check" s={13} w={2.6} />Save note</button></div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

/* A page note as a margin card: ribbon (red when favourite), number, age, save state; long notes fold with a fade.
   v1 notes hold simple HTML (bold, tables), so the body stays HTML: set once, saved on input. */
function PageNote({ n, i, pg, size, state, onChange, onFav, onDel }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false), [long, setLong] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = DOMPurify.sanitize(String(n.content || ""), { FORBID_ATTR: ["style", "class"], FORBID_TAGS: ["button", "fieldset", "input", "form"] });
    setLong(el.scrollHeight > 230);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fav = !!n.is_favourite;
  return (
    <article className={"bn" + (fav ? " fav" : "") + (long && !open ? " folded" : "")}>
      <header className="bn-h">
        <span className="bn-no mono">{String(i + 1).padStart(2, "0")}</span>
        <span className="mono faint bn-meta">p.{pg}{n.updated_at || n.created_at ? " · " + ago(n.updated_at || n.created_at) : ""}</span>
        {state && <span className={"bn-state mono" + (state === "saved" ? " ok" : "")}>{state === "saved" ? "saved" : "saving…"}</span>}
        <span className="grow" />
        <button type="button" className="btn ghost sm icon" aria-label={fav ? "Remove from favourites" : "Add to favourites"} aria-pressed={fav} onClick={onFav} style={{ color: fav ? "var(--red)" : undefined }}><Icon n="heart" s={14} fill={fav ? "currentColor" : undefined} /></button>
        <button type="button" className="btn ghost sm icon" aria-label="Delete note" onClick={onDel}><Icon n="trash" s={14} /></button>
      </header>
      <div ref={ref} className="bn-body ut" dir="auto" role="textbox" aria-multiline="true" aria-label={`Note ${i + 1} on page ${pg}`} contentEditable suppressContentEditableWarning
        onFocus={() => setOpen(true)}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); document.execCommand("bold"); onChange(e.currentTarget.innerHTML); } }}
        style={{ fontSize: size }} />
      {long && <button type="button" className="bn-more" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? "Show less" : "Read more"}<Icon n="up" s={12} /></button>}
    </article>
  );
}

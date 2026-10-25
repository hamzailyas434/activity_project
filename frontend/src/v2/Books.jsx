import { Empty, Icon, Skeleton, TONES, TONE_HEX } from "../components/ui";
import { useShelf } from "../lib/books";
import { BookNotes, Goal, Reader, Upload } from "../screens/Books";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 07 Books — "currently reading" hero, cover grid, book notes; the full-screen Reader is shared with v3 */
const toneOf = b => TONES[(b.id || 0) % 5];
const pctOf = b => (b.total_pages ? Math.min(1, (b.current_page || 1) / b.total_pages) : 0);

function Cover({ b, w }) {
  const tone = toneOf(b);
  return (
    <div style={{ width: w, aspectRatio: ".68", background: b.cover_data ? `center/cover url(${b.cover_data})` : TONE_HEX[tone], borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", color: tone === "gold" ? "#111" : "#fff", boxShadow: "0 18px 30px -18px rgba(0,0,0,.8)", position: "relative", overflow: "hidden" }}>
      {!b.cover_data && <>
        <span className="mono" style={{ fontSize: 9, letterSpacing: ".16em", opacity: 0.75 }}>{String(b.author || b.format || "").toUpperCase()}</span>
        <span className="disp" dir="auto" style={{ fontSize: typeof w === "number" ? w * 0.18 : 24, lineHeight: 0.9, overflowWrap: "anywhere" }}>{b.title}</span>
      </>}
      <i style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.25)" }} />
    </div>
  );
}

export default function Books({ sub }) {
  const { api, books, summary, up, setUp, goal, setGoal, list, today, target, cur, openId, openPg, reading } = useShelf(sub);
  if (openId && books.loading && !list.length) return <div className="boot" aria-busy="true"><i /></div>;
  if (reading) return <Reader key={`${reading.id}-${openPg || ""}`} b={reading} start={openPg} onClose={() => go("books")}
    onProgress={(id, page, total) => { books.setData(l => l.map(x => (x.id === id ? { ...x, current_page: page, total_pages: total || x.total_pages, last_read_date: new Date().toISOString() } : x))); summary.reload(); }}
    onCover={(id, cover) => books.setData(l => l.map(x => (x.id === id ? { ...x, cover_data: cover } : x)))} />;
  const pages = list.reduce((a, b) => a + (b.total_pages || 0), 0);

  return (
    <>
      <PageHead idx="07" meta={`${list.length} books · ${pages.toLocaleString()} pages`} title={<>The <em>library</em></>} sub="Read, mark pages, and keep notes beside the text.">
        <button type="button" className="btn" onClick={() => setGoal(true)}>Daily goal · {target}p</button>
        <button type="button" className="btn primary" onClick={() => setUp(true)}><Icon n="upload" />Upload book</button>
      </PageHead>
      {openId && !reading && !books.loading && <div style={{ marginBottom: 14 }}><Empty title="Book not found" body="It may have been deleted." action={<button type="button" className="btn primary" onClick={() => go("books")}>Back to the library</button>} /></div>}

      {books.loading && !list.length ? <Skeleton tiles={[["s12", 220], ["s12", 300]]} />
        : !list.length ? <Empty title="Library is empty" body="Upload a PDF or EPUB to start reading." action={<button type="button" className="btn primary" onClick={() => setUp(true)}>Upload</button>} />
          : <>
            <section className="card bk-hero" style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 28, alignItems: "center", marginBottom: 28, padding: 28 }}>
              <Cover b={cur} w={120} />
              <div style={{ minWidth: 0 }}>
                <div className="label">Currently reading</div>
                <h2 className="disp ut" dir="auto" style={{ fontSize: "clamp(40px,5vw,68px)", margin: "8px 0" }}>{cur.title}</h2>
                {cur.author && <div className="muted" dir="auto">{cur.author}</div>}
                <div className="row" style={{ marginTop: 16, gap: 14, maxWidth: 420 }}><div className="bar" style={{ flex: 1 }}><i style={{ width: pctOf(cur) * 100 + "%" }} /></div><span className="mono" style={{ fontSize: 12 }}>p.{cur.current_page || 1}{cur.total_pages ? "/" + cur.total_pages : ""}</span></div>
                <div className="mono muted" style={{ fontSize: 11.5, marginTop: 10 }}>Today {today}/{target} pages</div>
              </div>
              <button type="button" className="btn primary" onClick={() => go("books/" + cur.id)}>Continue<Icon n="arrow" /></button>
            </section>
            <div className="label" style={{ marginBottom: 14 }}>All books</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 22 }}>{list.map(b => (
              <button type="button" key={b.id} onClick={() => go("books/" + b.id)} style={{ textAlign: "left", border: "none", background: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                <Cover b={b} w="100%" />
                <b className="ut" dir="auto" style={{ display: "block", marginTop: 12 }}>{b.title}</b>
                <span className="muted" style={{ fontSize: 12 }}>{b.format === "epub" ? "EPUB" : "PDF"}{b.author ? ` · ${b.author}` : ""}</span>
                <div className="bar" style={{ marginTop: 8, height: 3 }}><i style={{ width: pctOf(b) * 100 + "%" }} /></div>
                <span className="mono muted" style={{ fontSize: 11 }}>{Math.round(pctOf(b) * 100)}%</span>
              </button>
            ))}</div>
            <div style={{ marginTop: 28 }}><BookNotes api={api} books={list} /></div>
          </>}

      {up && <Upload onClose={() => setUp(false)} onDone={id => { books.reload(); go("books/" + id); }} />}
      {goal && <Goal value={target} onClose={() => setGoal(false)} onSaved={v => summary.setData(s => ({ ...(s || {}), daily_pages_goal: v }))} />}
    </>
  );
}

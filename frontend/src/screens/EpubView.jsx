import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import { url } from "../lib/api";

/*
  EPUB page for the Reader. EPUBs have no fixed pages, so the text is split into
  locations of CHARS characters and each location is a "page": page notes, bookmarks,
  progress and the daily goal then work exactly like PDFs. Locations are cached per
  book in localStorage because generating them walks the whole book.
*/
const CHARS = 1500;

export default function EpubView({ id, token, pg, width, zoom, coverDone, onPages, onMoved, onSelect, onCover, onError }) {
  const host = useRef(null);
  const st = useRef({ book: null, rend: null, shown: 0 });
  const cb = useRef({});
  cb.current = { onPages, onMoved, onSelect, onCover, onError, coverDone };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch(url(`/books/${id}/file`), { headers: { Authorization: `Bearer ${token}` }, credentials: "include" });
        if (!res.ok) throw new Error("file");
        const buf = await res.arrayBuffer();
        if (dead) return;
        const book = ePub(buf);
        st.current.book = book;
        await book.ready;
        const key = `epub-loc-${id}-${CHARS}`;
        let saved = null;
        try { saved = localStorage.getItem(key); } catch { /* storage optional */ }
        if (saved) book.locations.load(saved);
        else {
          await book.locations.generate(CHARS);
          try { localStorage.setItem(key, book.locations.save()); } catch { /* storage optional */ }
        }
        if (dead) return;
        cb.current.onPages(Math.max(1, book.locations.length()));

        const rend = book.renderTo(host.current, { width: "100%", height: "100%", flow: "scrolled-doc", allowScriptedContent: false });
        rend.themes.default({
          body: { "font-family": "Georgia, 'Times New Roman', serif !important", "line-height": "1.7 !important", color: "#1C1A17 !important", background: "#FBF8F1 !important", padding: "8px 28px !important" },
          "p": { "margin": "0 0 .9em !important" },
          "img": { "max-width": "100% !important", height: "auto !important" },
          "::selection": { background: "rgba(233,180,76,.45)" },
        });
        // follow manual scrolling inside the chapter so the page number (and its notes) stay in step
        rend.on("relocated", loc => {
          if (st.current.busy) return; // our own display() — the page already knows where it is
          const n = book.locations.locationFromCfi(loc.start.cfi) + 1;
          if (n > 0 && n !== st.current.shown) { st.current.shown = n; cb.current.onMoved(n); }
        });
        rend.on("selected", (cfi, contents) => cb.current.onSelect(String(contents.window.getSelection() || "").trim()));
        st.current.rend = rend;
        setReady(true);

        if (!cb.current.coverDone) {
          const cu = await book.coverUrl().catch(() => null);
          if (cu && !dead) {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas"), r = Math.min(1, 300 / img.width);
              c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
              c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
              cb.current.onCover(c.toDataURL("image/jpeg", 0.7));
            };
            img.src = cu;
          }
        }
      } catch {
        if (!dead) cb.current.onError();
      }
    })();
    return () => { dead = true; st.current.book?.destroy(); st.current = { book: null, rend: null, shown: 0 }; };
  }, [id, token]);

  useEffect(() => {
    const { book, rend } = st.current;
    if (!ready || !rend || st.current.shown === pg) return;
    st.current.shown = pg;
    st.current.busy = true;
    rend.display(book.locations.cfiFromLocation(pg - 1)).finally(() => setTimeout(() => { st.current.busy = false; }, 400));
  }, [pg, ready]);

  useEffect(() => { if (ready) st.current.rend?.themes.fontSize(`${zoom}%`); }, [zoom, ready]);

  return (
    <div style={{ position: "relative", height: Math.round(Math.min(width * 1.35, window.innerHeight - 200)), background: "#FBF8F1" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      {!ready && <div className="skel" style={{ position: "absolute", inset: 0, borderRadius: 0, display: "grid", placeItems: "center" }}><span className="mono faint" style={{ fontSize: 12 }}>Preparing pages…</span></div>}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

const SANITIZE = { FORBID_ATTR: ["style"], FORBID_TAGS: ["font", "iframe", "object", "embed", "script"], ADD_ATTR: ["target"] };
const sanitize = html => DOMPurify.sanitize(String(html || ""), SANITIZE);

/* Legacy answers may be plain text: keep their line breaks. */
const toHtml = v => (/<[a-z][\s\S]*>/i.test(String(v || "")) ? String(v) : String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"));

/* Read-only rich answer. Links open in a new tab. */
export function RichView({ html, style }) {
  const clean = sanitize(toHtml(html)).replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
  return <div className="rt ut" dir="auto" style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}

/*
  Rich answer editor: HTML in / out (same storage as v1's RichTextEditor), wearing the v3 .rt-bar toolbar.
  Bold · Underline · Heading · bullet list · numbered list · Link.
*/
export function RichEditor({ value, onChange, placeholder = "Answer, link, page reference…", label = "Answer" }) {
  const ref = useRef(null);
  const [link, setLink] = useState(null); // { url, range } while the link field is open
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== toHtml(value)) el.innerHTML = sanitize(toHtml(value));
  }, [value]);
  const emit = () => ref.current && onChange(ref.current.innerHTML);
  const exec = (cmd, arg = null) => { ref.current?.focus(); document.execCommand(cmd, false, arg); emit(); };
  const startLink = () => {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    setLink({ url: "https://", range });
  };
  const applyLink = () => {
    const url = link.url.trim();
    if (url && url !== "https://") {
      ref.current?.focus();
      const sel = window.getSelection();
      if (link.range) { sel.removeAllRanges(); sel.addRange(link.range); }
      if (sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}">${url.replace(/</g, "&lt;")}</a>`);
      else document.execCommand("createLink", false, url);
      emit();
    }
    setLink(null);
  };
  const B = [["B", "Bold", "bold", { fontWeight: 800 }], ["U", "Underline", "underline", { textDecoration: "underline" }],
    ["H", "Heading", "formatBlock", { fontFamily: "var(--font-display)" }], ["•", "Bullet list", "insertUnorderedList"],
    ["1.", "Numbered list", "insertOrderedList"], ["Link", "Link", "link"]];
  const run = cmd => (cmd === "link" ? startLink() : cmd === "formatBlock" ? exec(cmd, "h3") : exec(cmd));
  return (
    <div className="rte">
      <div className="rt-bar" role="toolbar" aria-label="Formatting">
        {B.map(([l, t, cmd, st]) => <button key={t} type="button" title={t} aria-label={t} style={st} onMouseDown={e => { e.preventDefault(); run(cmd); }}>{l}</button>)}
        {link && (
          <span className="row" style={{ gap: 4, flex: "1 1 200px" }}>
            <input className="input" autoFocus aria-label="Link URL" value={link.url} onChange={e => setLink({ ...link, url: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { e.stopPropagation(); setLink(null); } }}
              style={{ height: 30, borderRadius: 8, fontSize: 12, padding: "0 10px" }} />
            <button type="button" onClick={applyLink}>Add</button>
          </span>
        )}
      </div>
      <div ref={ref} className="ProseMirror" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} dir="auto"
        data-placeholder={placeholder} onInput={emit} onBlur={emit} />
    </div>
  );
}

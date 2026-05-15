import { useRef, useEffect } from "react";

const IcoList = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
  </svg>
);
const IcoLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/>
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>
  </svg>
);

function RichTextEditor({ value, onChange, placeholder = "Enter text…" }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt("Enter link URL:");
    if (url) exec("createLink", url);
  };

  return (
    <>
      <div className="editor-toolbar">
        <button type="button" className="tb-btn" onClick={() => exec("bold")} title="Bold" style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>B</button>
        <button type="button" className="tb-btn" onClick={() => exec("italic")} title="Italic" style={{ fontStyle: "italic" }}>I</button>
        <button type="button" className="tb-btn" onClick={() => exec("underline")} title="Underline" style={{ textDecoration: "underline" }}>U</button>
        <div className="tb-sep" />
        <button type="button" className="tb-btn" onClick={() => exec("formatBlock", "h2")} title="Heading" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>H</button>
        <button type="button" className="tb-btn" onClick={() => exec("insertUnorderedList")} title="Bullet list"><IcoList /></button>
        <button type="button" className="tb-btn" onClick={() => exec("insertOrderedList")} title="Numbered list" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>1.</button>
        <div className="tb-sep" />
        <button type="button" className="tb-btn" onClick={insertLink} title="Insert link"><IcoLink /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="answer-body"
        onInput={handleInput}
        onClick={e => e.stopPropagation()}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </>
  );
}

export default RichTextEditor;

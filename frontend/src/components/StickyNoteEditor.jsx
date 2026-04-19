import { useRef, useEffect, useState, useCallback } from "react";

// ── Toolbar config ────────────────────────────────────────────────────────────
const TEXT_FORMATS = [
  { cmd: "bold",          label: "B",  title: "Bold (Ctrl+B)",      style: { fontWeight: 700 } },
  { cmd: "italic",        label: "I",  title: "Italic (Ctrl+I)",    style: { fontStyle: "italic" } },
  { cmd: "underline",     label: "U",  title: "Underline (Ctrl+U)", style: { textDecoration: "underline" } },
  { cmd: "strikeThrough", label: "S̶",  title: "Strikethrough",      style: { textDecoration: "line-through" } },
];
const LIST_FORMATS = [
  { cmd: "insertUnorderedList", label: "• —", title: "Bullet list" },
  { cmd: "insertOrderedList",   label: "1.",   title: "Numbered list" },
];
const INDENT_FORMATS = [
  { cmd: "indent",  label: "→", title: "Indent" },
  { cmd: "outdent", label: "←", title: "Outdent" },
];
const ALIGN_FORMATS = [
  { cmd: "justifyLeft",   label: "⫷", title: "Align left" },
  { cmd: "justifyCenter", label: "☰", title: "Align center" },
  { cmd: "justifyRight",  label: "⫸", title: "Align right" },
];
const FONT_SIZES = [
  { label: "S",  value: "2", title: "Small" },
  { label: "M",  value: "3", title: "Medium" },
  { label: "L",  value: "4", title: "Large" },
  { label: "XL", value: "5", title: "Extra Large" },
];

// ── Shared button class ───────────────────────────────────────────────────────
const btnBase =
  "min-w-[24px] h-[22px] px-1 border border-transparent bg-transparent " +
  "cursor-pointer rounded text-[0.72rem] text-ink transition-all duration-100 " +
  "flex items-center justify-center leading-none whitespace-nowrap font-[inherit] " +
  "hover:bg-black/10 hover:border-black/[0.12]";
const btnActive = "bg-black/[0.14] !border-black/20 text-primary";

// ── Component ─────────────────────────────────────────────────────────────────
export default function StickyNoteEditor({ value, onChange, noteId }) {
  const divRef     = useRef(null);
  const editingRef = useRef(false);
  const dragState  = useRef(null);   // { startY, startH }
  const [activeFormats, setActiveFormats] = useState({});
  const [toolbarOpen, setToolbarOpen]     = useState(false);
  const [editorH, setEditorH] = useState(() => {
    const saved = localStorage.getItem(`sne-h-${noteId}`);
    return saved ? parseInt(saved, 10) : 90;
  });

  useEffect(() => {
    if (divRef.current) divRef.current.innerHTML = value || "";
  }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshActiveFormats = () => {
    setActiveFormats({
      bold:                document.queryCommandState("bold"),
      italic:              document.queryCommandState("italic"),
      underline:           document.queryCommandState("underline"),
      strikeThrough:       document.queryCommandState("strikeThrough"),
      justifyLeft:         document.queryCommandState("justifyLeft"),
      justifyCenter:       document.queryCommandState("justifyCenter"),
      justifyRight:        document.queryCommandState("justifyRight"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList:   document.queryCommandState("insertOrderedList"),
    });
  };

  const handleInput = () => {
    editingRef.current = true;
    onChange(divRef.current.innerHTML);
    refreshActiveFormats();
    setTimeout(() => { editingRef.current = false; }, 200);
  };

  const applyFormat = (cmd, val = null) => {
    divRef.current?.focus();
    document.execCommand(cmd, false, val);
    onChange(divRef.current.innerHTML);
    refreshActiveFormats();
  };

  // ── Resize handle ─────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    dragState.current = { startY: e.clientY, startH: editorH };

    const onMove = (ev) => {
      const delta = ev.clientY - dragState.current.startY;
      const newH = Math.max(50, dragState.current.startH + delta);
      setEditorH(newH);
      localStorage.setItem(`sne-h-${noteId}`, newH);
    };
    const onUp = () => {
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editorH]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-lg">

      {/* ── Toggle strip ── */}
      <button
        className={`flex items-center gap-1 w-full px-[7px] py-[3px] border-none cursor-pointer text-left font-[inherit] transition-[background] duration-150 ${
          toolbarOpen
            ? "bg-black/[0.07] border-b border-black/[0.09]"
            : "bg-black/[0.04] border-b border-black/[0.07] hover:bg-black/[0.08]"
        }`}
        onMouseDown={e => { e.preventDefault(); setToolbarOpen(v => !v); }}
        title={toolbarOpen ? "Hide formatting" : "Show formatting"}
      >
        <span className="text-[0.55rem] text-ink-muted leading-none">
          {toolbarOpen ? "▲" : "▼"}
        </span>
        <span className="text-[0.65rem] font-semibold text-ink-muted tracking-[0.04em] uppercase">
          Format
        </span>
      </button>

      {/* ── Toolbar ── */}
      {toolbarOpen && (
        <div className="flex items-center flex-wrap gap-0.5 px-[5px] py-1 bg-black/[0.06] border-b border-black/[0.09] shrink-0 select-none">
          <div className="flex items-center gap-px">
            {TEXT_FORMATS.map(({ cmd, label, title, style }) => (
              <button key={cmd}
                className={`${btnBase} ${activeFormats[cmd] ? btnActive : ""}`}
                style={style} title={title}
                onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-black/15 mx-[3px] shrink-0" />
          <div className="flex items-center gap-px">
            {LIST_FORMATS.map(({ cmd, label, title }) => (
              <button key={cmd}
                className={`${btnBase} ${activeFormats[cmd] ? btnActive : ""}`}
                title={title}
                onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-black/15 mx-[3px] shrink-0" />
          <div className="flex items-center gap-px">
            {INDENT_FORMATS.map(({ cmd, label, title }) => (
              <button key={cmd} className={btnBase} title={title}
                onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-black/15 mx-[3px] shrink-0" />
          <div className="flex items-center gap-px">
            {ALIGN_FORMATS.map(({ cmd, label, title }) => (
              <button key={cmd}
                className={`${btnBase} ${activeFormats[cmd] ? btnActive : ""}`}
                title={title}
                onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-black/15 mx-[3px] shrink-0" />
          <div className="flex items-center gap-px">
            {FONT_SIZES.map(({ label, value, title }) => (
              <button key={value}
                className={`${btnBase} text-[0.65rem] font-bold min-w-[20px]`}
                title={title}
                onMouseDown={e => { e.preventDefault(); applyFormat("fontSize", value); }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Editable content ── */}
      <div
        ref={divRef}
        className="sne-content px-[9px] py-[7px] text-[0.83rem] leading-[1.55] text-ink outline-none break-words overflow-y-auto font-[inherit] bg-transparent thin-scroll"
        style={{ height: editorH, minHeight: 50 }}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={refreshActiveFormats}
        onMouseUp={refreshActiveFormats}
        data-placeholder="Write something…"
        spellCheck={false}
      />

      {/* ── Resize handle ── */}
      <div
        onMouseDown={onResizeMouseDown}
        className="flex items-center justify-center h-[10px] w-full cursor-ns-resize select-none shrink-0 group/handle"
        title="Drag to resize"
      >
        <div className="w-8 h-[3px] rounded-full bg-black/10 group-hover/handle:bg-black/25 transition-colors duration-150" />
      </div>
    </div>
  );
}

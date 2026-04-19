import { useState, useRef, useEffect } from "react";

function RichTextEditor({ value, onChange, placeholder = "Enter text..." }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt("Enter link URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="toolbar-btn"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="toolbar-btn"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="toolbar-btn"
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "h2")}
          className="toolbar-btn"
          title="Heading"
        >
          H
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="toolbar-btn"
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="toolbar-btn"
          title="Numbered List"
        >
          1.
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          onClick={insertLink}
          className="toolbar-btn"
          title="Insert Link"
        >
          🔗
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="toolbar-btn"
          title="Remove Formatting"
        >
          ✂️
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className={`rich-text-content ${isFocused ? "focused" : ""}`}
        onInput={handleInput}
        onFocus={(e) => {
          setIsFocused(true);
          e.stopPropagation();
        }}
        onBlur={() => setIsFocused(false)}
        onClick={(e) => e.stopPropagation()}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

export default RichTextEditor;

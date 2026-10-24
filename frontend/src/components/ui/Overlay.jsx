import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

/* Overlays stack: Esc and body-scroll lock only act on the top-most one (Confirm over a Modal, etc.). */
const stack = [];
function useOverlay(onClose) {
  const id = useId();
  const cb = useRef(onClose);
  useEffect(() => { cb.current = onClose; });
  useEffect(() => {
    stack.push(id);
    const h = e => { if (e.key === "Escape" && stack[stack.length - 1] === id) { e.stopPropagation(); cb.current?.(); } };
    window.addEventListener("keydown", h);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      const i = stack.indexOf(id); if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.body.style.overflow = o;
    };
  }, [id]);
}

export function Modal({ kicker, title, children, foot, onClose, size = "", lead, label }) {
  useOverlay(onClose);
  return (
    <div className="scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={"modal " + size} role="dialog" aria-modal="true" aria-label={label || (typeof title === "string" ? title : undefined)}>
        <div className="m-h">{lead}<div style={{ flex: 1, minWidth: 0 }}>{kicker && <div className="k">{kicker}</div>}<h2 className="ut">{title}</h2></div>
          <button type="button" className="btn sm icon ghost" aria-label="Close" onClick={onClose}><Icon n="x" /></button></div>
        <div className="m-b">{children}</div>
        {foot && <div className="m-f">{foot}</div>}
      </div>
    </div>
  );
}

export function Drawer({ kicker, title, children, foot, onClose, lead, label }) {
  useOverlay(onClose);
  return (
    <>
      <div className="scrim" style={{ placeItems: "unset" }} onMouseDown={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={label || (typeof title === "string" ? title : undefined)}>
        <div className="m-h">{lead}<div style={{ flex: 1, minWidth: 0 }}>{kicker && <div className="k">{kicker}</div>}<h2 className="ut">{title}</h2></div>
          <button type="button" className="btn sm icon ghost" aria-label="Close" onClick={onClose}><Icon n="x" /></button></div>
        <div className="m-b" style={{ flex: 1 }}>{children}</div>
        {foot && <div className="m-f">{foot}</div>}
      </aside>
    </>
  );
}

/* Bare overlay for custom dialogs (Cell notes, ⌘K) that still need the Esc stack. */
export function Scrim({ onClose, children, style }) {
  useOverlay(onClose);
  return <div className="scrim" style={style} onMouseDown={e => e.target === e.currentTarget && onClose()}>{children}</div>;
}

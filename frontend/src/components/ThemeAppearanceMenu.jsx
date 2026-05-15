import { useState, useEffect, useRef } from "react";
import { Icon } from "./rhythm/RhythmAtoms";

const FAMILY_OPTIONS = [
  { id: "fog", label: "Fog", hint: "Monochrome neutrals" },
  { id: "teal", label: "Teal", hint: "Teal-Slate (default)" },
  { id: "iris", label: "Iris", hint: "Reflective purple" },
];

/**
 * Fog / Teal / Iris + Light / Dark — same chrome as App topbar.
 */
export default function ThemeAppearanceMenu({
  theme,
  setTheme,
  colorFamily,
  setColorFamily,
  buttonClassName,
  iconSize = 16,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={buttonClassName}
        title="Appearance — Rhythm design tokens"
        aria-label="Theme"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        {theme === "dark" ? <Icon name="sun" size={iconSize} /> : <Icon name="moon" size={iconSize} />}
      </button>
      {open ? (
        <div className="theme-menu-popover" role="dialog" aria-label="Appearance">
          <div className="theme-menu-section">
            <div className="eyebrow">Color family</div>
            <p className="theme-menu-desc">
              Which primitive drives links and buttons (from{" "}
              <code className="theme-menu-code">colors_and_type.css</code>
              ). Surfaces stay Fog &amp; Ink; only the accent lane changes.
            </p>
            <div className="theme-menu-family-grid" role="radiogroup" aria-label="Accent color family">
              {FAMILY_OPTIONS.map(({ id, label, hint }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={colorFamily === id}
                  className={`theme-menu-family-chip${colorFamily === id ? " is-active" : ""}`}
                  onClick={() => setColorFamily(id)}
                >
                  <span className={`theme-menu-family-swatch theme-menu-family-swatch--${id}`} aria-hidden />
                  <span className="theme-menu-family-chip-text">
                    <span className="theme-menu-family-chip-title">{label}</span>
                    <span className="theme-menu-family-chip-hint">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="theme-menu-section theme-menu-section--mode">
            <div className="eyebrow">Mode</div>
            <p className="theme-menu-desc">Light or dark canvas for the family you chose.</p>
            <div className="theme-menu-mode-row" role="radiogroup" aria-label="Light or dark mode">
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                className={`theme-menu-option theme-menu-option--compact${theme === "light" ? " is-active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <span
                  className={`theme-menu-option-preview theme-menu-option-preview--light theme-menu-preview-family-${colorFamily}`}
                  aria-hidden
                />
                <span className="theme-menu-option-text">
                  <span className="theme-menu-option-title">Light</span>
                  <span className="theme-menu-option-sub">Semantic LIGHT</span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                className={`theme-menu-option theme-menu-option--compact${theme === "dark" ? " is-active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <span
                  className={`theme-menu-option-preview theme-menu-option-preview--dark theme-menu-preview-family-${colorFamily}`}
                  aria-hidden
                />
                <span className="theme-menu-option-text">
                  <span className="theme-menu-option-title">Dark</span>
                  <span className="theme-menu-option-sub">Semantic DARK</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* v2 page heading: "01 — meta" line, display title (em = red), sub, actions on the right */
export default function PageHead({ idx, meta, title, sub, children }) {
  return (
    <header className="ph">
      <div>
        <div className="ph-idx"><span className="ph-n"><b>{idx}</b> —</span><span className="ph-m">{meta}</span></div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </header>
  );
}

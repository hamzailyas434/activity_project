import { useEffect, useState } from "react";

/* Which UI the signed-in app uses: "v3" (Orbit, default) or "v2" (Ink sidebar). Per device, like the theme.
   v2.css only applies under html[data-design="v2"], so sign-in and the landing page always stay v3. */
export function useDesign(active) {
  const [design, setDesign] = useState(() => { try { return localStorage.getItem("design") === "v2" ? "v2" : "v3"; } catch { return "v3"; } });
  useEffect(() => {
    try { localStorage.setItem("design", design); } catch { /* storage optional */ }
    const el = document.documentElement;
    if (active && design === "v2") el.setAttribute("data-design", "v2");
    else el.removeAttribute("data-design");
  }, [design, active]);
  return { design, setDesign };
}

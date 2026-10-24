import { useState, useEffect } from "react";

/* Ink (dark) is the default; Paper (light) is chosen in Profile → Appearance. Same localStorage('theme') key as v1. */
export function useTheme() {
  const [theme, setTheme] = useState(() => (localStorage.getItem("theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    const light = theme === "light";
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = light ? "/rhythm-logo-light.svg" : "/rhythm-logo-dark.svg";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#F4F0E8" : "#08080A");
  }, [theme]);

  return { theme, setTheme };
}

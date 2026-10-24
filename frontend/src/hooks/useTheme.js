import { useState, useEffect } from "react";

/* Ink (dark) is the default; Paper (light) is chosen in Profile → Appearance. Same localStorage('theme') key as v1. */
export function useTheme() {
  const [theme, setTheme] = useState(() => (localStorage.getItem("theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

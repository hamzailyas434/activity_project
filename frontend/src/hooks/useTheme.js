import { useState, useEffect } from "react";

const COLOR_FAMILY_IDS = ["fog", "teal", "iris"];

function readStoredColorFamily() {
  const s = localStorage.getItem("colorFamily");
  return COLOR_FAMILY_IDS.includes(s) ? s : "teal";
}

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [colorFamily, setColorFamily] = useState(readStoredColorFamily);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-color-family", colorFamily);
    localStorage.setItem("theme", theme);
    localStorage.setItem("colorFamily", colorFamily);
  }, [theme, colorFamily]);

  return { theme, setTheme, colorFamily, setColorFamily };
}

import { useEffect, useState } from "preact/hooks";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored === "dark" ? "dark" : "light") as Theme;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setDarkTheme = () => setTheme("dark");
  const setLightTheme = () => setTheme("light");

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
    setDarkTheme,
    setLightTheme,
  };
}

import { useEffect, useState } from "preact/hooks";

export const THEMES = ["light", "dark", "rose-pine", "remofer"] as const;

export type Theme = (typeof THEMES)[number];

const customThemes = new Set(["rose-pine", "remofer"]);

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => {
		const stored = localStorage.getItem("theme");
		return (stored as Theme) || "light";
	});

	useEffect(() => {
		const root = document.documentElement;

		// Remove all theme classes and data attributes
		root.classList.remove("dark");
		delete root.dataset.theme;

		// Apply the appropriate theme
		if (customThemes.has(theme)) {
			root.dataset.theme = theme;
		} else if (theme === "dark") {
			root.classList.add("dark");
		}

		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	};

	return {
		theme,
		isDark: theme === "dark",
		isCustomTheme: customThemes.has(theme),
		toggleTheme,
		setTheme,
	};
}

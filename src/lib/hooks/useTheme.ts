import { useEffect, useState } from "preact/hooks";

type Theme = "light" | "dark" | "rose-pine";

const customThemes = new Set(["rose-pine"]);

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

	const setDarkTheme = () => setTheme("dark");
	const setLightTheme = () => setTheme("light");
	const setRosePineTheme = () => setTheme("rose-pine");

	return {
		theme,
		isDark: theme === "dark",
		isCustomTheme: customThemes.has(theme),
		toggleTheme,
		setTheme,
		setDarkTheme,
		setLightTheme,
		setRosePineTheme,
	};
}

import type { FontSizeScale } from "@/types";

export type ThemeMode = "dark" | "light";

const THEME_COLORS: Record<ThemeMode, string> = {
  dark: "#0b0f19",
  light: "#f3f5f9",
};

/** Root font-size multipliers. Everything in the UI is rem based, so this
 *  scales text, spacing, icons and touch targets together (like browser zoom). */
const FONT_SCALE: Record<FontSizeScale, string> = {
  normal: "100%",
  large: "108%",
  xlarge: "116%",
};

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[mode];
  try {
    localStorage.setItem("fastpos:theme", mode);
  } catch {
    // ignore
  }
}

export function applyFontScale(size: FontSizeScale) {
  document.documentElement.style.fontSize = FONT_SCALE[size] || "100%";
}

/** Best-effort theme before React mounts (avoids a flash of the wrong theme). */
export function preloadTheme(): ThemeMode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("fastpos:theme");
  } catch {
    // ignore
  }
  const mode: ThemeMode = stored === "light" ? "light" : "dark";
  applyTheme(mode);
  return mode;
}

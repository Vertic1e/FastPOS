"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "normal" | "large" | "xl";

type FontContextType = {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  cycleFontSize: () => void;
};

const FontContext = createContext<FontContextType>({
  fontSize: "normal",
  setFontSize: () => {},
  cycleFontSize: () => {},
});

const STORAGE_KEY = "bl_font_size";

export function FontProvider({
  initialSize = "normal",
  children,
}: {
  initialSize?: FontSize;
  children: ReactNode;
}) {
  const [fontSize, setFontSizeState] = useState<FontSize>(initialSize);

  useEffect(() => {
    // Check local storage for station/terminal override
    const stored = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    if (stored && ["normal", "large", "xl"].includes(stored)) {
      setFontSizeState(stored);
      applyFontSize(stored);
    } else {
      applyFontSize(initialSize);
    }
  }, [initialSize]);

  function applyFontSize(size: FontSize) {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-font-size", size);
      document.body.setAttribute("data-font-size", size);
    }
  }

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(STORAGE_KEY, size);
    applyFontSize(size);
  };

  const cycleFontSize = () => {
    const next: Record<FontSize, FontSize> = {
      normal: "large",
      large: "xl",
      xl: "normal",
    };
    setFontSize(next[fontSize] ?? "normal");
  };

  return (
    <FontContext.Provider value={{ fontSize, setFontSize, cycleFontSize }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontContext);
}

"use client";

import { Type } from "lucide-react";
import { useFontSize, type FontSize } from "@/components/font-provider";

export function FontSizeToggle({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "button";
  className?: string;
}) {
  const { fontSize, setFontSize, cycleFontSize } = useFontSize();

  if (variant === "button") {
    const labels: Record<FontSize, string> = {
      normal: "Standard",
      large: "Large",
      xl: "Extra Large",
    };
    return (
      <button
        onClick={cycleFontSize}
        type="button"
        title={`Current text size: ${labels[fontSize]}. Click to enlarge.`}
        className={`flex items-center gap-1.5 rounded-xl border border-line bg-white/80 px-2.5 py-1.5 text-[12px] font-semibold text-ink transition-all hover:border-ink/20 active:scale-95 ${className}`}
      >
        <Type size={14} className="text-ink/60" />
        <span>{labels[fontSize]}</span>
        <span className="rounded bg-ink/5 px-1 py-0.2 text-[10px] font-bold text-ink/50 uppercase">
          {fontSize === "normal" ? "1x" : fontSize === "large" ? "1.15x" : "1.3x"}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-line bg-white/90 p-0.5 shadow-xs ${className}`}
      role="group"
      aria-label="Text size selector"
    >
      {(
        [
          { key: "normal", label: "A", title: "Standard size (100%)" },
          { key: "large", label: "A+", title: "Large size (+15%)" },
          { key: "xl", label: "A++", title: "Extra Large (+30%)" },
        ] as const
      ).map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.title}
          onClick={() => setFontSize(item.key)}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
            fontSize === item.key
              ? "bg-ink text-white shadow-xs"
              : "text-ink/50 hover:text-ink hover:bg-ink/5"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Shorter label used on very narrow screens. */
  shortLabel?: React.ReactNode;
  tone?: "brand" | "success" | "danger" | "warning" | "neutral";
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /**
   * Stretch options equally to fill the container.
   * `"mobile"` stretches only below the `sm` breakpoint and hugs content on wider screens.
   */
  fullWidth?: boolean | "mobile";
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

const toneSelected: Record<NonNullable<SegmentedOption<string>["tone"]>, string> = {
  brand: "bg-brand text-white shadow-sm",
  success: "bg-emerald-600 text-white shadow-sm",
  danger: "bg-rose-600 text-white shadow-sm",
  warning: "bg-amber-500 text-slate-950 shadow-sm",
  neutral: "bg-surface text-fg shadow-sm border border-line-strong",
};

/** Tab-like control for switching between a few mutually-exclusive filters. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  fullWidth,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  const sizeCls =
    size === "sm"
      ? "h-9 px-3 text-xs"
      : size === "lg"
        ? "h-12 px-4 text-sm"
        : "h-10 px-3.5 text-sm";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full gap-1 rounded-xl border border-line bg-surface-2 p-1",
        fullWidth === true && "flex w-full",
        fullWidth === "mobile" && "flex w-full sm:inline-flex sm:w-auto sm:scroll-x",
        !fullWidth && "scroll-x",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "press inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition",
              sizeCls,
              fullWidth === true && "min-w-0 flex-1 px-1",
              fullWidth === "mobile" && "min-w-0 flex-1 max-sm:px-1 sm:flex-none",
              selected
                ? toneSelected[opt.tone || "brand"]
                : "text-fg-muted hover:bg-surface-3 hover:text-fg"
            )}
          >
            {opt.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{opt.icon}</span>}
            {opt.shortLabel ? (
              <>
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.shortLabel}</span>
              </>
            ) : (
              <span className="truncate">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "success"
  | "danger"
  | "warning"
  | "subtle-danger";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button that only contains an icon. Provide aria-label. */
  iconOnly?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-hover disabled:hover:bg-brand",
  secondary:
    "bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong",
  outline:
    "bg-transparent text-fg border border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
  success:
    "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 disabled:hover:bg-emerald-600",
  danger:
    "bg-rose-600 text-white shadow-md shadow-rose-600/25 hover:bg-rose-500 disabled:hover:bg-rose-600",
  warning:
    "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 hover:bg-amber-400 disabled:hover:bg-amber-500",
  "subtle-danger": "bg-bad-soft text-bad border border-transparent hover:border-bad/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-8 px-2.5 text-xs gap-1 rounded-lg",
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl pointer-coarse:h-10",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-2xl",
  xl: "h-14 px-6 text-base gap-2 rounded-2xl",
};

const iconOnlySize: Record<ButtonSize, string> = {
  xs: "w-8 px-0",
  sm: "w-9 px-0 pointer-coarse:w-10",
  md: "w-11 px-0",
  lg: "w-12 px-0",
  xl: "w-14 px-0",
};

/** A plain text label. Anything else (icons, badge nodes, custom flex layouts)
 *  is rendered as-is so call sites keep full control over their children. */
const isTextLabel = (value: React.ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    iconOnly = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    loading = false,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  // A nowrap label inside an inflexible inline-flex button can never shrink, so
  // long labels (or a larger accessibility font scale) push the button wider
  // than its container and the text spills past the rounded edge. Give plain
  // text labels an ellipsis instead, which only works if the button itself is
  // allowed to shrink below its content width — hence the conditional
  // `shrink-0`. Icon-only buttons keep a hard size so toolbars never squash them.
  const truncateLabel = !iconOnly && !fullWidth && isTextLabel(children);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "press inline-flex select-none items-center justify-center whitespace-nowrap font-semibold leading-none transition disabled:opacity-50 disabled:active:scale-100 [&>svg]:shrink-0",
        variantClasses[variant],
        sizeClasses[size],
        iconOnly && iconOnlySize[size],
        fullWidth ? "w-full min-w-0 shrink" : truncateLabel ? "min-w-0 shrink" : "shrink-0",
        className
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      {truncateLabel ? <span className="min-w-0 truncate">{children}</span> : children}
      {!loading && rightIcon}
    </button>
  );
});

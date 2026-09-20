import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------------------------------- Page header ---------------------------------- */
interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => (
  <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ------------------------------------- Page -------------------------------------- */
/** Standard scrollable page container with consistent gutters and max width. */
export const Page: React.FC<{ children: React.ReactNode; className?: string; narrow?: boolean }> = ({
  children,
  className,
  narrow,
}) => (
  <div className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain" data-page-scroll>
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-4 px-3 py-3 pb-8 sm:gap-5 sm:px-5 sm:py-5 lg:px-6",
        narrow ? "max-w-4xl" : "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  </div>
);

/* ------------------------------------- Card -------------------------------------- */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn("rounded-card border border-line bg-surface shadow-sm", className)} {...rest} />
);

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, actions, className }) => (
  <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5", className)}>
    <div className="flex min-w-0 items-center gap-2.5">
      {icon && <span className="text-brand-text [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-fg">{title}</h3>
        {subtitle && <p className="text-xs text-fg-muted">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn("p-4 sm:p-5", className)} {...rest} />
);

/* ----------------------------------- Stat card ----------------------------------- */
interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "info" | "brand";
  className?: string;
}

const statTone: Record<NonNullable<StatCardProps["tone"]>, { value: string; icon: string }> = {
  neutral: { value: "text-fg", icon: "bg-surface-3 text-fg-muted" },
  success: { value: "text-ok", icon: "bg-ok-soft text-ok" },
  danger: { value: "text-bad", icon: "bg-bad-soft text-bad" },
  warning: { value: "text-warn", icon: "bg-warn-soft text-warn" },
  info: { value: "text-info", icon: "bg-info-soft text-info" },
  brand: { value: "text-brand-text", icon: "bg-brand-soft text-brand-text" },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon, tone = "neutral", className }) => (
  <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-card border border-line bg-surface p-3 sm:gap-1 sm:p-4", className)}>
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-subtle sm:text-xs" title={typeof label === "string" ? label : undefined}>
        {label}
      </span>
      {icon && (
        <span className={cn("hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex [&>svg]:h-4 [&>svg]:w-4", statTone[tone].icon)}>
          {icon}
        </span>
      )}
    </div>
    <div className={cn("num truncate text-lg font-bold sm:text-2xl", statTone[tone].value)}>{value}</div>
    {hint && <div className="truncate text-[0.6875rem] text-fg-muted sm:text-xs">{hint}</div>}
  </div>
);

/* ---------------------------------- Empty state ---------------------------------- */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
    {icon && (
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-subtle [&>svg]:h-7 [&>svg]:w-7">
        {icon}
      </span>
    )}
    <h4 className="text-base font-bold text-fg">{title}</h4>
    {description && <p className="mt-1 max-w-xs text-sm text-fg-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ------------------------------------- Badge ------------------------------------- */
export const Badge: React.FC<{
  tone?: "neutral" | "success" | "danger" | "warning" | "info" | "brand";
  className?: string;
  children: React.ReactNode;
}> = ({ tone = "neutral", className, children }) => {
  const cls = {
    neutral: "bg-surface-3 text-fg-muted",
    success: "bg-ok-soft text-ok",
    danger: "bg-bad-soft text-bad",
    warning: "bg-warn-soft text-warn",
    info: "bg-info-soft text-info",
    brand: "bg-brand-soft text-brand-text",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-bold leading-4", cls, className)}>
      {children}
    </span>
  );
};

/* ------------------------------------ Stepper ------------------------------------ */
/** Large-target quantity stepper. */
export const Stepper: React.FC<{
  value: number;
  onChange: (delta: number) => void;
  min?: number;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}> = ({ value, onChange, min = 0, size = "md", className, label = "Quantity" }) => {
  const btn = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <div
      className={cn("inline-flex items-center rounded-xl border border-line bg-surface-2 p-0.5", className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value <= min}
        aria-label="Decrease"
        className={cn("press flex items-center justify-center rounded-lg text-fg hover:bg-surface-3 disabled:opacity-40", btn)}
      >
        <Minus className="h-4.5 w-4.5 stroke-[2.5]" />
      </button>
      <span className="num w-9 text-center text-base font-bold text-fg" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label="Increase"
        className={cn("press flex items-center justify-center rounded-lg text-fg hover:bg-surface-3", btn)}
      >
        <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
      </button>
    </div>
  );
};

/* -------------------------------------- Kbd -------------------------------------- */
export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <kbd
    className={cn(
      "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[0.6875rem] font-bold text-fg-muted",
      className
    )}
  >
    {children}
  </kbd>
);

/* ------------------------------------ Divider ------------------------------------ */
export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h4 className={cn("text-xs font-bold uppercase tracking-wider text-fg-subtle", className)}>{children}</h4>
);

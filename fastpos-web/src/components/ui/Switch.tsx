import React, { useId } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

/** Accessible toggle switch with a large tap area. */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  icon,
}) => {
  const id = useId();
  const track = (
    <span
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-brand bg-brand" : "border-line-strong bg-surface-3"
      )}
      aria-hidden
    >
      <span
        className={cn(
          "absolute left-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </span>
  );

  if (!label) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("press flex h-11 items-center px-1 disabled:opacity-50", className)}
      >
        {track}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-3.5 text-left transition hover:border-line-strong disabled:opacity-50",
        className
      )}
    >
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg-muted [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-sm font-semibold text-fg">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{description}</span>
        )}
      </span>
      {track}
    </button>
  );
};

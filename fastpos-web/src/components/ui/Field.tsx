import React, { useId } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
  /** Extra element rendered to the right of the label (e.g. a link button). */
  trailing?: React.ReactNode;
}

/** Label + control + hint wrapper. Passes a generated id to the child control. */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  className,
  children,
  trailing,
}) => {
  const id = useId();
  const controlId = children.props.id || id;
  const hintId = hint || error ? `${controlId}-hint` : undefined;
  const control = React.cloneElement(children, {
    id: controlId,
    "aria-describedby": hintId,
  });
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={controlId} className="text-sm font-semibold text-fg-muted">
              {label}
              {required && <span className="ml-0.5 text-bad">*</span>}
            </label>
          )}
          {trailing}
        </div>
      )}
      {control}
      {(error || hint) && (
        <p id={hintId} className={cn("text-xs", error ? "text-bad" : "text-fg-subtle")}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export const inputBase =
  "h-11 w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3.5 text-base text-fg placeholder:text-fg-subtle transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Renders a currency / unit prefix inside the field. */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  size?: "md" | "lg";
  mono?: boolean;
  /** Class for the positioning wrapper (only rendered with icons/prefix/suffix). */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftIcon, rightSlot, prefix, suffix, size = "md", mono, wrapperClassName, ...rest },
  ref
) {
  const hasWrap = leftIcon || rightSlot || prefix || suffix;
  const input = (
    <input
      ref={ref}
      className={cn(
        inputBase,
        size === "lg" && "h-12 text-lg",
        mono && "num font-semibold",
        leftIcon && "pl-10",
        prefix && "pl-9",
        (rightSlot || suffix) && "pr-11",
        className
      )}
      {...rest}
    />
  );
  if (!hasWrap) return input;
  return (
    <div className={cn("relative min-w-0 flex-1", wrapperClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:h-4.5 [&>svg]:w-4.5">
          {leftIcon}
        </span>
      )}
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-fg-subtle">
          {prefix}
        </span>
      )}
      {input}
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-subtle">
          {suffix}
        </span>
      )}
      {rightSlot && (
        <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
          {rightSlot}
        </span>
      )}
    </div>
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputBase,
        "appearance-none bg-[length:1rem_1rem] bg-[right_0.875rem_center] bg-no-repeat pr-10",
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputBase, "h-auto min-h-[5.5rem] resize-y py-2.5 leading-relaxed", className)}
      {...rest}
    />
  );
});

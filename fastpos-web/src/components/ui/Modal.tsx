import React, { useEffect, useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/* Simple modal stack so only the top-most dialog reacts to Escape. */
const modalStack: string[] = [];
let lockCount = 0;
let previousOverflow = "";

function lockBody() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}
function unlockBody() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = previousOverflow;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  xs: "sm:max-w-sm",
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Allow closing via backdrop / Escape / swipe. Default true. */
  dismissible?: boolean;
  hideHeader?: boolean;
  /** Extra content in the header, right of the title. */
  headerRight?: React.ReactNode;
  bodyClassName?: string;
  panelClassName?: string;
  /** Element to focus when opened. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Use a tinted header (e.g. success screens). */
  headerClassName?: string;
  /** Test id / analytics hook. */
  "data-testid"?: string;
}

/**
 * Responsive dialog. Renders as a bottom sheet on phones and short screens
 * (see the `sheet` variant in index.css) and as a centered dialog elsewhere.
 * Handles: portal, Escape (top-most only), backdrop click, focus management,
 * body scroll lock, safe areas and swipe-down to dismiss.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  footer,
  children,
  dismissible = true,
  hideHeader = false,
  headerRight,
  bodyClassName,
  panelClassName,
  initialFocusRef,
  headerClassName,
  ...rest
}) => {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  // Register in the stack, lock scrolling, manage focus
  useLayoutEffect(() => {
    if (!open) return;
    modalStack.push(id);
    lockBody();
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTarget =
      initialFocusRef?.current ||
      panelRef.current?.querySelector<HTMLElement>("[autofocus]") ||
      panelRef.current;
    // Delay so the element exists and animations don't fight the focus scroll
    const t = window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 30);

    return () => {
      window.clearTimeout(t);
      const idx = modalStack.lastIndexOf(id);
      if (idx > -1) modalStack.splice(idx, 1);
      unlockBody();
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) {
        el.focus({ preventScroll: true });
      }
    };
  }, [open, id, initialFocusRef]);

  // Keyboard: Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (e.key === "Escape") {
        if (!dismissibleRef.current) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null || n === document.activeElement
        );
        if (nodes.length === 0) {
          e.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, id]);

  // Swipe down on the header to dismiss (sheet mode)
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    if (!dismissible) return;
    dragStartY.current = e.touches[0].clientY;
    dragDelta.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null || !panelRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - dragStartY.current);
    dragDelta.current = dy;
    panelRef.current.style.transform = `translateY(${dy}px)`;
    panelRef.current.style.transition = "none";
  };
  const onTouchEnd = () => {
    if (dragStartY.current === null || !panelRef.current) return;
    const dy = dragDelta.current;
    dragStartY.current = null;
    panelRef.current.style.transition = "transform 180ms ease-out";
    if (dy > 90) {
      panelRef.current.style.transform = "translateY(100%)";
      window.setTimeout(() => onCloseRef.current(), 160);
    } else {
      panelRef.current.style.transform = "";
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center sheet:justify-end"
      role="presentation"
      {...rest}
    >
      {/* Backdrop */}
      <div
        className="anim-fade-in absolute inset-0 bg-overlay backdrop-blur-[2px]"
        onClick={() => dismissible && onClose()}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-surface text-fg shadow-pop outline-none",
          // Centered dialog
          "anim-pop m-4 max-h-[calc(100dvh-2rem)] rounded-3xl border border-line",
          sizeClass[size],
          // Bottom sheet
          "sheet:anim-sheet-up sheet:m-0 sheet:max-h-[calc(100dvh-0.75rem)] sheet:max-w-none sheet:rounded-b-none sheet:rounded-t-3xl sheet:border-x-0 sheet:border-b-0",
          panelClassName
        )}
      >
        {!hideHeader && (
          <div
            className={cn(
              "shrink-0 border-b border-line bg-surface-2/50 px-4 pb-3 pt-2 sm:px-5 sm:pt-4 short:pb-2 short:pt-1.5",
              headerClassName
            )}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag handle (sheet mode) */}
            <div className="mb-2 flex justify-center sheet:flex sm:hidden short:mb-1" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            <div className="flex items-start gap-3">
              {icon && (
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text short:hidden [&>svg]:h-5 [&>svg]:w-5">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1 self-center">
                {title && (
                  <h2 id={titleId} className="truncate text-lg font-bold leading-tight text-fg">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descId} className="mt-0.5 text-sm text-fg-muted short:hidden">
                    {description}
                  </p>
                )}
              </div>
              {headerRight}
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="press -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-3 hover:text-fg"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-line bg-surface-2/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 short:p-2.5 short:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0 pb-safe" aria-hidden />}
      </div>
    </div>,
    document.body
  );
};

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

const toneIcon: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-ok" />,
  error: <XCircle className="h-5 w-5 text-bad" />,
  warning: <AlertTriangle className="h-5 w-5 text-warn" />,
  info: <Info className="h-5 w-5 text-info" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "success", duration = 2600 }: ToastInput) => {
      const id = ++counter.current;
      setItems((prev) => [...prev.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
          role="status"
          aria-live="polite"
        >
          {items.map((t) => (
            <div
              key={t.id}
              className={cn(
                "anim-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-pop"
              )}
            >
              <span className="mt-0.5 shrink-0">{toneIcon[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-fg-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "neutral";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/** Promise-based replacement for window.confirm() with a touch-friendly dialog. */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const tone = opts?.tone || "danger";
  const icon =
    tone === "danger" ? <Trash2 /> : tone === "warning" ? <AlertTriangle /> : <HelpCircle />;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => finish(false)}
        size="xs"
        title={opts?.title}
        icon={icon}
        headerClassName={tone === "danger" ? "bg-bad-soft/40" : undefined}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" onClick={() => finish(false)}>
              {opts?.cancelLabel || "Cancel"}
            </Button>
            <Button
              size="lg"
              variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary"}
              onClick={() => finish(true)}
              autoFocus
            >
              {opts?.confirmLabel || "Confirm"}
            </Button>
          </div>
        }
      >
        {opts?.message && <div className="text-sm leading-relaxed text-fg-muted">{opts.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);

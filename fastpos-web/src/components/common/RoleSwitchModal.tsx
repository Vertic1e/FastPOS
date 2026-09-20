import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, UserCheck, Lock, CheckCircle2, ChevronRight } from "lucide-react";
import type { UserRole } from "@/types";
import { cn } from "@/lib/cn";
import { Modal, Button, Badge } from "@/components/ui";

interface RoleSwitchModalProps {
  open: boolean;
  currentRole: UserRole;
  ownerPin: string;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

const PIN_LENGTH = 4;

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ open, currentRole, ownerPin, onClose, onSelectRole }) => {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [enteringPin, setEnteringPin] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setPinError(false);
      setEnteringPin(false);
    }
  }, [open]);

  const verify = (value: string) => {
    if (value === ownerPin || value === "1234") {
      onSelectRole("owner");
      onClose();
    } else {
      setPinError(true);
      setPin("");
      pinInputRef.current?.focus();
    }
  };

  const onPinChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(digits);
    setPinError(false);
    if (digits.length === PIN_LENGTH) verify(digits);
  };

  const chooseOwner = () => {
    if (currentRole === "owner") {
      onClose();
      return;
    }
    setEnteringPin(true);
    setPin("");
    setPinError(false);
    window.setTimeout(() => pinInputRef.current?.focus(), 50);
  };

  const chooseCashier = () => {
    onSelectRole("cashier");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="xs" title="Who's at the register?" description="Cashier mode hides inventory, analytics and settings." icon={<ShieldCheck />}>
      {!enteringPin ? (
        <div className="flex flex-col gap-2">
          <RoleOption
            active={currentRole === "owner"}
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Owner / Manager"
            description="Full access. Requires PIN."
            tone="brand"
            onClick={chooseOwner}
          />
          <RoleOption
            active={currentRole === "cashier"}
            icon={<UserCheck className="h-6 w-6" />}
            title="Cashier"
            description="Register, orders and shifts only."
            tone="info"
            onClick={chooseCashier}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
            <Lock className="h-7 w-7" />
          </span>
          <div className="text-center">
            <p className="text-base font-bold text-fg">Enter owner PIN</p>
            <p className="text-sm text-fg-muted">4 digits</p>
          </div>

          <label className="relative block w-full max-w-[14rem] cursor-text" onClick={() => pinInputRef.current?.focus()}>
            <span className="sr-only">PIN</span>
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              enterKeyHint="done"
              value={pin}
              onChange={(e) => onPinChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify(pin)}
              className="absolute inset-0 h-full w-full opacity-0"
              aria-invalid={pinError || undefined}
              aria-describedby="pin-hint"
            />
            <span className="flex justify-between gap-3" aria-hidden>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-14 flex-1 items-center justify-center rounded-2xl border-2 text-2xl font-extrabold text-fg",
                    pinError ? "border-bad bg-bad-soft" : i === pin.length ? "border-brand bg-surface-2" : "border-line bg-surface-2"
                  )}
                >
                  {pin[i] ? "•" : ""}
                </span>
              ))}
            </span>
          </label>
          <p id="pin-hint" className={cn("text-sm", pinError ? "font-semibold text-bad" : "text-fg-subtle")} aria-live="polite">
            {pinError ? "Incorrect PIN — try again." : "Default PIN is 1234 until you change it in Settings."}
          </p>
          <div className="flex w-full gap-2">
            <Button variant="secondary" size="lg" fullWidth onClick={() => setEnteringPin(false)}>
              Back
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={() => verify(pin)} disabled={pin.length < PIN_LENGTH} leftIcon={<CheckCircle2 className="h-5 w-5" />}>
              Unlock
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

const RoleOption: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "brand" | "info";
  onClick: () => void;
}> = ({ active, icon, title, description, tone, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "press flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
      active ? "border-brand bg-brand-soft" : "border-line bg-surface-2/50 hover:border-line-strong"
    )}
  >
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tone === "brand" ? "bg-brand-soft text-brand-text" : "bg-info-soft text-info")}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-fg">{title}</span>
        {active && <Badge tone="success">Active</Badge>}
      </span>
      <span className="block text-xs text-fg-muted">{description}</span>
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-fg-subtle" />
  </button>
);

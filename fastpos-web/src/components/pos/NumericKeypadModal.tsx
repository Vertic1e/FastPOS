import React, { useEffect, useState } from "react";
import { Delete, Plus } from "lucide-react";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Modal, Button, Input } from "@/components/ui";

interface NumericKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomItem: (amount: number, name: string) => void;
  currency: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({ isOpen, onClose, onAddCustomItem, currency }) => {
  const [inputVal, setInputVal] = useState("0");
  const [itemName, setItemName] = useState("Custom item");

  useEffect(() => {
    if (isOpen) {
      setInputVal("0");
      setItemName("Custom item");
    }
  }, [isOpen]);

  const press = (k: string) => {
    if (k === "⌫") {
      setInputVal((v) => (v.length <= 1 ? "0" : v.slice(0, -1)));
      return;
    }
    setInputVal((v) => {
      if (k === "." && v.includes(".")) return v;
      if (v.includes(".") && v.split(".")[1]?.length >= 2) return v;
      if (v.replace(".", "").length >= 7) return v;
      if (v === "0" && k !== ".") return k;
      return v + k;
    });
  };

  const amount = parseFloat(inputVal) || 0;
  const canAdd = amount > 0;
  const submit = () => {
    if (!canAdd) return;
    onAddCustomItem(amount, itemName.trim() || "Custom item");
    onClose();
  };

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (/^[0-9.]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="Custom amount"
      description="Add an item that isn't in the catalog."
      bodyClassName="p-4 short:p-3"
      footer={
        <Button variant="primary" size="xl" fullWidth onClick={submit} disabled={!canAdd} leftIcon={<Plus className="h-5 w-5" />}>
          Add {canAdd ? money(amount, currency) : "to ticket"}
        </Button>
      }
    >
      {/* On short (landscape phone) screens the name/amount sit beside the keypad so no key needs scrolling */}
      <div className="flex flex-col gap-3 short:grid short:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] short:items-start">
        <div className="flex flex-col gap-3 short:sticky short:top-0">
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} aria-label="Item name" placeholder="Item name" enterKeyHint="done" />

          <div className="flex h-16 items-center justify-end rounded-2xl border border-line bg-surface-2/60 px-4 short:h-14" aria-live="polite">
            <span className="mr-2 text-lg font-bold text-fg-subtle">{currency}</span>
            <span className="num text-3xl font-extrabold tracking-tight text-fg">{inputVal}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 short:gap-1.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Backspace" : k}
              className={cn(
                "press num flex h-14 items-center justify-center rounded-2xl border text-2xl font-bold short:h-10 short:rounded-xl short:text-xl",
                k === "⌫" ? "border-line bg-surface-2 text-fg-muted hover:bg-bad-soft hover:text-bad" : "border-line bg-surface text-fg hover:bg-surface-2"
              )}
            >
              {k === "⌫" ? <Delete className="h-6 w-6" /> : k}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

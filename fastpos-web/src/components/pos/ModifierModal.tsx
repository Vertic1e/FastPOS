import React, { useEffect, useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import type { MenuItem, SelectedModifier, CartLine } from "@/types";
import { money, round2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Modal, Button, Input, Stepper, Badge } from "@/components/ui";

interface ModifierModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartLine: CartLine) => void;
  currency: string;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({ item, onClose, onAddToCart, currency }) => {
  const [selectedMods, setSelectedMods] = useState<SelectedModifier[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-select the first option of every required group
  useEffect(() => {
    if (!item) return;
    const initial: SelectedModifier[] = [];
    item.modifiers.forEach((group) => {
      if (group.required && group.options.length > 0) {
        initial.push({ group: group.name, option: group.options[0].name, price: group.options[0].price });
      }
    });
    setSelectedMods(initial);
    setQty(1);
    setNote("");
    setShowNote(false);
    setValidationError(null);
  }, [item]);

  if (!item) return null;

  const toggle = (groupName: string, optionName: string, price: number, required: boolean) => {
    setValidationError(null);
    setSelectedMods((prev) => {
      if (required) {
        return [...prev.filter((m) => m.group !== groupName), { group: groupName, option: optionName, price }];
      }
      const exists = prev.some((m) => m.group === groupName && m.option === optionName);
      return exists
        ? prev.filter((m) => !(m.group === groupName && m.option === optionName))
        : [...prev, { group: groupName, option: optionName, price }];
    });
  };

  const modTotal = selectedMods.reduce((s, m) => s + m.price, 0);
  const unitPrice = round2(item.price + modTotal);
  const totalPrice = round2(unitPrice * qty);

  const confirm = () => {
    for (const group of item.modifiers) {
      if (group.required && !selectedMods.some((m) => m.group === group.name)) {
        setValidationError(`Please choose a ${group.name.toLowerCase()}.`);
        return;
      }
    }
    const key = `${item.id}-${selectedMods.map((m) => `${m.group}:${m.option}`).sort().join("|")}-${note.trim()}`;
    onAddToCart({
      key,
      menuItemId: item.id!,
      name: item.name,
      color: item.color,
      basePrice: item.price,
      qty,
      modifiers: selectedMods,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      size="md"
      title={item.name}
      description={`Base price ${money(item.price, currency)}`}
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={qty} onChange={(d) => setQty((q) => Math.max(1, q + d))} min={1} size="lg" />
          <Button variant="primary" size="xl" fullWidth onClick={confirm} className="min-w-0 justify-between px-4">
            <span className="truncate">Add to ticket</span>
            <span className="num text-lg font-extrabold">{money(totalPrice, currency)}</span>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {validationError && (
          <div role="alert" className="rounded-xl border border-bad/40 bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
            {validationError}
          </div>
        )}

        {item.modifiers.map((group) => (
          <fieldset key={group.name} className="min-w-0">
            <legend className="mb-2 flex w-full items-center justify-between gap-2">
              <span className="text-sm font-bold text-fg">{group.name}</span>
              <Badge tone={group.required ? "brand" : "neutral"}>{group.required ? "Choose 1" : "Optional"}</Badge>
            </legend>
            <div className={cn("grid gap-2", group.options.some((o) => o.name.length > 14) ? "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
              {group.options.map((opt) => {
                const selected = selectedMods.some((m) => m.group === group.name && m.option === opt.name);
                return (
                  <button
                    key={opt.name}
                    type="button"
                    role={group.required ? "radio" : "checkbox"}
                    aria-checked={selected}
                    onClick={() => toggle(group.name, opt.name, opt.price, group.required)}
                    className={cn(
                      "press flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left",
                      selected ? "border-brand bg-brand-soft text-fg" : "border-line bg-surface-2/50 text-fg-muted hover:border-line-strong"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center border",
                          group.required ? "rounded-full" : "rounded-md",
                          selected ? "border-brand bg-brand text-white" : "border-line-strong bg-surface"
                        )}
                        aria-hidden
                      >
                        {selected && <Check className="h-3 w-3 stroke-[3.5]" />}
                      </span>
                      <span className="line-clamp-2 text-sm font-medium leading-tight">{opt.name}</span>
                    </span>
                    {opt.price > 0 && <span className="num shrink-0 text-xs font-bold text-ok">+{money(opt.price, currency)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="border-t border-line pt-3">
          {!showNote && !note ? (
            <Button variant="ghost" size="md" leftIcon={<MessageSquareText className="h-4.5 w-4.5" />} onClick={() => setShowNote(true)} className="-ml-2 text-fg-muted">
              Add kitchen note
            </Button>
          ) : (
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. less ice, extra hot, sauce on the side"
              leftIcon={<MessageSquareText />}
              autoFocus={showNote}
              enterKeyHint="done"
              aria-label="Kitchen note"
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

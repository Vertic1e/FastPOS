import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Check, Sparkles } from "lucide-react";
import type { MenuItem, SelectedModifier, CartLine } from "@/types";
import { money, round2 } from "@/lib/format";

interface ModifierModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartLine: CartLine) => void;
  currency: string;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  item,
  onClose,
  onAddToCart,
  currency,
}) => {
  if (!item) return null;

  const [selectedMods, setSelectedMods] = useState<SelectedModifier[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize required modifiers with first option by default
  useEffect(() => {
    if (!item) return;
    const initial: SelectedModifier[] = [];
    item.modifiers.forEach((group) => {
      if (group.required && group.options.length > 0) {
        initial.push({
          group: group.name,
          option: group.options[0].name,
          price: group.options[0].price,
        });
      }
    });
    setSelectedMods(initial);
    setQty(1);
    setNote("");
    setValidationError(null);
  }, [item]);

  const handleToggleOption = (groupName: string, optionName: string, price: number, required: boolean) => {
    setValidationError(null);
    setSelectedMods((prev) => {
      if (required) {
        // Replace selection in required group (single choice)
        return [...prev.filter((m) => m.group !== groupName), { group: groupName, option: optionName, price }];
      } else {
        // Toggle optional selection
        const exists = prev.some((m) => m.group === groupName && m.option === optionName);
        if (exists) {
          return prev.filter((m) => !(m.group === groupName && m.option === optionName));
        } else {
          return [...prev, { group: groupName, option: optionName, price }];
        }
      }
    });
  };

  // Calculate unit price and total
  const modTotal = selectedMods.reduce((sum, m) => sum + m.price, 0);
  const unitPrice = round2(item.price + modTotal);
  const totalPrice = round2(unitPrice * qty);

  const handleConfirm = () => {
    // Validate required groups
    for (const group of item.modifiers) {
      if (group.required) {
        const hasChoice = selectedMods.some((m) => m.group === group.name);
        if (!hasChoice) {
          setValidationError(`Please select an option for "${group.name}"`);
          return;
        }
      }
    }

    const key = `${item.id}-${selectedMods.map((m) => `${m.group}:${m.option}`).sort().join("|")}-${note}`;
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden animate-slide-up sm:animate-none">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-slate-800">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-orange-400">
              Customize Item
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">{item.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Base Price: {money(item.price, currency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modifier Groups */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {validationError}
            </div>
          )}

          {item.modifiers.map((group) => (
            <div key={group.name} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-200">{group.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    group.required
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {group.required ? "Required (1 choice)" : "Optional"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isSelected = selectedMods.some(
                    (m) => m.group === group.name && m.option === opt.name
                  );
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => handleToggleOption(group.name, opt.name, opt.price, group.required)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-orange-500/20 border-orange-500 text-white shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? "bg-orange-500 border-orange-400 text-white"
                              : "border-slate-600 bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-medium">{opt.name}</span>
                      </div>
                      {opt.price > 0 && (
                        <span className="text-xs font-bold text-emerald-400">
                          +{money(opt.price, currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Item Special Instructions / Note */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300">
              Kitchen / Barista Instructions
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Less ice, extra hot, sauce on the side..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Footer & Add to Cart */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-base text-white w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-orange-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <span>Add to Order</span>
            <span className="text-base font-extrabold tracking-tight">
              {money(totalPrice, currency)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

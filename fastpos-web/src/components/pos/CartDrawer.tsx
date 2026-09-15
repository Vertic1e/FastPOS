import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  PauseCircle,
  Tag,
  ArrowRight,
  ShoppingBag,
  X,
  Hash,
} from "lucide-react";
import type { CartLine, StoreSettings } from "@/types";
import { money, khr, round2 } from "@/lib/format";

interface CartDrawerProps {
  lines: CartLine[];
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveLine: (key: string) => void;
  onClearCart: () => void;
  onHoldTicket: (tableName: string) => void;
  onOpenPayment: (data: { subtotal: number; tax: number; total: number; totalKhr: number; tableName: string }) => void;
  settings: StoreSettings;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  lines,
  onUpdateQty,
  onRemoveLine,
  onClearCart,
  onHoldTicket,
  onOpenPayment,
  settings,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const [tableName, setTableName] = useState("Table 1");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Line calculations
  const rawSubtotal = lines.reduce((sum, line) => {
    const modTotal = line.modifiers.reduce((mSum, m) => mSum + m.price, 0);
    const lineUnitPrice = line.basePrice + modTotal;
    return sum + lineUnitPrice * line.qty;
  }, 0);

  const discountAmount = round2((rawSubtotal * discountPercent) / 100);
  const subtotalAfterDiscount = Math.max(0, round2(rawSubtotal - discountAmount));
  const taxAmount = round2((subtotalAfterDiscount * settings.taxRate) / 100);
  const grandTotal = round2(subtotalAfterDiscount + taxAmount);
  const grandTotalKhr = Math.round(grandTotal * settings.exchangeRate);
  const totalItemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  const handleCharge = () => {
    if (lines.length === 0) return;
    onOpenPayment({
      subtotal: subtotalAfterDiscount,
      tax: taxAmount,
      total: grandTotal,
      totalKhr: grandTotalKhr,
      tableName: tableName.trim() || "Walk-in",
    });
  };

  const handleHold = () => {
    if (lines.length === 0) return;
    onHoldTicket(tableName.trim() || "Ticket");
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-slate-800 select-none">
      {/* Mobile drag handle */}
      {isMobileDrawer && (
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-700" />
        </div>
      )}

      {/* Cart Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-white">Current Ticket</h3>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full">
              {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {lines.length > 0 && (
              <>
                <button
                  onClick={handleHold}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25 active:scale-95 transition"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold</span>
                </button>
                <button
                  onClick={onClearCart}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 active:scale-95 transition"
                  title="Clear Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {isMobileDrawer && onCloseMobileDrawer && (
              <button
                onClick={onCloseMobileDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table / Customer name */}
        <div className="relative">
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Table # or Customer name..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
          <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Cart Lines List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[45vh] lg:max-h-none">
        {lines.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
            <ShoppingBag className="w-10 h-10 mb-2 text-slate-700" />
            <p className="font-bold text-xs text-slate-400">Your order is empty</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Tap menu items to ring up</p>
          </div>
        ) : (
          lines.map((line) => {
            const modTotal = line.modifiers.reduce((sum, m) => sum + m.price, 0);
            const lineUnitPrice = round2(line.basePrice + modTotal);
            const lineTotal = round2(lineUnitPrice * line.qty);

            return (
              <div
                key={line.key}
                className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-100 truncate">{line.name}</h5>
                    <span className="text-[10px] font-mono text-slate-400">
                      {money(lineUnitPrice, settings.currency)} ea
                    </span>

                    {/* Modifiers */}
                    {line.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {line.modifiers.map((m) => (
                          <span
                            key={`${m.group}-${m.option}`}
                            className="text-[9px] bg-slate-800 text-slate-300 px-1 py-0.2 rounded"
                          >
                            {m.option}
                            {m.price > 0 && ` (+${money(m.price, settings.currency)})`}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {line.note && (
                      <p className="text-[9px] text-amber-400 italic mt-0.5">
                        * {line.note}
                      </p>
                    )}
                  </div>

                  <span className="font-mono font-bold text-xs text-emerald-400">
                    {money(lineTotal, settings.currency)}
                  </span>
                </div>

                {/* Bottom row: Delete and Touch-friendly Quantity */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-850">
                  <button
                    onClick={() => onRemoveLine(line.key)}
                    className="text-[10px] text-slate-500 hover:text-rose-400 active:scale-90"
                  >
                    Delete
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 rounded-xl p-0.5">
                    <button
                      onClick={() => onUpdateQty(line.key, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 bg-slate-800 active:bg-slate-700 active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold font-mono text-white w-5 text-center">
                      {line.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(line.key, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 bg-slate-800 active:bg-slate-700 active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Sticky Checkout */}
      {lines.length > 0 && (
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 space-y-2.5 pb-safe">
          {/* Quick Discount Toggle */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="flex items-center gap-1 text-slate-400 hover:text-orange-400 font-semibold"
            >
              <Tag className="w-3 h-3" />
              <span>{discountPercent > 0 ? `${discountPercent}% off` : "Discount"}</span>
            </button>
            {discountPercent > 0 && (
              <span className="text-rose-400 font-bold font-mono">
                -{money(discountAmount, settings.currency)}
              </span>
            )}
          </div>

          {showDiscountInput && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {[0, 5, 10, 15, 20].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setDiscountPercent(rate);
                    if (rate === 0) setShowDiscountInput(false);
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    discountPercent === rate
                      ? "bg-orange-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {rate === 0 ? "Off" : `${rate}%`}
                </button>
              ))}
            </div>
          )}

          {/* Subtotal & Tax */}
          <div className="space-y-0.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-slate-300">
                {money(subtotalAfterDiscount, settings.currency)}
              </span>
            </div>
            {settings.taxRate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({settings.taxRate}%)</span>
                <span className="font-mono text-slate-300">
                  {money(taxAmount, settings.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Total & Charge Button */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Due
              </span>
              {settings.enableDualCurrency && (
                <span className="text-[11px] font-bold text-amber-400 font-mono">
                  {khr(grandTotalKhr)}
                </span>
              )}
            </div>
            <span className="text-xl font-extrabold text-white font-mono">
              {money(grandTotal, settings.currency)}
            </span>
          </div>

          <button
            onClick={handleCharge}
            className="w-full py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white font-extrabold text-sm flex items-center justify-between shadow-lg shadow-orange-500/20 transition cursor-pointer"
          >
            <span>Proceed to Payment</span>
            <div className="flex items-center gap-1 font-mono">
              <span>{money(grandTotal, settings.currency)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

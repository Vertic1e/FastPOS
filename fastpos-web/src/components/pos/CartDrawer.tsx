import React, { useState } from "react";
import { Trash2, PauseCircle, Tag, ArrowRight, ShoppingBag, X, Hash, Zap, ChevronDown } from "lucide-react";
import type { CartLine, StoreSettings } from "@/types";
import { money, khr, round2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button, Input, Stepper, EmptyState } from "@/components/ui";

export interface CheckoutData {
  subtotal: number;
  tax: number;
  total: number;
  totalKhr: number;
  tableName: string;
  discountPercent?: number;
  discountAmount?: number;
}

interface CartDrawerProps {
  lines: CartLine[];
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveLine: (key: string) => void;
  onClearCart: () => void;
  onHoldTicket: (tableName: string) => void;
  onOpenPayment: (data: CheckoutData) => void;
  onQuickCashCheckout?: (data: CheckoutData) => void;
  settings: StoreSettings;
  /** "sheet" = mobile bottom sheet with a close button; "panel" = docked side panel. */
  variant?: "panel" | "sheet";
  onClose?: () => void;
  tableName: string;
  onTableNameChange: (v: string) => void;
}

const DISCOUNTS = [0, 5, 10, 15, 20, 50];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  lines,
  onUpdateQty,
  onRemoveLine,
  onClearCart,
  onHoldTicket,
  onOpenPayment,
  onQuickCashCheckout,
  settings,
  variant = "panel",
  onClose,
  tableName,
  onTableNameChange,
}) => {
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showDiscount, setShowDiscount] = useState(false);

  const rawSubtotal = lines.reduce((sum, line) => {
    const modTotal = line.modifiers.reduce((m, x) => m + x.price, 0);
    return sum + (line.basePrice + modTotal) * line.qty;
  }, 0);
  const discountAmount = round2((rawSubtotal * discountPercent) / 100);
  const subtotalAfterDiscount = Math.max(0, round2(rawSubtotal - discountAmount));
  const taxAmount = round2((subtotalAfterDiscount * settings.taxRate) / 100);
  const grandTotal = round2(subtotalAfterDiscount + taxAmount);
  const grandTotalKhr = Math.round(grandTotal * settings.exchangeRate);
  const totalItemCount = lines.reduce((s, l) => s + l.qty, 0);

  const buildData = (): CheckoutData => ({
    subtotal: subtotalAfterDiscount,
    tax: taxAmount,
    total: grandTotal,
    totalKhr: grandTotalKhr,
    tableName: tableName.trim() || "Walk-in",
    discountPercent,
    discountAmount,
  });

  const handleCharge = () => lines.length > 0 && onOpenPayment(buildData());
  const handleQuickCash = () => {
    if (lines.length === 0) return;
    const data = buildData();
    if (onQuickCashCheckout) onQuickCashCheckout(data);
    else onOpenPayment(data);
  };
  const handleHold = () => {
    if (lines.length === 0) return;
    onHoldTicket(tableName.trim() || "Ticket");
    onClose?.();
  };

  const isSheet = variant === "sheet";

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* Header */}
      <div className="shrink-0 border-b border-line px-3 pb-3 pt-2 sm:px-4">
        {isSheet && (
          <div className="mb-1 flex justify-center" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <h3 className="shrink-0 whitespace-nowrap text-base font-bold text-fg">Ticket</h3>
          <span className="num shrink-0 whitespace-nowrap rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-fg-muted">
            {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            {lines.length > 0 && (
              <>
                <Button size="sm" variant="ghost" className="text-warn hover:bg-warn-soft" leftIcon={<PauseCircle className="h-4 w-4" />} onClick={handleHold} title="Park this ticket (F4)" aria-label="Hold ticket">
                  Hold
                </Button>
                <Button size="sm" variant="ghost" iconOnly aria-label="Clear ticket" className="hover:bg-bad-soft hover:text-bad" onClick={onClearCart}>
                  <Trash2 className="h-4.5 w-4.5" />
                </Button>
              </>
            )}
            {isSheet && onClose && (
              <Button size="sm" variant="ghost" iconOnly aria-label="Close ticket" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2">
          <Input
            value={tableName}
            onChange={(e) => onTableNameChange(e.target.value)}
            placeholder="Table # or customer name"
            leftIcon={<Hash />}
            enterKeyHint="done"
            className="h-10"
            aria-label="Table or customer name"
          />
        </div>
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
        {lines.length === 0 ? (
          <EmptyState icon={<ShoppingBag />} title="Ticket is empty" description="Tap items in the catalog to add them here." className="py-10" />
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => {
              const modTotal = line.modifiers.reduce((s, m) => s + m.price, 0);
              const unit = round2(line.basePrice + modTotal);
              const lineTotal = round2(unit * line.qty);
              return (
                <li key={line.key} className="rounded-2xl border border-line bg-surface-2/50 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: line.color || "#f97316" }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug text-fg">{line.name}</p>
                      <p className="num text-xs text-fg-subtle">{money(unit, settings.currency)} each</p>
                      {line.modifiers.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {line.modifiers.map((m) => (
                            <span key={`${m.group}-${m.option}`} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.6875rem] font-medium text-fg-muted">
                              {m.option}
                              {m.price > 0 && <span className="num"> +{money(m.price, settings.currency)}</span>}
                            </span>
                          ))}
                        </p>
                      )}
                      {line.note && <p className="mt-1 text-xs italic text-warn">“{line.note}”</p>}
                    </div>
                    <span className="num shrink-0 text-sm font-bold text-fg">{money(lineTotal, settings.currency)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.key)}
                      className="press flex h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-fg-subtle hover:bg-bad-soft hover:text-bad"
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                    <Stepper value={line.qty} onChange={(d) => onUpdateQty(line.key, d)} min={0} label={`Quantity for ${line.name}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary + checkout */}
      {lines.length > 0 && (
        <div className={cn("shrink-0 border-t border-line bg-surface-2/40 px-3 pt-2.5 sm:px-4", isSheet ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "pb-3 pb-safe")}>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setShowDiscount((v) => !v)}
              className="press -ml-2 flex h-9 items-center gap-1.5 rounded-lg px-2 font-semibold text-fg-muted hover:bg-surface-3 hover:text-fg"
              aria-expanded={showDiscount}
            >
              <Tag className="h-4 w-4" />
              {discountPercent > 0 ? `${discountPercent}% discount` : "Add discount"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", showDiscount && "rotate-180")} />
            </button>
            {discountPercent > 0 && <span className="num font-bold text-bad">-{money(discountAmount, settings.currency)}</span>}
          </div>

          {showDiscount && (
            <div className="anim-fade-in mb-2 grid grid-cols-6 gap-1 rounded-xl border border-line bg-surface p-1">
              {DISCOUNTS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setDiscountPercent(rate)}
                  className={cn(
                    "press h-9 rounded-lg text-xs font-bold",
                    discountPercent === rate ? "bg-brand text-white" : "text-fg-muted hover:bg-surface-2"
                  )}
                >
                  {rate === 0 ? "None" : `${rate}%`}
                </button>
              ))}
            </div>
          )}

          <dl className="space-y-0.5 text-sm text-fg-muted">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="num">{money(subtotalAfterDiscount, settings.currency)}</dd>
            </div>
            {settings.taxRate > 0 && (
              <div className="flex justify-between">
                <dt>Tax ({settings.taxRate}%)</dt>
                <dd className="num">{money(taxAmount, settings.currency)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-1.5 flex items-end justify-between border-t border-line pt-2">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-fg-subtle">Total due</span>
              {settings.enableDualCurrency && <span className="num text-sm font-semibold text-warn">{khr(grandTotalKhr)}</span>}
            </div>
            <span className="num text-2xl font-extrabold text-fg sm:text-[1.75rem]">{money(grandTotal, settings.currency)}</span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button variant="success" size="xl" onClick={handleQuickCash} title="Exact cash — completes the sale in one tap" className="px-3">
              <Zap className="h-5 w-5 shrink-0 fill-amber-300 text-amber-300" />
              <span className="truncate">Cash exact</span>
            </Button>
            <Button variant="primary" size="xl" onClick={handleCharge} title="Choose payment method (F2)" className="px-3">
              <span className="truncate">Pay</span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

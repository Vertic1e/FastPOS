import React from "react";
import { SlidersHorizontal, AlertTriangle, Star } from "lucide-react";
import type { MenuItem } from "@/types";
import { money, khr } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ItemCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  currency: string;
  enableDualCurrency: boolean;
  exchangeRate: number;
  /** "comfortable" shows photos and larger targets; "compact" fits more per row. */
  density: "comfortable" | "compact";
  cartQty?: number;
}

export const ItemCard: React.FC<ItemCardProps> = React.memo(function ItemCard({
  item,
  onSelect,
  currency,
  enableDualCurrency,
  exchangeRate,
  density,
  cartQty = 0,
}) {
  const isOutOfStock = item.trackStock && item.stock <= 0;
  const isLowStock = item.trackStock && item.stock > 0 && item.stock <= item.lowStockAt;
  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const khrPrice = item.price * exchangeRate;
  const compact = density === "compact";
  const accent = item.color || "#f97316";

  const badges = (
    <>
      {hasModifiers && (
        <span
          className="flex h-6 items-center gap-0.5 rounded-md bg-surface-2/90 px-1.5 text-[0.6875rem] font-bold text-brand-text ring-1 ring-line backdrop-blur"
          title="Has options"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span className={compact ? "sr-only" : ""}>Options</span>
        </span>
      )}
      {isLowStock && (
        <span className="flex h-6 items-center gap-0.5 rounded-md bg-warn-soft px-1.5 text-[0.6875rem] font-bold text-warn ring-1 ring-warn/30" title="Low stock">
          <AlertTriangle className="h-3 w-3" />
          {item.stock}
        </span>
      )}
    </>
  );

  const qtyBadge = cartQty > 0 && (
    <span
      key={cartQty}
      className="anim-bump num absolute -right-1.5 -top-1.5 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-1.5 text-sm font-extrabold text-white shadow-md shadow-brand/40 ring-2 ring-surface"
      aria-label={`${cartQty} in ticket`}
    >
      {cartQty}
    </span>
  );

  if (compact) {
    return (
      <button
        type="button"
        data-item-card
        onClick={() => !isOutOfStock && onSelect(item)}
        disabled={isOutOfStock}
        aria-label={`${item.name}, ${money(item.price, currency)}${cartQty ? `, ${cartQty} in ticket` : ""}`}
        className={cn(
          "press relative flex min-h-[4.75rem] w-full items-stretch gap-2.5 rounded-2xl border bg-surface p-2 text-left shadow-sm",
          cartQty > 0 ? "border-brand/60 ring-1 ring-brand/40" : "border-line hover:border-line-strong",
          isOutOfStock && "opacity-45 grayscale"
        )}
      >
        {qtyBadge}
        <span
          className="flex w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-extrabold text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : item.name.charAt(0)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{item.name}</span>
          <span className="mt-1 flex items-center justify-between gap-1">
            <span className="num text-sm font-bold text-ok">{money(item.price, currency)}</span>
            <span className="flex items-center gap-1">{badges}</span>
          </span>
        </span>
        {isOutOfStock && <SoldOut />}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-item-card
      onClick={() => !isOutOfStock && onSelect(item)}
      disabled={isOutOfStock}
      aria-label={`${item.name}, ${money(item.price, currency)}${cartQty ? `, ${cartQty} in ticket` : ""}`}
      className={cn(
        "press relative flex min-h-[7.25rem] w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-sm",
        cartQty > 0 ? "border-brand/60 ring-1 ring-brand/40" : "border-line hover:border-line-strong",
        isOutOfStock && "opacity-45 grayscale"
      )}
    >
      {qtyBadge}
      {item.image ? (
        <span className="relative block h-24 w-full shrink-0 overflow-hidden bg-surface-2 short:hidden tall:h-28">
          <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
          <span className="absolute left-2 top-2 flex items-center gap-1">{badges}</span>
          {item.isFavorite && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-surface-2/90 text-amber-400 ring-1 ring-line">
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
        </span>
      ) : (
        <span className="flex h-2 w-full shrink-0" style={{ backgroundColor: accent }} aria-hidden />
      )}

      <span className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3">
        {/* Badge row: always for photo-less cards; for photo cards only when the photo is hidden (short screens) */}
        {(hasModifiers || isLowStock || item.isFavorite) && (
          <span className={cn("mb-1 flex items-center gap-1", item.image ? "hidden short:flex" : "flex")}>
            {badges}
            {item.isFavorite && <Star className="h-3.5 w-3.5 fill-current text-amber-400" />}
          </span>
        )}
        <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-fg sm:text-[0.9375rem]">{item.name}</span>
        <span className="mt-2 flex items-baseline justify-between gap-2">
          <span className="num text-base font-bold text-ok sm:text-lg">{money(item.price, currency)}</span>
          {enableDualCurrency && <span className="num truncate text-xs text-fg-subtle">{khr(khrPrice)}</span>}
        </span>
      </span>
      {isOutOfStock && <SoldOut />}
    </button>
  );
});

const SoldOut = () => (
  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg/40">
    <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
      Sold out
    </span>
  </span>
);

import React from "react";
import { SlidersHorizontal, AlertTriangle, Image as ImageIcon } from "lucide-react";
import type { MenuItem, AccessibilitySettings } from "@/types";
import { money, khr } from "@/lib/format";

interface ItemCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  currency: string;
  enableDualCurrency: boolean;
  exchangeRate: number;
  accessibility?: AccessibilitySettings;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onSelect,
  currency,
  enableDualCurrency,
  exchangeRate,
  accessibility = { gridCols: 2, fontSize: "normal" },
}) => {
  const isOutOfStock = item.trackStock && item.stock <= 0;
  const isLowStock = item.trackStock && item.stock > 0 && item.stock <= item.lowStockAt;
  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const khrPrice = item.price * exchangeRate;

  // Accessibility font scaling
  const titleSizeClass =
    accessibility.fontSize === "xlarge"
      ? "text-base font-extrabold"
      : accessibility.fontSize === "large"
      ? "text-sm font-bold"
      : "text-xs sm:text-sm font-bold";

  const priceSizeClass =
    accessibility.fontSize === "xlarge"
      ? "text-lg font-extrabold"
      : accessibility.fontSize === "large"
      ? "text-base font-extrabold"
      : "text-sm sm:text-base font-extrabold";

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(item)}
      disabled={isOutOfStock}
      className={`relative flex flex-col justify-between rounded-2xl text-left transition-all select-none overflow-hidden ${
        isOutOfStock
          ? "bg-slate-900/30 border border-slate-850 opacity-40 cursor-not-allowed"
          : "bg-slate-900/90 active:scale-[0.96] active:bg-slate-800 border border-slate-800 shadow-sm cursor-pointer"
      }`}
      style={{
        borderLeftColor: item.color || "#f97316",
        borderLeftWidth: "3.5px",
      }}
    >
      {/* Optional Item Image Banner */}
      {item.image ? (
        <div className="w-full h-24 sm:h-28 bg-slate-950 relative overflow-hidden flex items-center justify-center">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
        </div>
      ) : null}

      <div className="p-3 flex-1 flex flex-col justify-between w-full">
        {/* Top row: SKU or modifiers pill */}
        <div className="flex items-center justify-between gap-1 w-full mb-1">
          {item.sku ? (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded">
              {item.sku}
            </span>
          ) : <span />}

          <div className="flex items-center gap-1">
            {hasModifiers && (
              <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                +Options
              </span>
            )}
            {item.trackStock && isLowStock && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                {item.stock}
              </span>
            )}
          </div>
        </div>

        {/* Item title */}
        <div className="my-1 flex-1 flex items-center">
          <h4 className={`text-slate-100 leading-snug line-clamp-2 ${titleSizeClass}`}>
            {item.name}
          </h4>
        </div>

        {/* Price row */}
        <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-baseline justify-between w-full">
          <span className={`text-emerald-400 font-mono ${priceSizeClass}`}>
            {money(item.price, currency)}
          </span>
          {enableDualCurrency && (
            <span className="text-[10px] font-mono text-slate-400">
              {khr(khrPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex items-center justify-center">
          <span className="px-2.5 py-1 bg-rose-600/90 text-white font-extrabold text-[11px] rounded-full">
            Sold Out
          </span>
        </div>
      )}
    </button>
  );
};

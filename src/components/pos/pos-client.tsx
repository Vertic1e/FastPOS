"use client";

import {
  Banknote,
  Check,
  Coins,
  CreditCard,
  Layers,
  Minus,
  NotebookPen,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  SearchX,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createOrderAction, type CartLineInput } from "@/app/actions/orders";
import { CategoryIcon } from "@/components/category-icon";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { Modal, PrimaryButton } from "@/components/ui";
import type { ModifierGroup, SelectedModifier } from "@/db/schema";
import { money, round2, khr } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PosCategory = { id: number; name: string; color: string; icon: string };
export type PosItem = {
  id: number;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
  lowStockAt: number;
  color: string;
  categoryId: number | null;
  modifiers: ModifierGroup[];
  sku: string | null;
};

type CartLine = {
  key: string;
  menuItemId: number;
  name: string;
  color: string;
  basePrice: number;
  qty: number;
  modifiers: SelectedModifier[];
  note?: string;
};

type Receipt = {
  orderId: number;
  orderNumber: number;
  total: number;
  totalKhr?: number;
  change: number | null;
  changeKhr?: number | null;
};

const unitOf = (l: Pick<CartLine, "basePrice" | "modifiers">) =>
  round2(l.basePrice + l.modifiers.reduce((s, m) => s + m.price, 0));

const lineKey = (itemId: number, mods: SelectedModifier[], note?: string) =>
  `${itemId}::${mods
    .map((m) => `${m.group}=${m.option}`)
    .sort()
    .join("|")}::${note ?? ""}`;

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export function PosClient({
  categories,
  items,
  taxRate,
  currency,
  secondaryCurrency = "KHR",
  exchangeRate = 4000,
  enableDualCurrency = true,
  posColumns,
  categoryChips,
  cashierName,
  storeName,
}: {
  categories: PosCategory[];
  items: PosItem[];
  taxRate: number;
  currency: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  enableDualCurrency?: boolean;
  posColumns: number;
  categoryChips: boolean;
  cashierName: string;
  storeName: string;
}) {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customizing, setCustomizing] = useState<PosItem | null>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [, startRefresh] = useTransition();
  const restored = useRef(false);

  // Restore draft ticket
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bl_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    localStorage.setItem("bl_cart", JSON.stringify(cart));
  }, [cart]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== "all" && i.categoryId !== activeCat) return false;
      if (q && !i.name.toLowerCase().includes(q) && !(i.sku ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, activeCat, query]);

  const cartQty = (id: number) => cart.filter((l) => l.menuItemId === id).reduce((s, l) => s + l.qty, 0);
  const remaining = (item: PosItem) => (item.trackStock ? item.stock - cartQty(item.id) : Infinity);

  const subtotal = round2(cart.reduce((s, l) => s + unitOf(l) * l.qty, 0));
  const tax = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + tax);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const totalKhr = Math.round(total * exchangeRate);

  function addItem(item: PosItem, qty = 1, mods: SelectedModifier[] = [], note?: string) {
    const key = lineKey(item.id, mods, note);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [
        ...prev,
        { key, menuItemId: item.id, name: item.name, color: item.color, basePrice: item.price, qty, modifiers: mods, note },
      ];
    });
  }

  function quickAdd(item: PosItem) {
    if (item.modifiers.length > 0) {
      setCustomizing(item);
      return;
    }
    if (remaining(item) <= 0) return;
    addItem(item);
  }

  function setQty(key: string, qty: number) {
    const line = cart.find((l) => l.key === key);
    if (!line) return;
    const item = itemById.get(line.menuItemId);
    const siblings = cart.filter((l) => l.menuItemId === line.menuItemId && l.key !== key).reduce((s, l) => s + l.qty, 0);
    let clamped = Math.max(0, qty);
    if (item?.trackStock) clamped = Math.min(clamped, item.stock - siblings);
    setCart((prev) =>
      clamped <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: clamped } : l)),
    );
  }

  function onOrderSuccess(r: Receipt) {
    setReceipt(r);
    setPaying(false);
    setCart([]);
    localStorage.removeItem("bl_cart");
    startRefresh(() => router.refresh());
  }

  const gridCols: Record<number, string> = {
    2: "repeat(2, minmax(0, 1fr))",
    3: "repeat(3, minmax(0, 1fr))",
    4: "repeat(4, minmax(0, 1fr))",
    5: "repeat(5, minmax(0, 1fr))",
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
      {/* ------------------------- Menu side ------------------------- */}
      <section className="flex-1 overflow-y-auto px-4 pb-40 sm:px-6 lg:pb-6">
        <header className="sticky top-14 z-20 -mx-4 bg-cream/95 px-4 pb-3 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-0 lg:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">Register</h1>
                {enableDualCurrency && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Coins size={12} className="text-emerald-600" />
                    1 {currency} = {exchangeRate.toLocaleString()} {secondaryCurrency}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-ink/45">
                {storeName} · cashier {cashierName.split(" ")[0]} · tax {taxRate}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FontSizeToggle />
              <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search menu…"
                  className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
            </div>
          </div>

          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            <CatChip
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
              label="All items"
              icon={<Layers size={15} />}
            />
            {categories.map((c) => (
              <CatChip
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={c.name}
                color={c.color}
                icon={categoryChips ? <CategoryIcon name={c.icon} size={15} /> : undefined}
              />
            ))}
          </div>
        </header>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">
              <SearchX size={22} />
            </div>
            <p className="mt-3 font-display text-[15px] font-semibold">Nothing matches</p>
            <p className="mt-1 text-[13px] text-ink/50">Try a different category or search term.</p>
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: gridCols[Math.min(posColumns, 5)] ?? gridCols[3] }}
          >
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                currency={currency}
                secondaryCurrency={secondaryCurrency}
                exchangeRate={exchangeRate}
                enableDualCurrency={enableDualCurrency}
                inCart={cartQty(item.id)}
                remaining={remaining(item)}
                onClick={() => quickAdd(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------- Ticket side ------------------------ */}
      <aside className="no-print hidden w-[380px] shrink-0 flex-col border-l border-line bg-paper lg:flex">
        <TicketPanel
          cart={cart}
          currency={currency}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
          enableDualCurrency={enableDualCurrency}
          subtotal={subtotal}
          tax={tax}
          total={total}
          count={count}
          setQty={setQty}
          onClear={() => setCart([])}
          onCharge={() => setPaying(true)}
        />
      </aside>

      {/* Mobile cart bar */}
      <button
        onClick={() => setCartOpen(true)}
        className="no-print fixed bottom-[68px] left-4 right-4 z-40 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white shadow-xl transition-transform active:scale-[0.99] lg:hidden"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="relative">
            <ShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold" style={{ background: "var(--accent)" }}>
                {count}
              </span>
            )}
          </span>
          View ticket
        </span>
        <div className="text-right">
          <span className="block font-display text-base font-semibold">{money(total, currency)}</span>
          {enableDualCurrency && (
            <span className="block text-[11px] font-medium text-white/70">
              {totalKhr.toLocaleString()} {secondaryCurrency}
            </span>
          )}
        </div>
      </button>

      {/* Mobile cart sheet */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} width="max-w-md">
        <div className="flex h-[82vh] flex-col">
          <TicketPanel
            cart={cart}
            currency={currency}
            secondaryCurrency={secondaryCurrency}
            exchangeRate={exchangeRate}
            enableDualCurrency={enableDualCurrency}
            subtotal={subtotal}
            tax={tax}
            total={total}
            count={count}
            setQty={setQty}
            onClear={() => setCart([])}
            onCharge={() => {
              setCartOpen(false);
              setPaying(true);
            }}
          />
        </div>
      </Modal>

      {/* Customization sheet */}
      {customizing && (
        <CustomizeModal
          item={customizing}
          currency={currency}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
          enableDualCurrency={enableDualCurrency}
          remaining={remaining(customizing)}
          onClose={() => setCustomizing(null)}
          onAdd={(qty, mods, note) => {
            addItem(customizing, qty, mods, note);
            setCustomizing(null);
          }}
        />
      )}

      {/* Payment */}
      {paying && (
        <PaymentModal
          total={total}
          currency={currency}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
          enableDualCurrency={enableDualCurrency}
          cart={cart}
          onClose={() => setPaying(false)}
          onSuccess={onOrderSuccess}
        />
      )}

      {/* Receipt success */}
      {receipt && (
        <Modal open onClose={() => setReceipt(null)} width="max-w-sm">
          <div className="p-7 text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"
              style={{ background: "var(--accent)", animation: "pulse-ring 1.6s ease-out infinite" }}
            >
              <Check size={30} strokeWidth={3} />
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold">Order #{receipt.orderNumber} paid</h3>
            <div className="mt-1 text-sm text-ink/65">
              <p className="font-semibold text-ink">
                Total {money(receipt.total, currency)}
                {enableDualCurrency && (
                  <span className="text-emerald-700">
                    {" "}· {(receipt.totalKhr ?? Math.round(receipt.total * exchangeRate)).toLocaleString()} {secondaryCurrency}
                  </span>
                )}
              </p>
              {receipt.change !== null && receipt.change > 0 && (
                <p className="mt-1 font-medium text-emerald-600">
                  Change due {money(receipt.change, currency)}
                  {enableDualCurrency && (
                    <span>
                      {" "}· {(receipt.changeKhr ?? Math.round(receipt.change * exchangeRate)).toLocaleString()} {secondaryCurrency}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <a
                href={`/receipt/${receipt.orderId}?auto=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold transition-all hover:border-ink/30 hover:shadow-sm"
              >
                <Printer size={16} />
                Print receipt
              </a>
              <PrimaryButton onClick={() => setReceipt(null)} className="!py-3">
                New order
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category chip                                                       */
/* ------------------------------------------------------------------ */

function CatChip({
  active,
  onClick,
  label,
  icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
        active
          ? "border-transparent text-white shadow-sm"
          : "border-line bg-white text-ink/60 hover:border-ink/25 hover:text-ink"
      }`}
      style={active ? { background: color ?? "var(--accent)" } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Item card                                                           */
/* ------------------------------------------------------------------ */

function ItemCard({
  item,
  currency,
  secondaryCurrency,
  exchangeRate,
  enableDualCurrency,
  inCart,
  remaining,
  onClick,
}: {
  item: PosItem;
  currency: string;
  secondaryCurrency: string;
  exchangeRate: number;
  enableDualCurrency: boolean;
  inCart: number;
  remaining: number;
  onClick: () => void;
}) {
  const soldOut = item.trackStock && remaining <= 0;
  const low = item.trackStock && !soldOut && remaining <= item.lowStockAt;
  const khrPrice = Math.round(item.price * exchangeRate);

  return (
    <button
      onClick={onClick}
      disabled={soldOut}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all ${
        soldOut
          ? "cursor-not-allowed border-line opacity-55"
          : "border-line hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-lg active:scale-[0.98]"
      }`}
    >
      <div
        className="relative flex h-[76px] items-center justify-between px-3.5"
        style={{ background: `linear-gradient(135deg, ${item.color}22, ${item.color}44)` }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: item.color }}
        >
          {item.modifiers.length > 0 ? <Layers size={16} /> : <Plus size={16} strokeWidth={2.5} />}
        </span>
        <div className="text-right">
          <span className="block font-display text-[15px] font-bold tabular-nums" style={{ color: item.color }}>
            {money(item.price, currency)}
          </span>
          {enableDualCurrency && (
            <span className="block text-[11px] font-medium tabular-nums opacity-75" style={{ color: item.color }}>
              {khrPrice.toLocaleString()} {secondaryCurrency}
            </span>
          )}
        </div>
        {inCart > 0 && (
          <span className="absolute right-2.5 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[10px] font-bold text-white">
            {inCart}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 px-3.5 py-3">
        <p className="text-[13px] font-semibold leading-snug">{item.name}</p>
        <div className="flex items-center justify-between">
          {soldOut ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
              Sold out
            </span>
          ) : low ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {remaining} left
            </span>
          ) : item.trackStock ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/30">
              {item.stock} in stock
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/30">Made to order</span>
          )}
          <span className="text-[14px] font-bold text-ink/0 transition-colors group-hover:text-[var(--accent)]">
            <Plus size={15} strokeWidth={3} />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Ticket                                                              */
/* ------------------------------------------------------------------ */

function TicketPanel({
  cart,
  currency,
  secondaryCurrency,
  exchangeRate,
  enableDualCurrency,
  subtotal,
  tax,
  total,
  count,
  setQty,
  onClear,
  onCharge,
}: {
  cart: CartLine[];
  currency: string;
  secondaryCurrency: string;
  exchangeRate: number;
  enableDualCurrency: boolean;
  subtotal: number;
  tax: number;
  total: number;
  count: number;
  setQty: (key: string, qty: number) => void;
  onClear: () => void;
  onCharge: () => void;
}) {
  const subtotalKhr = Math.round(subtotal * exchangeRate);
  const taxKhr = Math.round(tax * exchangeRate);
  const totalKhr = Math.round(total * exchangeRate);

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Current ticket</h2>
          <p className="text-[12px] text-ink/45">{count} item{count === 1 ? "" : "s"}</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink/45 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <RotateCcw size={13} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/30">
              <ReceiptText size={26} strokeWidth={1.6} />
            </div>
            <p className="mt-4 font-display text-[15px] font-semibold">Ticket is empty</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/45">
              Tap items on the menu to start an order. Drafts are saved automatically.
            </p>
          </div>
        ) : (
          <div className="anim-fade space-y-1.5">
            {cart.map((l) => {
              const unit = unitOf(l);
              const lineTot = round2(unit * l.qty);
              const lineTotKhr = Math.round(lineTot * exchangeRate);
              return (
                <div key={l.key} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{l.name}</p>
                      {l.modifiers.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-ink/45">
                          {l.modifiers
                            .map(
                              (m) =>
                                `${m.option}${
                                  m.price > 0 ? ` +${money(m.price, currency)}` : ""
                                }`,
                            )
                            .join(" · ")}
                        </p>
                      )}
                      {l.note && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] italic text-ink/40">
                          <NotebookPen size={10} /> {l.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{money(lineTot, currency)}</p>
                      {enableDualCurrency && (
                        <p className="text-[11px] font-medium text-ink/45 tabular-nums">
                          {lineTotKhr.toLocaleString()} {secondaryCurrency}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-full bg-ink/[0.05] p-1">
                      <button
                        onClick={() => setQty(l.key, l.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90"
                        aria-label="Decrease"
                      >
                        {l.qty === 1 ? <Trash2 size={13} className="text-red-500" /> : <Minus size={13} />}
                      </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                      <button
                        onClick={() => setQty(l.key, l.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90"
                        aria-label="Increase"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-[11px] font-medium text-ink/40">
                      {l.qty > 1 ? `${money(unit, currency)} each` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-paper px-5 py-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-ink/60">
            <dt>Subtotal</dt>
            <dd className="text-right tabular-nums">
              <span>{money(subtotal, currency)}</span>
              {enableDualCurrency && (
                <span className="block text-[11px] text-ink/40">
                  {subtotalKhr.toLocaleString()} {secondaryCurrency}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between text-ink/60">
            <dt>Tax</dt>
            <dd className="text-right tabular-nums">
              <span>{money(tax, currency)}</span>
              {enableDualCurrency && (
                <span className="block text-[11px] text-ink/40">
                  {taxKhr.toLocaleString()} {secondaryCurrency}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between border-t border-dashed border-ink/15 pt-2 font-display text-lg font-semibold text-ink">
            <dt>Total</dt>
            <dd className="text-right tabular-nums">
              <div>{money(total, currency)}</div>
              {enableDualCurrency && (
                <div className="text-[13px] font-bold text-emerald-700">
                  {totalKhr.toLocaleString()} {secondaryCurrency}
                </div>
              )}
            </dd>
          </div>
        </dl>
        <PrimaryButton
          onClick={onCharge}
          disabled={cart.length === 0}
          className="mt-4 w-full !py-3.5 !text-[15px]"
        >
          Charge {money(total, currency)}
          {enableDualCurrency && ` (${totalKhr.toLocaleString()} ${secondaryCurrency})`}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customize modal                                                     */
/* ------------------------------------------------------------------ */

function CustomizeModal({
  item,
  currency,
  secondaryCurrency,
  exchangeRate,
  enableDualCurrency,
  remaining,
  onClose,
  onAdd,
}: {
  item: PosItem;
  currency: string;
  secondaryCurrency: string;
  exchangeRate: number;
  enableDualCurrency: boolean;
  remaining: number;
  onClose: () => void;
  onAdd: (qty: number, mods: SelectedModifier[], note?: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<Record<string, SelectedModifier[]>>(() => {
    const init: Record<string, SelectedModifier[]> = {};
    for (const g of item.modifiers) {
      if (g.required && g.options.length > 0) {
        init[g.name] = [{ group: g.name, option: g.options[0].name, price: g.options[0].price }];
      }
    }
    return init;
  });
  const [note, setNote] = useState("");

  const mods: SelectedModifier[] = Object.values(picked).flat();
  const unit = round2(item.price + mods.reduce((s, m) => s + m.price, 0));
  const lineTotal = round2(unit * qty);
  const lineTotalKhr = Math.round(lineTotal * exchangeRate);

  function toggle(group: ModifierGroup, optName: string, price: number) {
    setPicked((prev) => {
      const current = prev[group.name] ?? [];
      const exists = current.find((m) => m.option === optName);
      if (group.required) {
        return { ...prev, [group.name]: [{ group: group.name, option: optName, price }] };
      }
      return {
        ...prev,
        [group.name]: exists
          ? current.filter((m) => m.option !== optName)
          : [...current, { group: group.name, option: optName, price }],
      };
    });
  }

  return (
    <Modal open onClose={onClose} width="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-3.5 pr-8">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: item.color }}
          >
            {item.name[0]}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{item.name}</h3>
            <p className="text-[12px] text-ink/45">
              Base {money(item.price, currency)}
              {enableDualCurrency && ` (${Math.round(item.price * exchangeRate).toLocaleString()} ${secondaryCurrency})`}
              {item.trackStock && <> · {Math.max(0, remaining)} available</>}
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-[46vh] space-y-5 overflow-y-auto pr-1">
          {item.modifiers.map((g) => (
            <div key={g.name}>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink/45">
                {g.name}
                <span className="ml-2 font-normal normal-case tracking-normal text-ink/35">
                  {g.required ? "pick one" : "optional"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {g.options.map((opt) => {
                  const active = (picked[g.name] ?? []).some((m) => m.option === opt.name);
                  return (
                    <button
                      key={opt.name}
                      onClick={() => toggle(g, opt.name, opt.price)}
                      className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                        active
                          ? "border-transparent text-white shadow-sm"
                          : "border-line bg-white text-ink/65 hover:border-ink/25"
                      }`}
                      style={active ? { background: "var(--accent)" } : undefined}
                    >
                      {opt.name}
                      {opt.price > 0 && (
                        <span className={active ? "text-white/75" : "text-ink/40"}>
                          {" "}+{money(opt.price, currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink/45">
              Kitchen note
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="e.g. no onions, allergy: nuts"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-ink/[0.05] p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm active:scale-90"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center font-display text-base font-bold tabular-nums">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(item.trackStock ? Math.max(1, remaining) : 99, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>
          <PrimaryButton className="flex-1 !py-3" onClick={() => onAdd(qty, mods, note || undefined)}>
            Add · {money(lineTotal, currency)}
            {enableDualCurrency && ` (${lineTotalKhr.toLocaleString()} ${secondaryCurrency})`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Payment modal                                                       */
/* ------------------------------------------------------------------ */

function PaymentModal({
  total,
  currency,
  secondaryCurrency = "KHR",
  exchangeRate = 4000,
  enableDualCurrency = true,
  cart,
  onClose,
  onSuccess,
}: {
  total: number;
  currency: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  enableDualCurrency?: boolean;
  cart: CartLine[];
  onClose: () => void;
  onSuccess: (r: Receipt) => void;
}) {
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [tenderMode, setTenderMode] = useState<"usd" | "khr" | "mixed">("usd");
  const [tenderedUsd, setTenderedUsd] = useState<string>("");
  const [tenderedKhr, setTenderedKhr] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalKhr = Math.round(total * exchangeRate);

  const usdNum = parseFloat(tenderedUsd) || 0;
  const khrNum = parseInt(tenderedKhr.replace(/,/g, ""), 10) || 0;

  // Effective tendered calculation in USD & KHR
  let effectiveUsdTendered = 0;
  if (tenderMode === "usd") {
    effectiveUsdTendered = usdNum;
  } else if (tenderMode === "khr") {
    effectiveUsdTendered = round2(khrNum / exchangeRate);
  } else {
    effectiveUsdTendered = round2(usdNum + khrNum / exchangeRate);
  }

  const changeUsd = method === "cash" ? round2(effectiveUsdTendered - total) : 0;
  const changeKhr = method === "cash" ? Math.round(changeUsd * exchangeRate) : 0;
  const canPay = !busy && (method === "card" || changeUsd >= -0.001);

  // Quick preset suggestions for USD
  const quickUsdBills = (() => {
    const bills = [5, 10, 20, 50, 100];
    const out = new Set<number>([round2(total)]);
    for (const b of bills) if (b >= total) out.add(b);
    const ceil10 = Math.ceil(total / 10) * 10;
    if (ceil10 >= total) out.add(ceil10);
    return [...out].sort((a, b) => a - b).slice(0, 5);
  })();

  // Quick preset suggestions for KHR
  const quickKhrBills = (() => {
    const bills = [10000, 20000, 50000, 100000, 200000];
    const out = new Set<number>([totalKhr]);
    for (const b of bills) if (b >= totalKhr) out.add(b);
    const ceil10k = Math.ceil(totalKhr / 10000) * 10000;
    if (ceil10k >= totalKhr) out.add(ceil10k);
    return [...out].sort((a, b) => a - b).slice(0, 5);
  })();

  async function submit() {
    setBusy(true);
    setError(null);
    const lines: CartLineInput[] = cart.map((l) => ({
      menuItemId: l.menuItemId,
      qty: l.qty,
      modifiers: l.modifiers,
      note: l.note,
    }));

    let cashReceived: number | undefined = undefined;
    let cashReceivedKhr: number | undefined = undefined;

    if (method === "cash") {
      if (tenderMode === "usd") {
        cashReceived = usdNum;
      } else if (tenderMode === "khr") {
        cashReceivedKhr = khrNum;
      } else {
        cashReceived = usdNum > 0 ? usdNum : undefined;
        cashReceivedKhr = khrNum > 0 ? khrNum : undefined;
      }
    }

    const result = await createOrderAction({
      lines,
      paymentMethod: method,
      cashReceived,
      cashReceivedKhr,
    });

    if (result.ok) {
      onSuccess({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        total: result.total,
        totalKhr: result.totalKhr,
        change: result.change,
        changeKhr: result.changeKhr,
      });
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={busy ? () => {} : onClose} width="max-w-md">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink/40">Payment</p>
          {enableDualCurrency && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
              1 {currency} = {exchangeRate.toLocaleString()} {secondaryCurrency}
            </span>
          )}
        </div>

        {/* Dual Total Display */}
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight tabular-nums">
              {money(total, currency)}
            </p>
          </div>
          {enableDualCurrency && (
            <div className="text-right">
              <span className="block font-display text-2xl font-bold text-emerald-700 tabular-nums">
                {totalKhr.toLocaleString()} {secondaryCurrency}
              </span>
              <span className="text-[11px] font-medium text-ink/40">KHR equivalent</span>
            </div>
          )}
        </div>

        {/* Payment Method Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(
            [
              { key: "cash", label: "Cash", icon: Banknote },
              { key: "card", label: "Card", icon: CreditCard },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                method === m.key
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-ink"
                  : "border-line bg-white text-ink/55 hover:border-ink/25"
              }`}
            >
              <m.icon size={17} style={method === m.key ? { color: "var(--accent)" } : undefined} />
              {m.label}
            </button>
          ))}
        </div>

        {method === "cash" && (
          <div className="anim-fade mt-4 space-y-3">
            {/* Tender Currency Tabs */}
            {enableDualCurrency && (
              <div className="flex rounded-xl bg-ink/5 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTenderMode("usd");
                    setTenderedKhr("");
                  }}
                  className={`flex-1 rounded-lg py-1.5 transition-all ${
                    tenderMode === "usd"
                      ? "bg-white text-ink shadow-xs font-bold"
                      : "text-ink/50 hover:text-ink"
                  }`}
                >
                  Pay USD ({currency})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTenderMode("khr");
                    setTenderedUsd("");
                  }}
                  className={`flex-1 rounded-lg py-1.5 transition-all ${
                    tenderMode === "khr"
                      ? "bg-white text-ink shadow-xs font-bold"
                      : "text-ink/50 hover:text-ink"
                  }`}
                >
                  Pay KHR ({secondaryCurrency})
                </button>
                <button
                  type="button"
                  onClick={() => setTenderMode("mixed")}
                  className={`flex-1 rounded-lg py-1.5 transition-all ${
                    tenderMode === "mixed"
                      ? "bg-white text-ink shadow-xs font-bold"
                      : "text-ink/50 hover:text-ink"
                  }`}
                >
                  Mixed (${"+"}៛)
                </button>
              </div>
            )}

            {/* Quick Banknotes for USD */}
            {tenderMode === "usd" && (
              <div className="flex flex-wrap gap-2">
                {quickUsdBills.map((q, i) => (
                  <button
                    key={q}
                    onClick={() => setTenderedUsd(String(q))}
                    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all active:scale-95 ${
                      usdNum === q ? "border-transparent bg-ink text-white" : "border-line bg-white hover:border-ink/30"
                    }`}
                  >
                    {i === 0 && q === round2(total) ? "Exact" : money(q, currency)}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Banknotes for KHR */}
            {tenderMode === "khr" && (
              <div className="flex flex-wrap gap-2">
                {quickKhrBills.map((q, i) => (
                  <button
                    key={q}
                    onClick={() => setTenderedKhr(String(q))}
                    className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all active:scale-95 ${
                      khrNum === q ? "border-transparent bg-ink text-white" : "border-line bg-white hover:border-ink/30"
                    }`}
                  >
                    {i === 0 && q === totalKhr ? "Exact KHR" : `${q.toLocaleString()} ${secondaryCurrency}`}
                  </button>
                ))}
              </div>
            )}

            {/* Inputs area */}
            <div className="space-y-2">
              {(tenderMode === "usd" || tenderMode === "mixed") && (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/40">
                    {currency}
                  </span>
                  <input
                    value={tenderedUsd}
                    onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setTenderedUsd(e.target.value)}
                    inputMode="decimal"
                    placeholder="Cash received in USD"
                    className="w-full rounded-xl border border-line bg-white py-2.5 pl-8 pr-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
              )}

              {(tenderMode === "khr" || tenderMode === "mixed") && (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/40">
                    {secondaryCurrency}
                  </span>
                  <input
                    value={tenderedKhr}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d]/g, "");
                      setTenderedKhr(clean ? parseInt(clean, 10).toLocaleString("en-US") : "");
                    }}
                    inputMode="numeric"
                    placeholder="Cash received in KHR (e.g. 50,000)"
                    className="w-full rounded-xl border border-line bg-white py-2.5 pl-12 pr-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
              )}
            </div>

            {/* Change Calculation in both Currencies */}
            <div className="rounded-xl border border-line bg-ink/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Change Due</p>
                  <p className="text-[11px] text-ink/40">
                    {changeUsd < 0 ? "Underpaid" : "Return in USD or KHR"}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-xl font-bold tabular-nums ${
                      changeUsd < 0 ? "text-red-500" : "text-emerald-600"
                    }`}
                  >
                    {changeUsd < 0 ? "—" : money(changeUsd, currency)}
                  </p>
                  {enableDualCurrency && changeUsd >= 0 && (
                    <p className="text-xs font-bold text-emerald-700 tabular-nums">
                      {changeKhr.toLocaleString()} {secondaryCurrency}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="anim-pop mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink/60 transition-colors hover:text-ink disabled:opacity-40"
          >
            <X size={16} />
          </button>
          <PrimaryButton onClick={submit} disabled={!canPay} busy={busy} className="flex-1 !py-3">
            {method === "cash" ? "Complete cash sale" : "Charge card"} · {money(total, currency)}
            {enableDualCurrency && ` (${totalKhr.toLocaleString()} ${secondaryCurrency})`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

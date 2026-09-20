import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, X, Layers, ShoppingBag, ChevronUp, Calculator, Star, ScanBarcode, PackageSearch } from "lucide-react";
import confetti from "canvas-confetti";
import { db } from "@/db";
import type { MenuItem, CartLine, HeldTicket, Order, OrderItem, StoreSettings, Shift, PaymentMethod } from "@/types";
import { ItemCard } from "./ItemCard";
import { ModifierModal } from "./ModifierModal";
import { CartDrawer, type CheckoutData } from "./CartDrawer";
import { PaymentModal } from "./PaymentModal";
import { ReceiptModal } from "./ReceiptModal";
import { HeldTicketsModal } from "./HeldTicketsModal";
import { NumericKeypadModal } from "./NumericKeypadModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { playTapSound, playBeepSound } from "@/lib/sounds";
import { money, round2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useIsSplit } from "@/lib/media";
import { Modal, Button, Kbd, EmptyState, useToast } from "@/components/ui";

interface PosRegisterProps {
  settings: StoreSettings;
  activeShift?: Shift;
  isHeldModalOpen: boolean;
  setIsHeldModalOpen: (open: boolean) => void;
  isShortcutsOpen?: boolean;
  setIsShortcutsOpen?: (open: boolean) => void;
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  settings,
  activeShift,
  isHeldModalOpen,
  setIsHeldModalOpen,
  isShortcutsOpen = false,
  setIsShortcutsOpen,
}) => {
  const activeShopId = settings.activeShopId || 1;
  const toast = useToast();
  const isSplit = useIsSplit();

  const categories =
    useLiveQuery(() => db.categories.filter((c) => c.isActive && (!c.shopId || c.shopId === activeShopId)).sortBy("sortOrder"), [activeShopId]) || [];
  const items = useLiveQuery(() => db.menuItems.filter((i) => i.isActive && (!i.shopId || i.shopId === activeShopId)).toArray(), [activeShopId]) || [];
  const heldTickets = useLiveQuery(() => db.heldTickets.filter((h) => !h.shopId || h.shopId === activeShopId).toArray(), [activeShopId]) || [];

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [tableName, setTableName] = useState("");
  const [activeItemForMod, setActiveItemForMod] = useState<MenuItem | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [localShortcutsOpen, setLocalShortcutsOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedOrderItems, setCompletedOrderItems] = useState<OrderItem[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const showShortcuts = isShortcutsOpen || localShortcutsOpen;
  const handleCloseShortcuts = () => {
    setIsShortcutsOpen?.(false);
    setLocalShortcutsOpen(false);
  };

  // Close the cart sheet automatically when the layout switches to split mode
  useEffect(() => {
    if (isSplit) setIsCartSheetOpen(false);
  }, [isSplit]);

  /* ------------------------------ Derived data ------------------------------ */
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (showFavoritesOnly && !item.isFavorite) return false;
      const matchCat = selectedCatId === null || item.categoryId === selectedCatId;
      const matchSearch = q === "" || item.name.toLowerCase().includes(q) || (item.sku ? item.sku.toLowerCase().includes(q) : false);
      return matchCat && matchSearch;
    });
  }, [items, selectedCatId, searchQuery, showFavoritesOnly]);

  const favoritesCount = useMemo(() => items.filter((i) => i.isFavorite).length, [items]);

  const totalCartQty = cartLines.reduce((s, l) => s + l.qty, 0);
  const rawCartSubtotal = cartLines.reduce((sum, line) => {
    const modTotal = line.modifiers.reduce((m, x) => m + x.price, 0);
    return sum + (line.basePrice + modTotal) * line.qty;
  }, 0);
  const cartTax = round2((rawCartSubtotal * settings.taxRate) / 100);
  const cartTotal = round2(rawCartSubtotal + cartTax);

  const cartItemCounts = useMemo(
    () =>
      cartLines.reduce(
        (acc, line) => {
          acc[line.menuItemId] = (acc[line.menuItemId] || 0) + line.qty;
          return acc;
        },
        {} as Record<number, number>
      ),
    [cartLines]
  );

  /* ------------------------------ Cart mutations ------------------------------ */
  const addSimpleItem = useCallback((item: MenuItem) => {
    const key = `${item.id}--`;
    setCartLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { key, menuItemId: item.id!, name: item.name, color: item.color, basePrice: item.price, qty: 1, modifiers: [] }];
    });
  }, []);

  const handleSelectItem = useCallback(
    (item: MenuItem) => {
      playTapSound(settings.soundEnabled);
      if (item.modifiers && item.modifiers.length > 0) setActiveItemForMod(item);
      else addSimpleItem(item);
    },
    [settings.soundEnabled, addSimpleItem]
  );

  const handleAddCustomItem = (amount: number, name: string) => {
    playTapSound(settings.soundEnabled);
    setCartLines((prev) => [...prev, { key: `custom-${Date.now()}`, menuItemId: 0, name, color: "#0F766E", basePrice: amount, qty: 1, modifiers: [] }]);
  };

  const handleAddCustomizedLine = (line: CartLine) => {
    setCartLines((prev) => {
      const idx = prev.findIndex((l) => l.key === line.key);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + line.qty };
        return next;
      }
      return [...prev, line];
    });
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCartLines((prev) =>
      prev
        .map((l) => (l.key === key ? (l.qty + delta > 0 ? { ...l, qty: l.qty + delta } : null) : l))
        .filter((l): l is CartLine => l !== null)
    );
  };
  const handleRemoveLine = (key: string) => setCartLines((prev) => prev.filter((l) => l.key !== key));
  const resetTicket = () => {
    setCartLines([]);
    setTableName("");
    setIsCartSheetOpen(false);
  };

  const handleHoldTicket = async (name: string) => {
    if (cartLines.length === 0) return;
    await db.heldTickets.add({
      shopId: activeShopId,
      name,
      tableNumber: name,
      itemCount: totalCartQty,
      subtotal: round2(rawCartSubtotal),
      lines: cartLines,
      createdAt: new Date(),
    });
    resetTicket();
    playBeepSound(settings.soundEnabled);
    toast({ title: "Ticket held", description: `${name} — ${totalCartQty} ${totalCartQty === 1 ? "item" : "items"}`, tone: "info" });
  };

  const handleResumeTicket = (ticket: HeldTicket) => {
    if (cartLines.length > 0) {
      // Merge instead of silently discarding the current ticket
      setCartLines((prev) => [...prev, ...ticket.lines.filter((l) => !prev.some((p) => p.key === l.key))]);
    } else {
      setCartLines(ticket.lines);
    }
    setTableName(ticket.tableNumber && ticket.tableNumber !== "Ticket" ? ticket.tableNumber : "");
    if (ticket.id != null) db.heldTickets.delete(ticket.id);
    setIsHeldModalOpen(false);
    playTapSound(settings.soundEnabled);
    if (!isSplit) setIsCartSheetOpen(true);
  };

  const handleDeleteHeldTicket = async (id: number) => {
    await db.heldTickets.delete(id);
  };

  /* ------------------------------ Checkout ------------------------------ */
  const buildCheckoutData = (): CheckoutData => ({
    subtotal: round2(rawCartSubtotal),
    tax: cartTax,
    total: cartTotal,
    totalKhr: Math.round(cartTotal * settings.exchangeRate),
    tableName: tableName.trim() || "Walk-in",
  });

  const persistOrder = async (
    data: CheckoutData,
    details: { paymentMethod: PaymentMethod; cashReceived?: number; changeDue?: number; cashReceivedKhr?: number; changeDueKhr?: number }
  ) => {
    const totalOrdersCount = await db.orders.count();
    const orderNumber = 1001 + totalOrdersCount;

    const newOrder: Order = {
      shopId: activeShopId,
      orderNumber,
      status: "completed",
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      totalKhr: data.totalKhr,
      paymentMethod: details.paymentMethod,
      cashReceived: details.cashReceived,
      changeDue: details.changeDue,
      cashReceivedKhr: details.cashReceivedKhr,
      changeDueKhr: details.changeDueKhr,
      exchangeRate: settings.exchangeRate,
      itemCount: totalCartQty,
      cashierName: activeShift?.openedBy || "Cashier",
      tableNumber: data.tableName,
      shiftId: activeShift?.id,
      createdAt: new Date(),
    };

    const orderId = (await db.orders.add(newOrder)) as number;
    newOrder.id = orderId;

    const orderItemsToInsert: OrderItem[] = cartLines.map((line) => {
      const modTotal = line.modifiers.reduce((m, x) => m + x.price, 0);
      const unitPrice = round2(line.basePrice + modTotal);
      return {
        orderId,
        menuItemId: line.menuItemId,
        name: line.name,
        unitPrice,
        qty: line.qty,
        modifiers: line.modifiers,
        note: line.note,
        lineTotal: round2(unitPrice * line.qty),
      };
    });
    await db.orderItems.bulkAdd(orderItemsToInsert);

    // Stock decrement
    for (const line of cartLines) {
      if (line.menuItemId > 0) {
        const product = await db.menuItems.get(line.menuItemId);
        if (product && product.trackStock) {
          await db.menuItems.update(product.id!, { stock: Math.max(0, product.stock - line.qty) });
          await db.stockMovements.add({ itemId: product.id!, delta: -line.qty, reason: "sale", note: `Order #${orderNumber}`, createdAt: new Date() });
        }
      }
    }

    // Shift totals
    if (activeShift?.id) {
      const shift = await db.shifts.get(activeShift.id);
      if (shift) {
        const isCash = details.paymentMethod === "cash";
        const isCard = details.paymentMethod === "card";
        const isQr = details.paymentMethod === "khqr";
        const prevExpCash = shift.expectedCashUsd || shift.openingCashUsd;
        await db.shifts.update(shift.id!, {
          totalSalesUsd: round2((shift.totalSalesUsd || 0) + data.total),
          totalOrders: (shift.totalOrders || 0) + 1,
          cashSalesUsd: isCash ? round2((shift.cashSalesUsd || 0) + data.total) : shift.cashSalesUsd || 0,
          cardSalesUsd: isCard ? round2((shift.cardSalesUsd || 0) + data.total) : shift.cardSalesUsd || 0,
          qrSalesUsd: isQr ? round2((shift.qrSalesUsd || 0) + data.total) : shift.qrSalesUsd || 0,
          expectedCashUsd: isCash ? round2(prevExpCash + data.total) : prevExpCash,
        });
      }
    }

    setCompletedOrder(newOrder);
    setCompletedOrderItems(orderItemsToInsert);
    setCheckoutData(null);
    resetTicket();
  };

  const handleQuickCashCheckout = async (data: CheckoutData) => {
    playTapSound(settings.soundEnabled);
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#0F766E", "#F97316", "#10B981", "#3B82F6"] });
    } catch {
      // ignore
    }
    await persistOrder(data, { paymentMethod: "cash", cashReceived: data.total, changeDue: 0, cashReceivedKhr: data.totalKhr, changeDueKhr: 0 });
  };

  const handleCompleteOrder = async (details: { paymentMethod: PaymentMethod; cashReceived?: number; changeDue?: number; cashReceivedKhr?: number; changeDueKhr?: number }) => {
    if (!checkoutData) return;
    await persistOrder(checkoutData, details);
  };

  const openCheckout = () => {
    if (cartLines.length === 0) return;
    setCheckoutData(buildCheckoutData());
  };

  /* ------------------------------ Search / barcode ------------------------------ */
  const handleSearchSubmit = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const exact = items.find((i) => i.sku && i.sku.toLowerCase() === q);
    const target = exact || (filteredItems.length === 1 ? filteredItems[0] : undefined);
    if (!target) {
      playBeepSound(settings.soundEnabled);
      toast({ title: "No match", description: `Nothing matches “${searchQuery.trim()}”.`, tone: "warning" });
      return;
    }
    if (target.trackStock && target.stock <= 0) {
      toast({ title: "Sold out", description: `${target.name} has no stock left.`, tone: "error" });
      return;
    }
    handleSelectItem(target);
    setSearchQuery("");
  };

  /* ------------------------------ Keyboard shortcuts ------------------------------ */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      const anyDialogOpen = !!checkoutData || !!completedOrder || !!activeItemForMod || isKeypadOpen || isHeldModalOpen || showShortcuts;

      if (e.key === "/" && !isTyping && !anyDialogOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "?" && !isTyping && !anyDialogOpen) {
        e.preventDefault();
        if (setIsShortcutsOpen) setIsShortcutsOpen(true);
        else setLocalShortcutsOpen(true);
        return;
      }
      if (e.key === "Escape" && !anyDialogOpen) {
        if (isCartSheetOpen) setIsCartSheetOpen(false);
        else if (searchQuery) setSearchQuery("");
        return;
      }
      if (anyDialogOpen) return;
      if ((e.key === "F2" || (e.ctrlKey && e.key === "Enter")) && cartLines.length > 0) {
        e.preventDefault();
        openCheckout();
        return;
      }
      if (e.key === "F4" && cartLines.length > 0) {
        e.preventDefault();
        void handleHoldTicket(tableName.trim() || "Ticket");
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        setIsHeldModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  /* ------------------------------ Render ------------------------------ */
  const density: "comfortable" | "compact" = settings.accessibility?.gridCols === 3 ? "compact" : "comfortable";
  const gridClass =
    density === "compact"
      ? "grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-2"
      : "grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] sm:gap-3";

  const cartPanel = (
    <CartDrawer
      lines={cartLines}
      onUpdateQty={handleUpdateQty}
      onRemoveLine={handleRemoveLine}
      onClearCart={resetTicket}
      onHoldTicket={handleHoldTicket}
      onOpenPayment={(data) => setCheckoutData(data)}
      onQuickCashCheckout={handleQuickCashCheckout}
      settings={settings}
      variant={isSplit ? "panel" : "sheet"}
      onClose={() => setIsCartSheetOpen(false)}
      tableName={tableName}
      onTableNameChange={setTableName}
    />
  );

  const chipBase = "press flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap";
  const chipOn = "border-brand bg-brand text-white shadow-sm shadow-brand/30";
  const chipOff = "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden split:flex-row">
      {/* ------------------------------ Catalog ------------------------------ */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Catalog">
        <div className="shrink-0 space-y-2 border-b border-line bg-surface/70 p-2 backdrop-blur sm:p-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-fg-subtle">
                <Search className="h-4.5 w-4.5" />
                <ScanBarcode className="hidden h-4 w-4 sm:block" />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                inputMode="search"
                enterKeyHint="go"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchSubmit();
                  } else if (e.key === "Escape") {
                    setSearchQuery("");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Search or scan barcode"
                aria-label="Search items or scan barcode"
                className="h-11 w-full rounded-2xl border border-line bg-surface-2 pl-10 pr-11 text-base text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:pl-16 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                {searchQuery ? (
                  <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="press flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-3 hover:text-fg">
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Kbd className="hidden sm:inline-flex">/</Kbd>
                )}
              </span>
            </div>
            <Button variant="secondary" size="lg" onClick={() => setIsKeypadOpen(true)} data-open-keypad title="Custom amount" aria-label="Custom amount keypad" className="shrink-0 px-3">
              <Calculator className="h-5 w-5" />
              <span className="hidden md:inline">Keypad</span>
            </Button>
          </div>

          {/* Categories */}
          <div className="scroll-x -mx-2 flex items-center gap-1.5 px-2 sm:-mx-3 sm:px-3" role="tablist" aria-label="Categories">
            <button
              type="button"
              role="tab"
              aria-selected={selectedCatId === null && !showFavoritesOnly}
              onClick={() => {
                setSelectedCatId(null);
                setShowFavoritesOnly(false);
              }}
              className={cn(chipBase, selectedCatId === null && !showFavoritesOnly ? chipOn : chipOff)}
            >
              <Layers className="h-4 w-4" />
              All
              <span className="num opacity-70">{items.length}</span>
            </button>
            {favoritesCount > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={showFavoritesOnly}
                onClick={() => {
                  setShowFavoritesOnly((v) => !v);
                  setSelectedCatId(null);
                }}
                className={cn(chipBase, showFavoritesOnly ? "border-amber-400 bg-amber-400 text-slate-950 shadow-sm" : chipOff)}
              >
                <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                Favorites
              </button>
            )}
            {categories.map((cat) => {
              const selected = selectedCatId === cat.id && !showFavoritesOnly;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedCatId(cat.id!);
                    setShowFavoritesOnly(false);
                  }}
                  className={cn(chipBase, selected ? chipOn : chipOff)}
                  style={selected ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
                >
                  <CategoryIcon name={cat.icon} className="h-4 w-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<PackageSearch />}
              title={searchQuery ? `No results for “${searchQuery}”` : showFavoritesOnly ? "No favorites yet" : "No items in this category"}
              description={searchQuery ? "Try a different name or SKU." : "Add items from Inventory, or star items to make them favorites."}
              action={
                searchQuery || showFavoritesOnly || selectedCatId !== null ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setShowFavoritesOnly(false);
                      setSelectedCatId(null);
                    }}
                  >
                    Show all items
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <div className={cn("grid", gridClass, !isSplit && cartLines.length > 0 && "pb-2")}>
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                  currency={settings.currency}
                  enableDualCurrency={settings.enableDualCurrency}
                  exchangeRate={settings.exchangeRate}
                  density={density}
                  cartQty={cartItemCounts[item.id!] || 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ticket summary bar (stacked layouts) */}
        {!isSplit && (
          <div className="shrink-0 border-t border-line bg-surface/95 p-2 backdrop-blur-md">
            <button
              type="button"
              data-open-cart
              onClick={() => setIsCartSheetOpen(true)}
              aria-label={cartLines.length ? `Open ticket, ${totalCartQty} items, ${money(cartTotal, settings.currency)}` : "Open ticket"}
              className={cn(
                "press flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left shadow-md tall:h-14",
                cartLines.length > 0 ? "bg-brand text-white shadow-brand/30" : "border border-line bg-surface-2 text-fg-muted shadow-none"
              )}
            >
              <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl tall:h-10 tall:w-10", cartLines.length > 0 ? "bg-white/15" : "bg-surface-3")}>
                <ShoppingBag className="h-5 w-5" />
                {totalCartQty > 0 && (
                  <span key={totalCartQty} className="anim-bump num absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[0.6875rem] font-extrabold text-brand">
                    {totalCartQty}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{cartLines.length > 0 ? "View ticket" : "Ticket is empty"}</span>
                <span className={cn("block truncate text-xs", cartLines.length > 0 ? "text-white/80" : "text-fg-subtle")}>
                  {cartLines.length > 0
                    ? `${totalCartQty} ${totalCartQty === 1 ? "item" : "items"}${tableName ? ` · ${tableName}` : ""}`
                    : "Tap items to start a sale"}
                </span>
              </span>
              {cartLines.length > 0 && <span className="num text-lg font-extrabold">{money(cartTotal, settings.currency)}</span>}
              <ChevronUp className="h-5 w-5 shrink-0 opacity-80" />
            </button>
          </div>
        )}
      </section>

      {/* ------------------------------ Docked ticket (split layouts) ------------------------------ */}
      {isSplit && (
        <aside className="hidden w-[clamp(18rem,34vw,26rem)] shrink-0 border-l border-line split:flex split:flex-col" aria-label="Current ticket">
          {cartPanel}
        </aside>
      )}

      {/* ------------------------------ Ticket sheet (stacked layouts) ------------------------------ */}
      {!isSplit && (
        <Modal
          open={isCartSheetOpen}
          onClose={() => setIsCartSheetOpen(false)}
          size="md"
          hideHeader
          bodyClassName="p-0 flex flex-col overflow-hidden"
          panelClassName="h-[calc(100dvh-2rem)] sheet:h-[calc(100dvh-0.75rem)]"
          data-testid="cart-sheet"
        >
          <div className="flex min-h-0 flex-1 flex-col">{cartPanel}</div>
        </Modal>
      )}

      {/* ------------------------------ Dialogs ------------------------------ */}
      <ModifierModal item={activeItemForMod} onClose={() => setActiveItemForMod(null)} onAddToCart={handleAddCustomizedLine} currency={settings.currency} />
      <PaymentModal orderData={checkoutData} onClose={() => setCheckoutData(null)} onCompleteOrder={handleCompleteOrder} settings={settings} />
      <ReceiptModal
        order={completedOrder}
        orderItems={completedOrderItems}
        onClose={() => setCompletedOrder(null)}
        onNewOrder={() => {
          setCompletedOrder(null);
          searchInputRef.current?.focus();
        }}
        settings={settings}
      />
      <HeldTicketsModal open={isHeldModalOpen} tickets={heldTickets} onClose={() => setIsHeldModalOpen(false)} onResume={handleResumeTicket} onDelete={handleDeleteHeldTicket} settings={settings} />
      <NumericKeypadModal isOpen={isKeypadOpen} onClose={() => setIsKeypadOpen(false)} onAddCustomItem={handleAddCustomItem} currency={settings.currency} />
      <ShortcutsModal isOpen={showShortcuts} onClose={handleCloseShortcuts} />
    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  X,
  Layers,
  ShoppingBag,
  ArrowRight,
  Calculator,
  Star,
  Barcode,
} from "lucide-react";
import confetti from "canvas-confetti";
import { db } from "@/db";
import type {
  MenuItem,
  CartLine,
  HeldTicket,
  Order,
  OrderItem,
  StoreSettings,
  Shift,
  PaymentMethod,
} from "@/types";
import { ItemCard } from "./ItemCard";
import { ModifierModal } from "./ModifierModal";
import { CartDrawer } from "./CartDrawer";
import { PaymentModal } from "./PaymentModal";
import { ReceiptModal } from "./ReceiptModal";
import { HeldTicketsModal } from "./HeldTicketsModal";
import { NumericKeypadModal } from "./NumericKeypadModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { playTapSound, playBeepSound } from "@/lib/sounds";
import { money, round2 } from "@/lib/format";

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
  const categories = useLiveQuery(
    () => db.categories.filter((c) => c.isActive && (!c.shopId || c.shopId === activeShopId)).sortBy("sortOrder"),
    [activeShopId]
  ) || [];
  const items = useLiveQuery(
    () => db.menuItems.filter((i) => i.isActive && (!i.shopId || i.shopId === activeShopId)).toArray(),
    [activeShopId]
  ) || [];
  const heldTickets = useLiveQuery(
    () => db.heldTickets.filter((h) => !h.shopId || h.shopId === activeShopId).toArray(),
    [activeShopId]
  ) || [];

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [activeItemForMod, setActiveItemForMod] = useState<MenuItem | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [localShortcutsOpen, setLocalShortcutsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showShortcuts = isShortcutsOpen || localShortcutsOpen;
  const handleCloseShortcuts = () => {
    if (setIsShortcutsOpen) setIsShortcutsOpen(false);
    setLocalShortcutsOpen(false);
  };

  // Payment & Receipt
  const [checkoutData, setCheckoutData] = useState<{
    subtotal: number;
    tax: number;
    total: number;
    totalKhr: number;
    tableName: string;
  } | null>(null);

  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedOrderItems, setCompletedOrderItems] = useState<OrderItem[]>([]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showFavoritesOnly && !item.isFavorite && item.stock <= 5) return false;
      const matchCat = selectedCatId === null || item.categoryId === selectedCatId;
      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCatId, searchQuery, showFavoritesOnly]);

  // Cart summary calculations
  const totalCartQty = cartLines.reduce((s, l) => s + l.qty, 0);
  const rawCartSubtotal = cartLines.reduce((sum, line) => {
    const modTotal = line.modifiers.reduce((mSum, m) => mSum + m.price, 0);
    return sum + (line.basePrice + modTotal) * line.qty;
  }, 0);
  const cartTax = round2((rawCartSubtotal * settings.taxRate) / 100);
  const cartTotal = round2(rawCartSubtotal + cartTax);

  // Memoized in-cart item counts for zero-error feedback
  const cartItemCounts = useMemo(() => {
    return cartLines.reduce((acc, line) => {
      acc[line.menuItemId] = (acc[line.menuItemId] || 0) + line.qty;
      return acc;
    }, {} as Record<number, number>);
  }, [cartLines]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input other than search
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        if (setIsShortcutsOpen) {
          setIsShortcutsOpen(true);
        } else {
          setLocalShortcutsOpen(true);
        }
        return;
      }

      if (e.key === "Escape") {
        if (showShortcuts) handleCloseShortcuts();
        if (isKeypadOpen) setIsKeypadOpen(false);
        if (searchQuery) setSearchQuery("");
        return;
      }

      if ((e.key === "F2" || (e.ctrlKey && e.key === "Enter")) && cartLines.length > 0) {
        e.preventDefault();
        setCheckoutData({
          subtotal: rawCartSubtotal,
          tax: cartTax,
          total: cartTotal,
          totalKhr: Math.round(cartTotal * settings.exchangeRate),
          tableName: "Walk-in",
        });
        return;
      }

      if (e.code === "Space" && !isInput && cartLines.length > 0) {
        e.preventDefault();
        handleHoldTicket("Walk-in");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartLines, rawCartSubtotal, cartTax, cartTotal, settings.exchangeRate, showShortcuts, isKeypadOpen, searchQuery]);

  // Handle item tap
  const handleSelectItem = (item: MenuItem) => {
    playTapSound(settings.soundEnabled);
    if (item.modifiers && item.modifiers.length > 0) {
      setActiveItemForMod(item);
    } else {
      const key = `${item.id}--`;
      setCartLines((prev) => {
        const existingIndex = prev.findIndex((l) => l.key === key);
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            qty: next[existingIndex].qty + 1,
          };
          return next;
        }
        return [
          ...prev,
          {
            key,
            menuItemId: item.id!,
            name: item.name,
            color: item.color,
            basePrice: item.price,
            qty: 1,
            modifiers: [],
          },
        ];
      });
    }
  };

  const handleAddCustomItem = (amount: number, name: string) => {
    playTapSound(settings.soundEnabled);
    const key = `custom-${Date.now()}`;
    setCartLines((prev) => [
      ...prev,
      {
        key,
        menuItemId: 0,
        name: name,
        color: "#0F766E",
        basePrice: amount,
        qty: 1,
        modifiers: [],
      },
    ]);
  };

  const handleAddCustomizedLine = (line: CartLine) => {
    setCartLines((prev) => {
      const existingIndex = prev.findIndex((l) => l.key === line.key);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          qty: next[existingIndex].qty + line.qty,
        };
        return next;
      }
      return [...prev, line];
    });
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCartLines((prev) =>
      prev
        .map((l) => {
          if (l.key === key) {
            const newQty = l.qty + delta;
            return newQty > 0 ? { ...l, qty: newQty } : null;
          }
          return l;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const handleRemoveLine = (key: string) => {
    setCartLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleClearCart = () => {
    setCartLines([]);
    setIsMobileCartOpen(false);
  };

  const handleHoldTicket = async (tableName: string) => {
    if (cartLines.length === 0) return;
    await db.heldTickets.add({
      shopId: activeShopId,
      name: tableName,
      tableNumber: tableName,
      itemCount: totalCartQty,
      subtotal: round2(rawCartSubtotal),
      lines: cartLines,
      createdAt: new Date(),
    });

    setCartLines([]);
    setIsMobileCartOpen(false);
    playBeepSound(settings.soundEnabled);
  };

  const handleResumeTicket = (ticket: HeldTicket) => {
    setCartLines(ticket.lines);
    setIsHeldModalOpen(false);
    playTapSound(settings.soundEnabled);
  };

  const handleDeleteHeldTicket = async (id: number) => {
    await db.heldTickets.delete(id);
  };

  // 1-Tap Quick Cash Checkout (<8s, 2 taps)
  const handleQuickCashCheckout = async (data: {
    subtotal: number;
    tax: number;
    total: number;
    totalKhr: number;
    tableName: string;
  }) => {
    playTapSound(settings.soundEnabled);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#0F766E", "#F97316", "#10B981", "#3B82F6"],
      });
    } catch {
      // Confetti fallback
    }

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
      paymentMethod: "cash",
      cashReceived: data.total,
      changeDue: 0,
      cashReceivedKhr: data.totalKhr,
      changeDueKhr: 0,
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
      const modTotal = line.modifiers.reduce((mSum, m) => mSum + m.price, 0);
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
          const newStock = Math.max(0, product.stock - line.qty);
          await db.menuItems.update(product.id!, { stock: newStock });
          await db.stockMovements.add({
            itemId: product.id!,
            delta: -line.qty,
            reason: "sale",
            note: `Order #${orderNumber}`,
            createdAt: new Date(),
          });
        }
      }
    }

    // Update active shift
    if (activeShift && activeShift.id) {
      const shift = await db.shifts.get(activeShift.id);
      if (shift) {
        const prevSales = shift.totalSalesUsd || 0;
        const prevOrders = shift.totalOrders || 0;
        const prevCash = shift.cashSalesUsd || 0;
        const prevExpCash = shift.expectedCashUsd || shift.openingCashUsd;

        await db.shifts.update(shift.id!, {
          totalSalesUsd: round2(prevSales + data.total),
          totalOrders: prevOrders + 1,
          cashSalesUsd: round2(prevCash + data.total),
          expectedCashUsd: round2(prevExpCash + data.total),
        });
      }
    }

    setCompletedOrder(newOrder);
    setCompletedOrderItems(orderItemsToInsert);
    setCartLines([]);
    setIsMobileCartOpen(false);
  };

  // Full Checkout Handler
  const handleCompleteOrder = async (details: {
    paymentMethod: PaymentMethod;
    cashReceived?: number;
    changeDue?: number;
    cashReceivedKhr?: number;
    changeDueKhr?: number;
  }) => {
    if (!checkoutData) return;

    const totalOrdersCount = await db.orders.count();
    const orderNumber = 1001 + totalOrdersCount;

    const newOrder: Order = {
      shopId: activeShopId,
      orderNumber,
      status: "completed",
      subtotal: checkoutData.subtotal,
      tax: checkoutData.tax,
      total: checkoutData.total,
      totalKhr: checkoutData.totalKhr,
      paymentMethod: details.paymentMethod,
      cashReceived: details.cashReceived,
      changeDue: details.changeDue,
      cashReceivedKhr: details.cashReceivedKhr,
      changeDueKhr: details.changeDueKhr,
      exchangeRate: settings.exchangeRate,
      itemCount: totalCartQty,
      cashierName: activeShift?.openedBy || "Cashier",
      tableNumber: checkoutData.tableName,
      shiftId: activeShift?.id,
      createdAt: new Date(),
    };

    const orderId = (await db.orders.add(newOrder)) as number;
    newOrder.id = orderId;

    const orderItemsToInsert: OrderItem[] = cartLines.map((line) => {
      const modTotal = line.modifiers.reduce((mSum, m) => mSum + m.price, 0);
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
          const newStock = Math.max(0, product.stock - line.qty);
          await db.menuItems.update(product.id!, { stock: newStock });
          await db.stockMovements.add({
            itemId: product.id!,
            delta: -line.qty,
            reason: "sale",
            note: `Order #${orderNumber}`,
            createdAt: new Date(),
          });
        }
      }
    }

    // Update active shift
    if (activeShift && activeShift.id) {
      const shift = await db.shifts.get(activeShift.id);
      if (shift) {
        const prevSales = shift.totalSalesUsd || 0;
        const prevOrders = shift.totalOrders || 0;
        const prevCash = shift.cashSalesUsd || 0;
        const prevCard = shift.cardSalesUsd || 0;
        const prevQr = shift.qrSalesUsd || 0;
        const prevExpCash = shift.expectedCashUsd || shift.openingCashUsd;

        const isCash = details.paymentMethod === "cash";
        const isCard = details.paymentMethod === "card";
        const isQr = details.paymentMethod === "khqr";

        await db.shifts.update(shift.id!, {
          totalSalesUsd: round2(prevSales + checkoutData.total),
          totalOrders: prevOrders + 1,
          cashSalesUsd: isCash ? round2(prevCash + checkoutData.total) : prevCash,
          cardSalesUsd: isCard ? round2(prevCard + checkoutData.total) : prevCard,
          qrSalesUsd: isQr ? round2(prevQr + checkoutData.total) : prevQr,
          expectedCashUsd: isCash ? round2(prevExpCash + checkoutData.total) : prevExpCash,
        });
      }
    }

    setCompletedOrder(newOrder);
    setCompletedOrderItems(orderItemsToInsert);
    setCheckoutData(null);
    setCartLines([]);
    setIsMobileCartOpen(false);
  };

  const gridColsClass =
    settings.accessibility?.gridCols === 3
      ? "grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2"
      : "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5";

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.25rem)] overflow-hidden bg-slate-950">
      {/* Left Catalog Area (65 - 70%) */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Search & Category Header */}
        <div className="p-2.5 sm:p-3.5 border-b border-slate-800 bg-slate-900/60 space-y-2.5 shrink-0">
          {/* High-Contrast Speed Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
                <Barcode className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or search name/SKU... (Press /)"
                className="w-full pl-9 sm:pl-16 pr-14 py-2 sm:py-2.5 rounded-2xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-full text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Quick Numeric Keypad button for custom items */}
            <button
              onClick={() => setIsKeypadOpen(true)}
              className="tap-tactile h-9 sm:h-10 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
              title="Custom Price Keypad"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Keypad</span>
            </button>
          </div>

          {/* Horizontal Category Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => {
                setSelectedCatId(null);
                setShowFavoritesOnly(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                selectedCatId === null && !showFavoritesOnly
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-600/30"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              All Items ({items.length})
            </button>

            {/* ⭐ Top Items Filter */}
            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                setSelectedCatId(null);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                showFavoritesOnly
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                  : "bg-slate-950 border border-slate-800 text-amber-400 hover:bg-slate-800"
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>Top Items</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCatId === cat.id && !showFavoritesOnly;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCatId(cat.id!);
                    setShowFavoritesOnly(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                  style={{
                    backgroundColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <CategoryIcon name={cat.icon} className="w-3 h-3" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 or 3 Column Responsive Tactile Item Grid */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 pb-28 lg:pb-6">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Search className="w-8 h-8 mb-2 text-slate-700" />
              <h4 className="font-bold text-slate-300 text-sm">No items match criteria</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Try clearing filters or search term</p>
            </div>
          ) : (
            <div className={gridColsClass}>
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  cartQty={cartItemCounts[item.id!] || 0}
                  onSelect={handleSelectItem}
                  currency={settings.currency}
                  enableDualCurrency={settings.enableDualCurrency}
                  exchangeRate={settings.exchangeRate}
                  accessibility={settings.accessibility}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sticky Live Cart Panel (30 - 35%) */}
      <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full border-l border-slate-800">
        <CartDrawer
          lines={cartLines}
          onUpdateQty={handleUpdateQty}
          onRemoveLine={handleRemoveLine}
          onClearCart={handleClearCart}
          onHoldTicket={handleHoldTicket}
          onOpenPayment={(data) => setCheckoutData(data)}
          onQuickCashCheckout={handleQuickCashCheckout}
          settings={settings}
        />
      </div>

      {/* Floating Bottom Cart Bar for Mobile */}
      {totalCartQty > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-3">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-between font-bold text-xs active:scale-[0.98] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-[11px] font-extrabold font-mono">
                {totalCartQty}
              </span>
              <span>View Current Order</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-sm font-extrabold">
              <span>{money(cartTotal, settings.currency)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Slide-up Cart Bottom Sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="flex-1"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up">
            <CartDrawer
              lines={cartLines}
              onUpdateQty={handleUpdateQty}
              onRemoveLine={handleRemoveLine}
              onClearCart={handleClearCart}
              onHoldTicket={handleHoldTicket}
              onOpenPayment={(data) => {
                setCheckoutData(data);
                setIsMobileCartOpen(false);
              }}
              onQuickCashCheckout={handleQuickCashCheckout}
              settings={settings}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <ModifierModal
        item={activeItemForMod}
        onClose={() => setActiveItemForMod(null)}
        onAddToCart={handleAddCustomizedLine}
        currency={settings.currency}
      />

      <PaymentModal
        orderData={checkoutData}
        onClose={() => setCheckoutData(null)}
        onCompleteOrder={handleCompleteOrder}
        settings={settings}
      />

      <ReceiptModal
        order={completedOrder}
        orderItems={completedOrderItems}
        onClose={() => setCompletedOrder(null)}
        onNewOrder={() => {
          setCompletedOrder(null);
          setCompletedOrderItems([]);
          setCartLines([]);
        }}
        settings={settings}
      />

      {isHeldModalOpen && (
        <HeldTicketsModal
          tickets={heldTickets}
          onClose={() => setIsHeldModalOpen(false)}
          onResume={handleResumeTicket}
          onDelete={handleDeleteHeldTicket}
          settings={settings}
        />
      )}

      <NumericKeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        onAddCustomItem={handleAddCustomItem}
        currency={settings.currency}
      />

      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={handleCloseShortcuts}
      />
    </div>
  );
};

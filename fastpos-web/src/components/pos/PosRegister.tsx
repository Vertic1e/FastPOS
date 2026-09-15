import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  X,
  Layers,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
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
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { playTapSound, playBeepSound } from "@/lib/sounds";
import { money, round2 } from "@/lib/format";

interface PosRegisterProps {
  settings: StoreSettings;
  activeShift?: Shift;
  isHeldModalOpen: boolean;
  setIsHeldModalOpen: (open: boolean) => void;
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  settings,
  activeShift,
  isHeldModalOpen,
  setIsHeldModalOpen,
}) => {
  const categories = useLiveQuery(() => db.categories.filter((c) => c.isActive).sortBy("sortOrder")) || [];
  const items = useLiveQuery(() => db.menuItems.filter((i) => i.isActive).toArray()) || [];
  const heldTickets = useLiveQuery(() => db.heldTickets.toArray()) || [];

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [activeItemForMod, setActiveItemForMod] = useState<MenuItem | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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
      const matchCat = selectedCatId === null || item.categoryId === selectedCatId;
      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCatId, searchQuery]);

  // Cart summary calculations
  const totalCartQty = cartLines.reduce((s, l) => s + l.qty, 0);
  const rawCartSubtotal = cartLines.reduce((sum, line) => {
    const modTotal = line.modifiers.reduce((mSum, m) => mSum + m.price, 0);
    return sum + (line.basePrice + modTotal) * line.qty;
  }, 0);
  const cartTax = round2((rawCartSubtotal * settings.taxRate) / 100);
  const cartTotal = round2(rawCartSubtotal + cartTax);

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

  const handleResumeTicket = async (ticket: HeldTicket) => {
    setCartLines(ticket.lines);
    if (ticket.id) {
      await db.heldTickets.delete(ticket.id);
    }
    setIsHeldModalOpen(false);
    playTapSound(settings.soundEnabled);
  };

  const handleDeleteHeldTicket = async (id: number) => {
    await db.heldTickets.delete(id);
  };

  // Complete Checkout
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

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3rem)] overflow-hidden bg-slate-950">
      {/* Left Catalog Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Search & Category Pills */}
        <div className="p-2.5 sm:p-3 border-b border-slate-850 bg-slate-900/60 space-y-2 shrink-0">
          {/* Minimal Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or barcode SKU..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Horizontal Category Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => setSelectedCatId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                selectedCatId === null
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-950 border border-slate-800 text-slate-300"
              }`}
            >
              All ({items.length})
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id!)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-slate-950 border border-slate-800 text-slate-300"
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

        {/* 2-Column Responsive Item Grid */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 pb-28 lg:pb-6">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Search className="w-8 h-8 mb-2 text-slate-700" />
              <h4 className="font-bold text-slate-300 text-sm">No items found</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelectItem}
                  currency={settings.currency}
                  enableDualCurrency={settings.enableDualCurrency}
                  exchangeRate={settings.exchangeRate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart Side Panel (Hidden on mobile) */}
      <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full border-l border-slate-800">
        <CartDrawer
          lines={cartLines}
          onUpdateQty={handleUpdateQty}
          onRemoveLine={handleRemoveLine}
          onClearCart={handleClearCart}
          onHoldTicket={handleHoldTicket}
          onOpenPayment={(data) => setCheckoutData(data)}
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
    </div>
  );
};

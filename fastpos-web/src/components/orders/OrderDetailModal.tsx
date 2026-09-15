import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  X,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Clock,
  User,
  Hash,
} from "lucide-react";
import { db } from "@/db";
import type { Order, OrderItem, StoreSettings } from "@/types";
import { money, khr, formatDateTime } from "@/lib/format";
import { ReceiptModal } from "@/components/pos/ReceiptModal";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  settings: StoreSettings;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  settings,
}) => {
  if (!order) return null;

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [restockItems, setRestockItems] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  // Fetch items for this order
  const items = useLiveQuery(() => db.orderItems.where("orderId").equals(order.id!).toArray(), [order.id]) || [];

  const isRefunded = order.status === "refunded";

  const handleProcessRefund = async () => {
    if (!refundReason.trim()) return;

    // 1. Update order
    await db.orders.update(order.id!, {
      status: "refunded",
      refundedAt: new Date(),
      refundNote: refundReason.trim(),
    });

    // 2. Restock items if enabled
    if (restockItems) {
      for (const it of items) {
        if (it.menuItemId) {
          const product = await db.menuItems.get(it.menuItemId);
          if (product && product.trackStock) {
            await db.menuItems.update(product.id!, {
              stock: product.stock + it.qty,
            });
            await db.stockMovements.add({
              itemId: product.id!,
              delta: it.qty,
              reason: "refund",
              note: `Refund for Order #${order.orderNumber}: ${refundReason}`,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    // 3. Update shift refunds total if order has shiftId
    if (order.shiftId) {
      const shift = await db.shifts.get(order.shiftId);
      if (shift) {
        const prevRefunds = shift.refundsTotalUsd || 0;
        await db.shifts.update(shift.id!, {
          refundsTotalUsd: prevRefunds + order.total,
        });
      }
    }

    setShowRefundForm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Order #{order.orderNumber}</h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    isRefunded
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.createdAt)}</p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* Meta tags */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-semibold">Cashier</span>
                <span className="font-bold text-slate-200 truncate block">
                  {order.cashierName || "Alex Rivers"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-semibold">Table / Note</span>
                <span className="font-bold text-slate-200 truncate block">
                  {order.tableNumber || "Takeout"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-semibold">Payment</span>
                <span className="font-bold text-slate-200 uppercase truncate block">
                  {order.paymentMethod}
                </span>
              </div>
            </div>

            {/* Refunded Notice if applicable */}
            {isRefunded && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>Refunded on {formatDateTime(order.refundedAt || order.createdAt)}</span>
                </div>
                {order.refundNote && (
                  <p className="text-rose-400/90 italic pl-5">Reason: "{order.refundNote}"</p>
                )}
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Items ({items.length})
              </h4>
              <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-2xl border border-slate-800 p-3">
                {items.map((it, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-200">
                          {it.qty}x {it.name}
                        </span>
                        {it.modifiers && it.modifiers.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {it.modifiers.map((m) => m.option).join(", ")}
                          </div>
                        )}
                        {it.note && (
                          <div className="text-[10px] text-amber-400/80 italic mt-0.5">
                            Note: {it.note}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {money(it.lineTotal, settings.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono">{money(order.subtotal, settings.currency)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({settings.taxRate}%)</span>
                  <span className="font-mono">{money(order.tax, settings.currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold text-white text-sm">
                <span>Total Amount</span>
                <div className="text-right">
                  <div className="text-base font-extrabold text-emerald-400 font-mono">
                    {money(order.total, settings.currency)}
                  </div>
                  {settings.enableDualCurrency && (
                    <div className="text-xs font-semibold text-amber-400 font-mono">
                      {khr(order.totalKhr)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Refund form expansion */}
            {showRefundForm && !isRefunded && (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 space-y-3 animate-in fade-in">
                <h5 className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>Issue Order Refund</span>
                </h5>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund (e.g. customer cancelled, spill, item error)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  autoFocus
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={restockItems}
                    onChange={(e) => setRestockItems(e.target.checked)}
                    className="rounded text-orange-500 focus:ring-0"
                  />
                  <span>Return items back to inventory stock</span>
                </label>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowRefundForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessRefund}
                    disabled={!refundReason.trim()}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md"
                  >
                    Confirm Refund
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowReceipt(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            {!isRefunded && !showRefundForm && (
              <button
                onClick={() => setShowRefundForm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Refund Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showReceipt && (
        <ReceiptModal
          order={order}
          orderItems={items}
          onClose={() => setShowReceipt(false)}
          onNewOrder={() => setShowReceipt(false)}
          settings={settings}
        />
      )}
    </>
  );
};

import React from "react";
import { Printer, CheckCircle2, RotateCcw, X, Share2 } from "lucide-react";
import type { Order, OrderItem, StoreSettings } from "@/types";
import { money, khr, formatDateTime } from "@/lib/format";

interface ReceiptModalProps {
  order: Order | null;
  orderItems: OrderItem[];
  onClose: () => void;
  onNewOrder: () => void;
  settings: StoreSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  orderItems,
  onClose,
  onNewOrder,
  settings,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden animate-slide-up sm:animate-none">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Top bar */}
        <div className="px-4 py-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Payment Received!</h3>
              <p className="text-[11px] text-slate-400">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950/80 flex justify-center">
          {/* Thermal Receipt Paper representation */}
          <div
            id="thermal-receipt-print"
            className="w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-xl shadow-lg font-mono text-[11px] leading-tight select-text"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <h2 className="text-base font-extrabold tracking-tight font-serif uppercase">
                {settings.storeName}
              </h2>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
              {settings.receiptHeader && (
                <p className="text-[10px] text-slate-500 italic mt-1">{settings.receiptHeader}</p>
              )}
            </div>

            {/* Order Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Order #: {order.orderNumber}</span>
                <span>{order.tableNumber || "Takeaway"}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier: {order.cashierName}</span>
                <span className="uppercase font-bold text-slate-700">{order.status}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-2">
              <div className="flex justify-between font-bold text-[10px] border-b border-slate-200 pb-1">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {orderItems.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {item.qty}x {item.name}
                    </span>
                    <span className="font-mono">{money(item.lineTotal, settings.currency)}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-3 text-[9px] text-slate-500">
                      {item.modifiers.map((m) => m.option).join(", ")}
                    </div>
                  )}
                  {item.note && (
                    <div className="pl-3 text-[9px] italic text-slate-500">
                      * {item.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{money(order.subtotal, settings.currency)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({settings.taxRate}%):</span>
                  <span>{money(order.tax, settings.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL (USD):</span>
                <span>{money(order.total, settings.currency)}</span>
              </div>
              {settings.enableDualCurrency && (
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL (KHR):</span>
                  <span>{khr(order.totalKhr)}</span>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="uppercase font-bold">{order.paymentMethod}</span>
              </div>
              {order.cashReceived !== undefined && (
                <div className="flex justify-between">
                  <span>Cash Tendered (USD):</span>
                  <span>{money(order.cashReceived, settings.currency)}</span>
                </div>
              )}
              {order.cashReceivedKhr !== undefined && (
                <div className="flex justify-between">
                  <span>Cash Tendered (KHR):</span>
                  <span>{khr(order.cashReceivedKhr)}</span>
                </div>
              )}
              {order.changeDue !== undefined && order.changeDue > 0 && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change Due (USD):</span>
                  <span>{money(order.changeDue, settings.currency)}</span>
                </div>
              )}
              {order.changeDueKhr !== undefined && order.changeDueKhr > 0 && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change Due (KHR):</span>
                  <span>{khr(order.changeDueKhr)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 space-y-1">
              {settings.receiptFooter && (
                <p className="text-[10px] text-slate-600">{settings.receiptFooter}</p>
              )}
              <p className="text-[9px] text-slate-400">Powered by FastPOS Web</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt</span>
          </button>

          <button
            onClick={onNewOrder}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};

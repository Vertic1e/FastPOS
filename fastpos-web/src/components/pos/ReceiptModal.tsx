import React from "react";
import { createPortal } from "react-dom";
import { Printer, CheckCircle2, Share2, Plus } from "lucide-react";
import type { Order, OrderItem, StoreSettings } from "@/types";
import { money, khr, formatDateTime } from "@/lib/format";
import { Modal, Button } from "@/components/ui";

interface ReceiptModalProps {
  order: Order | null;
  orderItems: OrderItem[];
  onClose: () => void;
  onNewOrder: () => void;
  settings: StoreSettings;
  /** Shown in the header. Defaults to "Payment received". */
  title?: string;
}

const METHOD_LABEL: Record<string, string> = { cash: "CASH", card: "CARD", khqr: "KHQR", split: "SPLIT" };

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, orderItems, onClose, onNewOrder, settings, title = "Payment received" }) => {
  if (!order) return null;

  const handlePrint = () => window.print();

  const receiptText = () => {
    const lines = [
      settings.storeName,
      `Order #${order.orderNumber} · ${formatDateTime(order.createdAt)}`,
      ...orderItems.map((i) => `${i.qty} x ${i.name} — ${money(i.lineTotal, settings.currency)}`),
      `Total: ${money(order.total, settings.currency)}${settings.enableDualCurrency ? ` (${khr(order.totalKhr)})` : ""}`,
      settings.receiptFooter,
    ];
    return lines.filter(Boolean).join("\n");
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const handleShare = async () => {
    try {
      await navigator.share({ title: `${settings.storeName} receipt #${order.orderNumber}`, text: receiptText() });
    } catch {
      // user cancelled
    }
  };

  const paper = <ReceiptPaper order={order} orderItems={orderItems} settings={settings} />;

  return (
    <>
      <Modal
        open={!!order}
        onClose={onClose}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ok-soft text-ok">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            {title}
          </span>
        }
        description={`Order #${order.orderNumber} · ${METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`}
        bodyClassName="bg-surface-2/60 flex justify-center"
        footer={
          <div className="flex flex-col gap-2">
            {order.paymentMethod === "cash" && (order.changeDue ?? 0) > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-ok-soft px-3 py-2 text-ok">
                <span className="text-xs font-bold uppercase tracking-wider">Give change</span>
                <span className="text-right">
                  <span className="num block text-xl font-extrabold">{money(order.changeDue ?? 0, settings.currency)}</span>
                  {settings.enableDualCurrency && <span className="num block text-xs font-semibold opacity-80">{khr(order.changeDueKhr ?? 0)}</span>}
                </span>
              </div>
            )}
            <div className="grid grid-cols-[auto_auto_1fr] gap-2">
              <Button variant="secondary" size="xl" onClick={handlePrint} aria-label="Print receipt" iconOnly>
                <Printer className="h-5 w-5" />
              </Button>
              {canShare ? (
                <Button variant="secondary" size="xl" onClick={handleShare} aria-label="Share receipt" iconOnly>
                  <Share2 className="h-5 w-5" />
                </Button>
              ) : (
                <span />
              )}
              <Button variant="primary" size="xl" onClick={onNewOrder} leftIcon={<Plus className="h-5 w-5" />}>
                New sale
              </Button>
            </div>
          </div>
        }
      >
        <div className="w-full max-w-[20rem] select-text rounded-xl bg-white p-4 font-mono text-[0.6875rem] leading-tight text-slate-900 shadow-md">
          {paper}
        </div>
      </Modal>

      {/* Print-only copy at body level so it can't be clipped by the modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <div id="thermal-receipt-print" className="hidden print:block">
            {paper}
          </div>,
          document.body
        )}
    </>
  );
};

const ReceiptPaper: React.FC<{ order: Order; orderItems: OrderItem[]; settings: StoreSettings }> = ({ order, orderItems, settings }) => (
  <>
    <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2.5 text-center">
      <h2 className="text-sm font-extrabold uppercase tracking-tight">{settings.storeName}</h2>
      {settings.address && <p className="text-[0.625rem] text-slate-600">{settings.address}</p>}
      {settings.phone && <p className="text-[0.625rem] text-slate-600">Tel: {settings.phone}</p>}
      {settings.receiptHeader && <p className="mt-1 text-[0.625rem] italic text-slate-500">{settings.receiptHeader}</p>}
    </div>

    <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2 text-[0.625rem]">
      <div className="flex justify-between">
        <span>Order #{order.orderNumber}</span>
        <span>{order.tableNumber || "Walk-in"}</span>
      </div>
      <div className="flex justify-between">
        <span>{formatDateTime(order.createdAt)}</span>
        <span>{order.cashierName}</span>
      </div>
    </div>

    <table className="my-2 w-full">
      <thead>
        <tr className="border-b border-slate-300 text-[0.625rem] uppercase text-slate-500">
          <th className="pb-1 text-left font-semibold">Item</th>
          <th className="pb-1 text-center font-semibold">Qty</th>
          <th className="pb-1 text-right font-semibold">Amt</th>
        </tr>
      </thead>
      <tbody>
        {orderItems.map((it, idx) => (
          <tr key={it.id ?? idx} className="align-top">
            <td className="py-1 pr-1">
              <span className="font-bold">{it.name}</span>
              {it.modifiers.length > 0 && <span className="block text-[0.625rem] text-slate-500">+ {it.modifiers.map((m) => m.option).join(", ")}</span>}
              {it.note && <span className="block text-[0.625rem] italic text-slate-500">“{it.note}”</span>}
            </td>
            <td className="py-1 text-center">{it.qty}</td>
            <td className="py-1 text-right font-semibold">{money(it.lineTotal, settings.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="space-y-0.5 border-t border-dashed border-slate-400 pt-2">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(order.subtotal, settings.currency)}</span>
      </div>
      {order.tax > 0 && (
        <div className="flex justify-between">
          <span>Tax ({settings.taxRate}%)</span>
          <span>{money(order.tax, settings.currency)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-slate-900 pt-1 text-sm font-extrabold">
        <span>TOTAL</span>
        <span>{money(order.total, settings.currency)}</span>
      </div>
      {settings.enableDualCurrency && (
        <div className="flex justify-between text-[0.625rem] text-slate-600">
          <span>Riel @ {order.exchangeRate.toLocaleString()}</span>
          <span>{khr(order.totalKhr)}</span>
        </div>
      )}
    </div>

    <div className="mt-2 space-y-0.5 border-t border-dashed border-slate-400 pt-2 text-[0.625rem]">
      <div className="flex justify-between">
        <span>Paid by</span>
        <span className="font-bold">{METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
      </div>
      {order.paymentMethod === "cash" && (
        <>
          {order.cashReceived != null && (
            <div className="flex justify-between">
              <span>Cash received</span>
              <span>{money(order.cashReceived, settings.currency)}</span>
            </div>
          )}
          {order.cashReceivedKhr != null && order.cashReceived == null && (
            <div className="flex justify-between">
              <span>Cash received</span>
              <span>{khr(order.cashReceivedKhr)}</span>
            </div>
          )}
          {(order.changeDue ?? 0) > 0 && (
            <div className="flex justify-between font-bold">
              <span>Change</span>
              <span>
                {money(order.changeDue ?? 0, settings.currency)}
                {settings.enableDualCurrency ? ` / ${khr(order.changeDueKhr ?? 0)}` : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>

    <div className="mt-3 border-t border-dashed border-slate-400 pt-2 text-center text-[0.625rem] text-slate-600">
      <p>{settings.receiptFooter || "Thank you!"}</p>
      <p className="mt-1">Powered by FastPOS</p>
    </div>
  </>
);

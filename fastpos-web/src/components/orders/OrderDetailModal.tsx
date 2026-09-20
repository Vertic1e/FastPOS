import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Printer, RotateCcw, AlertOctagon, User, Hash, CreditCard } from "lucide-react";
import { db } from "@/db";
import type { Order, OrderItem, StoreSettings } from "@/types";
import { money, khr, formatDateTime } from "@/lib/format";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Modal, Button, Badge, Field, Input, Switch, useToast } from "@/components/ui";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  settings: StoreSettings;
}

const METHOD_LABEL: Record<string, string> = { cash: "Cash", card: "Card", khqr: "KHQR", split: "Split" };

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, settings }) => {
  const toast = useToast();
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [restockItems, setRestockItems] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [busy, setBusy] = useState(false);

  const orderId = order?.id;
  const items = useLiveQuery<OrderItem[]>(() => (orderId != null ? db.orderItems.where("orderId").equals(orderId).toArray() : Promise.resolve([] as OrderItem[])), [orderId]) || [];

  useEffect(() => {
    setShowRefundForm(false);
    setRefundReason("");
    setRestockItems(true);
    setShowReceipt(false);
  }, [orderId]);

  if (!order) return null;
  const isRefunded = order.status === "refunded";

  const processRefund = async () => {
    if (!refundReason.trim() || busy) return;
    setBusy(true);
    try {
      await db.orders.update(order.id!, { status: "refunded", refundedAt: new Date(), refundNote: refundReason.trim() });
      if (restockItems) {
        for (const it of items) {
          if (it.menuItemId) {
            const product = await db.menuItems.get(it.menuItemId);
            if (product && product.trackStock) {
              await db.menuItems.update(product.id!, { stock: product.stock + it.qty });
              await db.stockMovements.add({
                itemId: product.id!,
                delta: it.qty,
                reason: "refund",
                note: `Refund for order #${order.orderNumber}: ${refundReason.trim()}`,
                createdAt: new Date(),
              });
            }
          }
        }
      }
      if (order.shiftId) {
        const shift = await db.shifts.get(order.shiftId);
        if (shift) await db.shifts.update(shift.id!, { refundsTotalUsd: (shift.refundsTotalUsd || 0) + order.total });
      }
      toast({ title: `Order #${order.orderNumber} refunded`, description: money(order.total, settings.currency), tone: "info" });
      setShowRefundForm(false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={!!order}
        onClose={onClose}
        size="md"
        title={
          <span className="flex items-center gap-2">
            Order #{order.orderNumber}
            <Badge tone={isRefunded ? "danger" : "success"}>{isRefunded ? "Refunded" : "Paid"}</Badge>
          </span>
        }
        description={formatDateTime(order.createdAt)}
        footer={
          showRefundForm && !isRefunded ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" onClick={() => setShowRefundForm(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" size="lg" fullWidth onClick={processRefund} disabled={!refundReason.trim()} loading={busy} leftIcon={<RotateCcw className="h-5 w-5" />}>
                Refund {money(order.total, settings.currency)}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {!isRefunded && (
                <Button variant="subtle-danger" size="lg" onClick={() => setShowRefundForm(true)} leftIcon={<RotateCcw className="h-5 w-5" />}>
                  Refund
                </Button>
              )}
              <Button variant="primary" size="lg" fullWidth onClick={() => setShowReceipt(true)} leftIcon={<Printer className="h-5 w-5" />}>
                Receipt
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Meta icon={<User />} label="Cashier" value={order.cashierName || "—"} />
            <Meta icon={<Hash />} label="Table" value={order.tableNumber || "Walk-in"} />
            <Meta icon={<CreditCard />} label="Paid by" value={METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod} />
          </div>

          {isRefunded && (
            <div className="rounded-2xl border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertOctagon className="h-4 w-4" />
                Refunded {formatDateTime(order.refundedAt || order.createdAt)}
              </p>
              {order.refundNote && <p className="mt-0.5 pl-5.5 italic opacity-90">“{order.refundNote}”</p>}
            </div>
          )}

          <section>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-fg-subtle">
              Items <span className="num">({items.reduce((s, i) => s + i.qty, 0)})</span>
            </h4>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface-2/40">
              {items.map((it, idx) => (
                <li key={it.id ?? idx} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="num mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-surface-3 px-1 text-xs font-bold text-fg-muted">{it.qty}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{it.name}</span>
                    {it.modifiers.length > 0 && <span className="block text-xs text-fg-muted">{it.modifiers.map((m) => m.option).join(", ")}</span>}
                    {it.note && <span className="block text-xs italic text-warn">“{it.note}”</span>}
                  </span>
                  <span className="num shrink-0 text-sm font-bold text-fg">{money(it.lineTotal, settings.currency)}</span>
                </li>
              ))}
              {items.length === 0 && <li className="px-3 py-4 text-center text-sm text-fg-subtle">No line items recorded.</li>}
            </ul>
          </section>

          <dl className="rounded-2xl border border-line bg-surface-2/40 p-3 text-sm">
            <div className="flex justify-between text-fg-muted">
              <dt>Subtotal</dt>
              <dd className="num">{money(order.subtotal, settings.currency)}</dd>
            </div>
            {order.tax > 0 && (
              <div className="mt-1 flex justify-between text-fg-muted">
                <dt>Tax</dt>
                <dd className="num">{money(order.tax, settings.currency)}</dd>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
              <dt className="font-bold text-fg">Total</dt>
              <dd className="text-right">
                <span className="num block text-xl font-extrabold text-ok">{money(order.total, settings.currency)}</span>
                {settings.enableDualCurrency && <span className="num block text-xs font-semibold text-warn">{khr(order.totalKhr)}</span>}
              </dd>
            </div>
            {order.paymentMethod === "cash" && (order.changeDue ?? 0) > 0 && (
              <div className="mt-1 flex justify-between text-xs text-fg-subtle">
                <dt>Cash received / change</dt>
                <dd className="num">
                  {order.cashReceived != null ? money(order.cashReceived, settings.currency) : khr(order.cashReceivedKhr ?? 0)} / {money(order.changeDue ?? 0, settings.currency)}
                </dd>
              </div>
            )}
          </dl>

          {showRefundForm && !isRefunded && (
            <div className="anim-fade-in flex flex-col gap-3 rounded-2xl border border-bad/40 bg-bad-soft/40 p-3 sm:p-4">
              <h5 className="flex items-center gap-1.5 text-sm font-bold text-bad">
                <RotateCcw className="h-4 w-4" />
                Refund this order
              </h5>
              <Field label="Reason" required>
                <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. customer cancelled, wrong item" autoFocus enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && processRefund()} />
              </Field>
              <Switch checked={restockItems} onChange={setRestockItems} label="Return items to stock" description="Adds the sold quantities back to tracked inventory." />
            </div>
          )}
        </div>
      </Modal>

      {showReceipt && <ReceiptModal order={order} orderItems={items} onClose={() => setShowReceipt(false)} onNewOrder={() => setShowReceipt(false)} settings={settings} title="Receipt copy" />}
    </>
  );
};

const Meta: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="min-w-0 rounded-xl border border-line bg-surface-2/40 p-2.5">
    <span className="flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-subtle [&>svg]:h-3 [&>svg]:w-3">
      {icon}
      {label}
    </span>
    <span className="block truncate text-sm font-bold text-fg">{value}</span>
  </div>
);

"use client";

import { RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";
import { refundOrderAction } from "@/app/actions/orders";
import { Modal, PrimaryButton } from "@/components/ui";

export function RefundButton({
  orderId,
  orderNumber,
  canRefund,
}: {
  orderId: number;
  orderNumber: number;
  canRefund: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canRefund) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await refundOrderAction(orderId, note || undefined);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 active:scale-[0.97]"
      >
        <RotateCcw size={12} />
        Refund
      </button>

      {open && (
        <Modal open onClose={pending ? () => {} : () => setOpen(false)} width="max-w-sm">
          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
              <RotateCcw size={22} />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">Refund Order #{orderNumber}?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
              This will mark the order as refunded and restore stock levels for tracked items.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-[12px] font-semibold text-ink/60">
                Refund note (optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="e.g. Customer request, wrong order…"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:text-ink disabled:opacity-40"
              >
                <X size={16} />
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {pending ? "Processing…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

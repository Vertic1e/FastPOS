import React, { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, CreditCard, QrCode, CheckCircle2, Split, Delete, X } from "lucide-react";
import confetti from "canvas-confetti";
import type { PaymentMethod, StoreSettings } from "@/types";
import { money, khr, round2 } from "@/lib/format";
import { playCashRegisterSound } from "@/lib/sounds";
import { cn } from "@/lib/cn";
import { Modal, Button, Segmented, Kbd } from "@/components/ui";
import type { CheckoutData } from "./CartDrawer";

interface PaymentModalProps {
  orderData: CheckoutData | null;
  onClose: () => void;
  onCompleteOrder: (paymentDetails: {
    paymentMethod: PaymentMethod;
    cashReceived?: number;
    changeDue?: number;
    cashReceivedKhr?: number;
    changeDueKhr?: number;
  }) => void;
  settings: StoreSettings;
}

/** Sensible "next bill" suggestions for the amount handed over. */
function suggestUsd(total: number): number[] {
  const steps = [1, 5, 10, 20, 50, 100];
  const out: number[] = [];
  for (const s of steps) {
    const v = Math.ceil(total / s) * s;
    if (v > total + 0.001 && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 5);
}
function suggestKhr(total: number): number[] {
  const steps = [1000, 5000, 10000, 20000, 50000, 100000];
  const out: number[] = [];
  for (const s of steps) {
    const v = Math.ceil(total / s) * s;
    if (v > total && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 5);
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderData, onClose, onCompleteOrder, settings }) => {
  const open = !!orderData;
  const totalUsd = orderData?.total ?? 0;
  const totalKhr = orderData?.totalKhr ?? 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "KHR">("USD");
  const [tendered, setTendered] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when a new checkout starts
  useEffect(() => {
    if (open) {
      setPaymentMethod("cash");
      setCurrencyMode("USD");
      setTendered("");
    }
  }, [open, totalUsd]);

  const tenderedNum = parseFloat(tendered);
  const isExact = tendered === "" || Number.isNaN(tenderedNum);
  let changeUsd = 0;
  let changeKhr = 0;
  let isEnough = true;
  if (!isExact) {
    if (currencyMode === "USD") {
      changeUsd = round2(tenderedNum - totalUsd);
      changeKhr = Math.round(changeUsd * settings.exchangeRate);
      isEnough = tenderedNum + 0.0001 >= totalUsd;
    } else {
      changeKhr = Math.round(tenderedNum - totalKhr);
      changeUsd = round2(changeKhr / settings.exchangeRate);
      isEnough = tenderedNum >= totalKhr;
    }
  }

  const suggestions = useMemo(
    () => (currencyMode === "USD" ? suggestUsd(totalUsd) : suggestKhr(totalKhr)),
    [currencyMode, totalUsd, totalKhr]
  );

  const canSubmit = paymentMethod !== "cash" || isExact || isEnough;

  const handleSubmit = () => {
    if (!orderData || !canSubmit) return;
    playCashRegisterSound(settings.soundEnabled);
    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ["#f97316", "#10b981", "#3b82f6", "#eab308"] });
    } catch {
      // ignore
    }
    if (paymentMethod === "cash") {
      if (isExact) {
        onCompleteOrder({ paymentMethod: "cash", cashReceived: totalUsd, changeDue: 0, cashReceivedKhr: totalKhr, changeDueKhr: 0 });
      } else {
        onCompleteOrder({
          paymentMethod: "cash",
          cashReceived: currencyMode === "USD" ? tenderedNum : undefined,
          cashReceivedKhr: currencyMode === "KHR" ? tenderedNum : undefined,
          changeDue: Math.max(0, changeUsd),
          changeDueKhr: Math.max(0, changeKhr),
        });
      }
      return;
    }
    onCompleteOrder({ paymentMethod });
  };

  // Enter submits (but not while typing into the tendered field with an invalid amount)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canSubmit) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const methodOptions = [
    { value: "cash" as PaymentMethod, label: "Cash", icon: <Banknote /> },
    { value: "khqr" as PaymentMethod, label: "KHQR", icon: <QrCode /> },
    { value: "card" as PaymentMethod, label: "Card", icon: <CreditCard /> },
    { value: "split" as PaymentMethod, label: "Split", icon: <Split /> },
  ];

  const symbol = currencyMode === "USD" ? settings.currency : "៛";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      hideHeader
      bodyClassName="p-0"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="xl" onClick={onClose} className="px-4">
            Back
          </Button>
          <Button variant="primary" size="xl" fullWidth onClick={handleSubmit} disabled={!canSubmit} className="min-w-0">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="truncate">
              {paymentMethod === "cash" && !isExact && isEnough && changeUsd > 0
                ? `Complete · change ${money(changeUsd, settings.currency)}`
                : `Complete ${money(totalUsd, settings.currency)}`}
            </span>
            <Kbd className="ml-1 hidden border-white/30 bg-white/15 text-white sm:inline-flex">↵</Kbd>
          </Button>
        </div>
      }
    >
      {/* Amount header */}
      <div className="border-b border-line bg-surface-2/50 px-4 pb-3 pt-3 sm:px-5 sm:pt-4 short:pb-2 short:pt-2">
        <div className="mb-2 flex justify-center sheet:flex sm:hidden short:hidden" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
        {/* On short (landscape phone) screens the amount and the method picker share one row */}
        <div className="flex flex-col gap-3 short:flex-row short:items-center short:gap-4">
          <div className="flex items-start justify-between gap-3 short:shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Amount due</p>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="num text-3xl font-extrabold tracking-tight text-fg sm:text-4xl short:text-2xl">{money(totalUsd, settings.currency)}</span>
                {settings.enableDualCurrency && <span className="num text-base font-bold text-warn short:text-sm">{khr(totalKhr)}</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-fg-subtle short:hidden">
                {orderData?.tableName} · 1 USD = {settings.exchangeRate.toLocaleString()} KHR
              </p>
            </div>
            <Button variant="ghost" size="md" iconOnly aria-label="Close" onClick={onClose} className="-mr-2 -mt-1 short:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <Segmented<PaymentMethod> fullWidth size="lg" aria-label="Payment method" value={paymentMethod} onChange={setPaymentMethod} options={methodOptions} />
          </div>
          <Button variant="ghost" size="md" iconOnly aria-label="Close" onClick={onClose} className="hidden shrink-0 short:inline-flex">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5 short:p-3">
        {paymentMethod === "cash" && (
          <div className="flex flex-col gap-4 short:gap-3">
            {settings.enableDualCurrency && (
              <Segmented<"USD" | "KHR">
                fullWidth
                size="sm"
                aria-label="Tender currency"
                value={currencyMode}
                onChange={(m) => {
                  setCurrencyMode(m);
                  setTendered("");
                }}
                options={[
                  { value: "USD", label: `US Dollar (${settings.currency})`, shortLabel: "USD $", tone: "neutral" },
                  { value: "KHR", label: "Khmer Riel (៛)", shortLabel: "KHR ៛", tone: "neutral" },
                ]}
              />
            )}

            {/* Tendered */}
            <div className={cn("rounded-2xl border p-3 sm:p-4", isEnough ? "border-line bg-surface-2/50" : "border-bad/50 bg-bad-soft/40")}>
              <label htmlFor="tendered" className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
                Cash received
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-fg-subtle">{symbol}</span>
                <input
                  id="tendered"
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={currencyMode === "USD" ? totalUsd.toFixed(2) : String(totalKhr)}
                  className="num h-12 w-full min-w-0 bg-transparent text-3xl font-extrabold text-fg placeholder:text-fg-subtle/60 focus:outline-none"
                  aria-describedby="tendered-hint"
                />
                {tendered !== "" ? (
                  <Button variant="ghost" size="md" iconOnly aria-label="Clear amount" onClick={() => setTendered("")}>
                    <Delete className="h-5 w-5" />
                  </Button>
                ) : (
                  <span className="rounded-lg bg-ok-soft px-2 py-1 text-xs font-bold text-ok">Exact</span>
                )}
              </div>
              <p id="tendered-hint" className="mt-1 text-xs text-fg-subtle">
                Leave empty for exact cash, or tap the bill the customer hands you.
              </p>
            </div>

            {/* Quick bills */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <button
                type="button"
                onClick={() => setTendered("")}
                className={cn(
                  "press h-12 rounded-xl border text-sm font-bold",
                  isExact ? "border-ok/50 bg-ok-soft text-ok" : "border-line bg-surface-2 text-fg hover:border-line-strong"
                )}
              >
                Exact
              </button>
              {suggestions.map((v) => {
                const active = !isExact && Math.abs(tenderedNum - v) < 0.001;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered(String(v))}
                    className={cn(
                      "press num h-12 rounded-xl border text-sm font-bold",
                      active ? "border-brand bg-brand-soft text-brand-text" : "border-line bg-surface-2 text-fg hover:border-line-strong"
                    )}
                  >
                    {currencyMode === "USD" ? money(v, settings.currency).replace(/\.00$/, "") : `${v.toLocaleString()}៛`}
                  </button>
                );
              })}
            </div>

            {/* Change */}
            <div
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3",
                isEnough ? "border-ok/30 bg-ok-soft text-ok" : "border-bad/40 bg-bad-soft text-bad"
              )}
              aria-live="polite"
            >
              <span className="text-xs font-bold uppercase tracking-wider">{isEnough ? "Change due" : "Still owed"}</span>
              <span className="text-right">
                <span className="num block text-2xl font-extrabold">{money(Math.abs(changeUsd), settings.currency)}</span>
                {settings.enableDualCurrency && <span className="num block text-xs font-semibold opacity-80">{khr(Math.abs(changeKhr))}</span>}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === "khqr" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex w-full max-w-[16rem] flex-col items-center rounded-3xl bg-white p-4 shadow-lg">
              <span className="mb-3 rounded-full bg-rose-600 px-3 py-1 text-[0.6875rem] font-extrabold tracking-wider text-white">KHQR · BAKONG</span>
              <div className="aspect-square w-full rounded-xl bg-slate-950 p-2">
                <svg viewBox="0 0 100 100" className="h-full w-full fill-white" aria-label="Payment QR code">
                  <path d="M0,0 h30 v30 h-30 z M4,4 h22 v22 h-22 z M8,8 h14 v14 h-14 z" />
                  <path d="M70,0 h30 v30 h-30 z M74,4 h22 v22 h-22 z M78,8 h14 v14 h-14 z" />
                  <path d="M0,70 h30 v30 h-30 z M4,74 h22 v22 h-22 z M8,78 h14 v14 h-14 z" />
                  <rect x="35" y="10" width="8" height="8" />
                  <rect x="50" y="5" width="12" height="6" />
                  <rect x="40" y="25" width="18" height="8" />
                  <rect x="10" y="40" width="10" height="15" />
                  <rect x="30" y="40" width="40" height="40" rx="4" fill="#f97316" />
                  <rect x="75" y="45" width="15" height="10" />
                  <rect x="40" y="85" width="20" height="8" />
                  <rect x="70" y="70" width="20" height="20" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900">{settings.merchantName}</p>
              <p className="num text-sm font-extrabold text-orange-600">
                {money(totalUsd, settings.currency)} · {khr(totalKhr)}
              </p>
            </div>
            <p className="max-w-sm text-sm text-fg-muted">Customer scans with any Bakong-enabled banking app (ABA, Wing, ACLEDA, …). Tap Complete once the transfer arrives.</p>
          </div>
        )}

        {paymentMethod === "card" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-info-soft text-info">
              <CreditCard className="h-10 w-10 animate-pulse" />
            </span>
            <h4 className="text-lg font-bold text-fg">Tap, insert or swipe</h4>
            <p className="max-w-xs text-sm text-fg-muted">Charge {money(totalUsd, settings.currency)} on the card terminal, then tap Complete.</p>
          </div>
        )}

        {paymentMethod === "split" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2/50 p-4">
            <h4 className="text-sm font-bold text-fg">Split evenly</h4>
            <p className="text-sm text-fg-muted">Collect half in cash and half by card, then tap Complete.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface p-3">
                <span className="block text-xs font-semibold text-fg-subtle">Cash portion</span>
                <span className="num text-lg font-bold text-fg">{money(round2(totalUsd / 2), settings.currency)}</span>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <span className="block text-xs font-semibold text-fg-subtle">Card portion</span>
                <span className="num text-lg font-bold text-fg">{money(round2(totalUsd - round2(totalUsd / 2)), settings.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

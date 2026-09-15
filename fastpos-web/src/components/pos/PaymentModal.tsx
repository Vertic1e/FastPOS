import React, { useState, useEffect } from "react";
import {
  X,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  Coins,
  ArrowRight,
  Split,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { PaymentMethod, StoreSettings } from "@/types";
import { money, khr, round2 } from "@/lib/format";
import { playCashRegisterSound } from "@/lib/sounds";

interface PaymentModalProps {
  orderData: {
    subtotal: number;
    tax: number;
    total: number;
    totalKhr: number;
    tableName: string;
  } | null;
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

export const PaymentModal: React.FC<PaymentModalProps> = ({
  orderData,
  onClose,
  onCompleteOrder,
  settings,
}) => {
  if (!orderData) return null;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isCustomChangeMode, setIsCustomChangeMode] = useState(false);
  const [cashTenderedUsd, setCashTenderedUsd] = useState<string>(orderData.total.toString());
  const [cashTenderedKhr, setCashTenderedKhr] = useState<string>("");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "KHR">("USD");

  const totalUsd = orderData.total;
  const totalKhr = orderData.totalKhr;

  // Calculate change
  let changeUsd = 0;
  let changeKhr = 0;
  let isEnough = true;

  if (!isCustomChangeMode) {
    // Default: Assume exact cash received
    changeUsd = 0;
    changeKhr = 0;
    isEnough = true;
  } else if (currencyMode === "USD") {
    const tendered = parseFloat(cashTenderedUsd) || 0;
    changeUsd = round2(tendered - totalUsd);
    changeKhr = Math.round(changeUsd * settings.exchangeRate);
    isEnough = tendered >= totalUsd;
  } else {
    const tenderedKhr = parseFloat(cashTenderedKhr) || 0;
    const tenderedUsdEquivalent = tenderedKhr / settings.exchangeRate;
    changeUsd = round2(tenderedUsdEquivalent - totalUsd);
    changeKhr = Math.round(tenderedKhr - totalKhr);
    isEnough = tenderedKhr >= totalKhr;
  }

  const handleQuickUsd = (amt: number) => {
    setCurrencyMode("USD");
    setCashTenderedUsd(amt.toString());
  };

  const handleQuickKhr = (amt: number) => {
    setCurrencyMode("KHR");
    setCashTenderedKhr(amt.toString());
  };

  const handleExactCash = () => {
    setIsCustomChangeMode(false);
    setCashTenderedUsd(totalUsd.toString());
    setCashTenderedKhr(totalKhr.toString());
  };

  const handleSubmitPayment = () => {
    if (paymentMethod === "cash" && isCustomChangeMode && !isEnough) return;

    playCashRegisterSound(settings.soundEnabled);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#10b981", "#3b82f6", "#eab308"],
      });
    } catch {
      // Confetti fallback
    }

    if (!isCustomChangeMode && paymentMethod === "cash") {
      onCompleteOrder({
        paymentMethod: "cash",
        cashReceived: totalUsd,
        changeDue: 0,
        cashReceivedKhr: totalKhr,
        changeDueKhr: 0,
      });
      return;
    }

    onCompleteOrder({
      paymentMethod,
      cashReceived: currencyMode === "USD" ? parseFloat(cashTenderedUsd) || totalUsd : undefined,
      changeDue: paymentMethod === "cash" && changeUsd > 0 ? changeUsd : 0,
      cashReceivedKhr: currencyMode === "KHR" ? parseFloat(cashTenderedKhr) || totalKhr : undefined,
      changeDueKhr: paymentMethod === "cash" && changeKhr > 0 ? changeKhr : 0,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitPayment();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/70 overflow-hidden animate-slide-up sm:animate-none">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-orange-400">
              Payment Checkout
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {money(totalUsd, settings.currency)}
              </h2>
              {settings.enableDualCurrency && (
                <span className="text-base font-bold text-amber-400 font-mono">
                  {khr(totalKhr)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Order: {orderData.tableName} • Rate: 1 USD = {settings.exchangeRate.toLocaleString()} KHR
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-4 p-2 bg-slate-950/40 border-b border-slate-800 gap-1.5">
          {[
            { id: "cash", label: "Cash", icon: Banknote },
            { id: "khqr", label: "KHQR / Bakong", icon: QrCode },
            { id: "card", label: "Card", icon: CreditCard },
            { id: "split", label: "Split", icon: Split },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = paymentMethod === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPaymentMethod(tab.id as PaymentMethod)}
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Payment Method Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {paymentMethod === "cash" && !isCustomChangeMode && (
            <div className="space-y-5 py-2">
              {/* Exact Cash Mode Banner */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-white">Exact Cash Tendered</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Amount: <span className="font-mono font-bold text-white">{money(totalUsd, settings.currency)}</span>
                    {settings.enableDualCurrency && ` (${khr(totalKhr)})`}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Change Due: $0.00 (Exact)
                  </span>
                </div>
              </div>

              {/* Optional switch to custom change calculator */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomChangeMode(true)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold underline"
                >
                  Need change calculation for larger bill? Tap here →
                </button>
              </div>
            </div>
          )}

          {paymentMethod === "cash" && isCustomChangeMode && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Tender Currency</span>
                <button
                  type="button"
                  onClick={() => handleExactCash()}
                  className="text-xs text-orange-400 hover:text-orange-300 font-semibold underline"
                >
                  ← Reset to Exact Cash
                </button>
              </div>

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setCurrencyMode("USD")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    currencyMode === "USD"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => setCurrencyMode("KHR")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    currencyMode === "KHR"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  KHR (៛)
                </button>
              </div>

              {/* Cash Input Field */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Cash Received ({currencyMode})
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-slate-400">
                    {currencyMode === "USD" ? "$" : "៛"}
                  </span>
                  <input
                    type="number"
                    step={currencyMode === "USD" ? "0.01" : "500"}
                    value={currencyMode === "USD" ? cashTenderedUsd : cashTenderedKhr}
                    onChange={(e) => {
                      if (currencyMode === "USD") {
                        setCashTenderedUsd(e.target.value);
                      } else {
                        setCashTenderedKhr(e.target.value);
                      }
                    }}
                    className="w-full text-3xl font-extrabold text-white bg-transparent focus:outline-none font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleExactCash}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition shrink-0"
                  >
                    Exact
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Quick Denominations</span>
                {currencyMode === "USD" ? (
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 5, 10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleQuickUsd(val)}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-sm border border-slate-700 transition"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {[5000, 10000, 20000, 50000, 100000].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleQuickKhr(val)}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition"
                      >
                        {val.toLocaleString()}៛
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Due Display */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isEnough
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isEnough ? "Change Due" : "Short Amount"}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold font-mono">
                      {money(Math.abs(changeUsd), settings.currency)}
                    </div>
                    {settings.enableDualCurrency && (
                      <div className="text-xs font-bold font-mono text-slate-300">
                        {khr(Math.abs(changeKhr))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "khqr" && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
              <div className="p-4 bg-white rounded-3xl shadow-xl shadow-orange-500/10 flex flex-col items-center">
                {/* SVG QR Code Simulation with Bakong Header */}
                <div className="bg-rose-600 text-white font-extrabold text-[11px] px-4 py-1 rounded-full mb-3 tracking-wider">
                  KHQR • BAKONG
                </div>
                {/* Simulated dynamic QR pattern */}
                <div className="w-48 h-48 bg-slate-950 p-2 rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
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
                <p className="text-[11px] font-bold text-slate-900 mt-2 font-mono">
                  {settings.merchantName}
                </p>
                <p className="text-xs font-extrabold text-orange-600 mt-0.5 font-mono">
                  {money(totalUsd, settings.currency)} ({khr(totalKhr)})
                </p>
              </div>

              <p className="text-xs text-slate-400 max-w-sm">
                Customer scans the KHQR using any Cambodian banking app (ABA, Wing, ACLEDA, Sathapana, etc.).
              </p>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <CreditCard className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-white">Tap, Insert or Swipe Card</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Card terminal will charge {money(totalUsd, settings.currency)} to the customer.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "split" && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">Split Payment Mode</h4>
              <p className="text-xs text-slate-400">
                Split invoice equally or customize partial card & partial cash amount:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-semibold">Cash Portion</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {money(round2(totalUsd / 2), settings.currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-semibold">Card Portion</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {money(round2(totalUsd / 2), settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            Back to Ticket
          </button>

          <button
            onClick={handleSubmitPayment}
            disabled={paymentMethod === "cash" && !isEnough}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
              paymentMethod === "cash" && !isEnough
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-[0.98]"
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <span>Complete Checkout ({money(totalUsd, settings.currency)})</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-amber-200 bg-black/20 rounded">
                Enter ↵
              </kbd>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

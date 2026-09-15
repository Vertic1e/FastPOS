import React from "react";
import { X, Printer, CheckCircle2 } from "lucide-react";
import type { Shift, StoreSettings } from "@/types";
import { money, khr, formatDateTime, round2 } from "@/lib/format";

interface ZReportModalProps {
  shift: Shift;
  onClose: () => void;
  settings: StoreSettings;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({
  shift,
  onClose,
  settings,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const actualCash = shift.closingCashUsd || 0;
  const expectedCash = shift.expectedCashUsd || 0;
  const variance = round2(actualCash - expectedCash);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h3 className="font-extrabold text-sm text-white">Daily Z-Report (Shift #{shift.id})</h3>
            <p className="text-[11px] text-slate-400">Official End of Shift Balancing Summary</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Paper View */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950/80 flex justify-center">
          <div
            id="thermal-receipt-print"
            className="w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-xl shadow-lg font-mono text-[11px] leading-tight select-text"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <h2 className="text-base font-extrabold font-serif uppercase tracking-tight">
                {settings.storeName}
              </h2>
              <p className="text-[10px] text-slate-600">*** Z-REPORT / SHIFT SUMMARY ***</p>
              <p className="text-[10px] text-slate-500">{settings.address}</p>
            </div>

            {/* Shift Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Shift #: {shift.id}</span>
                <span className="uppercase font-bold text-slate-700">{shift.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Opened:</span>
                <span>{formatDateTime(shift.openedAt)}</span>
              </div>
              {shift.closedAt && (
                <div className="flex justify-between">
                  <span>Closed:</span>
                  <span>{formatDateTime(shift.closedAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="font-bold">{shift.openedBy}</span>
              </div>
            </div>

            {/* Sales Breakdown */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="font-bold text-[10px] pb-1 border-b border-slate-200">
                SALES REVENUE
              </div>
              <div className="flex justify-between">
                <span>Total Orders Count:</span>
                <span className="font-bold">{shift.totalOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Sales:</span>
                <span>{money(shift.cashSalesUsd || 0, settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card Payments:</span>
                <span>{money(shift.cardSalesUsd || 0, settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>KHQR Payments:</span>
                <span>{money(shift.qrSalesUsd || 0, settings.currency)}</span>
              </div>
              {shift.refundsTotalUsd !== undefined && shift.refundsTotalUsd > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Total Refunds:</span>
                  <span>-{money(shift.refundsTotalUsd, settings.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-slate-300">
                <span>GROSS SALES:</span>
                <span>{money(shift.totalSalesUsd || 0, settings.currency)}</span>
              </div>
            </div>

            {/* Drawer Cash Audit */}
            <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="font-bold text-[10px] pb-1 border-b border-slate-200">
                CASH DRAWER AUDIT
              </div>
              <div className="flex justify-between">
                <span>Opening Cash Float:</span>
                <span>{money(shift.openingCashUsd, settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Cash Collected:</span>
                <span>{money(shift.cashSalesUsd || 0, settings.currency)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span>Expected Drawer Cash:</span>
                <span>{money(expectedCash, settings.currency)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Actual Counted Cash:</span>
                <span>{money(actualCash, settings.currency)}</span>
              </div>
              <div
                className={`flex justify-between font-extrabold pt-1 border-t border-slate-300 ${
                  variance === 0
                    ? "text-slate-800"
                    : variance > 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                <span>CASH VARIANCE:</span>
                <span>
                  {variance > 0 ? `+${money(variance, settings.currency)} (Over)` : variance < 0 ? `${money(variance, settings.currency)} (Short)` : "$0.00 (Balanced)"}
                </span>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-6 pb-2 text-[10px] space-y-6">
              <div className="flex justify-between">
                <span>Cashier Signature: ____________</span>
              </div>
              <div className="flex justify-between">
                <span>Manager Signature: ____________</span>
              </div>
            </div>

            <div className="text-center pt-2 text-[9px] text-slate-400">
              Generated by FastPOS Web • Daily Operations
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Z-Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Layers,
  Banknote,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { db } from "@/db";
import type { Shift, StoreSettings, CashMovement } from "@/types";
import { ZReportModal } from "./ZReportModal";
import { money, khr, formatDateTime, round2 } from "@/lib/format";

interface ShiftManagerProps {
  settings: StoreSettings;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const shifts = useLiveQuery(
    () => db.shifts.filter((s) => !s.shopId || s.shopId === activeShopId).reverse().sortBy("openedAt"),
    [activeShopId]
  ) || [];
  const activeShift = shifts.find((s) => s.status === "open");

  // Open Shift Form State
  const [cashierName, setCashierName] = useState("Alex Rivers");
  const [openingFloatUsd, setOpeningFloatUsd] = useState("100.00");
  const [openingFloatKhr, setOpeningFloatKhr] = useState("400000");

  // Close Shift Form State
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [countedCashUsd, setCountedCashUsd] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Cash In / Cash Out State
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"in" | "out">("out");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  // Selected Z-Report modal
  const [reportShift, setReportShift] = useState<Shift | null>(null);

  // Cash movements for active shift
  const cashMovements = useLiveQuery(
    () => (activeShift?.id ? db.cashMovements.where("shiftId").equals(activeShift.id).toArray() : []),
    [activeShift?.id]
  ) || [];

  // Open New Shift
  const handleOpenShift = async () => {
    const floatUsd = parseFloat(openingFloatUsd) || 0;
    const floatKhr = parseFloat(openingFloatKhr) || 0;

    await db.shifts.add({
      shopId: activeShopId,
      status: "open",
      openedAt: new Date(),
      openedBy: cashierName.trim() || "Cashier",
      openingCashUsd: floatUsd,
      openingCashKhr: floatKhr,
      expectedCashUsd: floatUsd,
      expectedCashKhr: floatKhr,
      totalSalesUsd: 0,
      totalSalesKhr: 0,
      totalOrders: 0,
      cashSalesUsd: 0,
      cardSalesUsd: 0,
      qrSalesUsd: 0,
      refundsTotalUsd: 0,
    });
  };

  // Close Active Shift
  const handleConfirmCloseShift = async () => {
    if (!activeShift) return;

    const actualCash = parseFloat(countedCashUsd) || 0;
    const expectedCash = activeShift.expectedCashUsd || activeShift.openingCashUsd;

    const updated: Partial<Shift> = {
      status: "closed",
      closedAt: new Date(),
      closedBy: cashierName,
      closingCashUsd: actualCash,
      notes: closeNotes.trim() || undefined,
    };

    await db.shifts.update(activeShift.id!, updated);

    // Show Z-Report
    setReportShift({ ...activeShift, ...updated } as Shift);
    setIsClosingShift(false);
    setCountedCashUsd("");
    setCloseNotes("");
  };

  // Record Cash In / Out
  const handleSaveMovement = async () => {
    if (!activeShift) return;
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) return;

    await db.cashMovements.add({
      shiftId: activeShift.id!,
      type: movementType,
      amountUsd: amt,
      amountKhr: Math.round(amt * settings.exchangeRate),
      reason: movementReason.trim() || (movementType === "in" ? "Cash In" : "Cash Out"),
      createdAt: new Date(),
    });

    const prevExpCash = activeShift.expectedCashUsd || activeShift.openingCashUsd;
    const newExpCash = movementType === "in" ? prevExpCash + amt : Math.max(0, prevExpCash - amt);

    await db.shifts.update(activeShift.id!, {
      expectedCashUsd: round2(newExpCash),
    });

    setIsCashMovementOpen(false);
    setMovementAmount("");
    setMovementReason("");
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Shift & Cash Register Management
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Open shifts, track cash drawer flow, record payouts, and generate daily End-of-Day Z-Reports
        </p>
      </div>

      {/* Active Shift Card or Open Shift Prompt */}
      {!activeShift ? (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-xl mx-auto shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Start New Cashier Shift</h3>
              <p className="text-xs text-slate-400">Open register float to begin daily operations</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Cashier Name</label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Opening Float (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingFloatUsd}
                  onChange={(e) => setOpeningFloatUsd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Opening Float (KHR ៛)</label>
                <input
                  type="number"
                  step="1000"
                  value={openingFloatKhr}
                  onChange={(e) => setOpeningFloatKhr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              onClick={handleOpenShift}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition cursor-pointer mt-2"
            >
              Open Register Shift
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Shift Overview */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white">
                      Active Shift #{activeShift.id}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      Open
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cashier: <span className="text-slate-200 font-bold">{activeShift.openedBy}</span> • Started at {formatDateTime(activeShift.openedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCashMovementOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Cash In / Payout</span>
                </button>

                <button
                  onClick={() => {
                    setCountedCashUsd((activeShift.expectedCashUsd || activeShift.openingCashUsd).toFixed(2));
                    setIsClosingShift(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                >
                  <span>Close Shift & Z-Report</span>
                </button>
              </div>
            </div>

            {/* Financial Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Opening Float
                </span>
                <span className="text-xl font-extrabold font-mono text-white">
                  {money(activeShift.openingCashUsd, settings.currency)}
                </span>
                <p className="text-[10px] font-mono text-slate-500">
                  {khr(activeShift.openingCashKhr)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Sales ({activeShift.totalOrders || 0} orders)
                </span>
                <span className="text-xl font-extrabold font-mono text-emerald-400">
                  {money(activeShift.totalSalesUsd || 0, settings.currency)}
                </span>
                <p className="text-[10px] font-mono text-slate-500">
                  {khr((activeShift.totalSalesUsd || 0) * settings.exchangeRate)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cash Collected
                </span>
                <span className="text-xl font-extrabold font-mono text-amber-400">
                  {money(activeShift.cashSalesUsd || 0, settings.currency)}
                </span>
                <p className="text-[10px] text-slate-500">
                  Card: {money(activeShift.cardSalesUsd || 0)} • QR: {money(activeShift.qrSalesUsd || 0)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expected in Drawer
                </span>
                <span className="text-xl font-extrabold font-mono text-white">
                  {money(activeShift.expectedCashUsd || activeShift.openingCashUsd, settings.currency)}
                </span>
                <p className="text-[10px] text-slate-500">Float + Cash Sales</p>
              </div>
            </div>

            {/* Cash Movements in this shift */}
            {cashMovements.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  Cash In / Payout Logs ({cashMovements.length})
                </h4>
                <div className="divide-y divide-slate-800 bg-slate-950 rounded-2xl border border-slate-800 p-3 text-xs">
                  {cashMovements.map((m) => (
                    <div key={m.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.type === "in" ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        )}
                        <div>
                          <span className="font-bold text-slate-200">{m.reason}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {formatDateTime(m.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          m.type === "in" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {m.type === "in" ? "+" : "-"}
                        {money(m.amountUsd, settings.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past Shifts History */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-base text-white">Shift Records & Z-Reports</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Shift ID</th>
                  <th className="py-3.5 px-4">Opened</th>
                  <th className="py-3.5 px-4">Closed</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Total Revenue</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Z-Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-3.5 px-4 font-bold font-mono text-orange-400">
                      #{s.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDateTime(s.openedAt)}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {s.closedAt ? formatDateTime(s.closedAt) : "Still open"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-semibold">{s.openedBy}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{s.totalOrders || 0}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {money(s.totalSalesUsd || 0, settings.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          s.status === "open"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setReportShift(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        <Printer className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Close Shift Modal */}
      {isClosingShift && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-white">Close Shift #{activeShift.id}</h3>
            <p className="text-xs text-slate-400">
              Count the physical cash in the drawer and enter the total below to generate the End of Day Z-Report.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono font-bold text-white">
                  {money(activeShift.expectedCashUsd || activeShift.openingCashUsd, settings.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Actual Counted Cash ($) *</label>
              <input
                type="number"
                step="0.01"
                value={countedCashUsd}
                onChange={(e) => setCountedCashUsd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-extrabold text-base focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Shift Notes (Optional)</label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Cleaned espresso machine, 500 riel shortage..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsClosingShift(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCloseShift}
                disabled={!countedCashUsd}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition"
              >
                Close Shift & Print Z-Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash In / Out Modal */}
      {isCashMovementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-white">Cash Drawer Payout / In</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMovementType("out")}
                className={`py-2 px-3 rounded-xl font-bold transition ${
                  movementType === "out"
                    ? "bg-rose-500 text-white shadow"
                    : "bg-slate-950 border border-slate-800 text-slate-400"
                }`}
              >
                Cash Out (Payout)
              </button>
              <button
                type="button"
                onClick={() => setMovementType("in")}
                className={`py-2 px-3 rounded-xl font-bold transition ${
                  movementType === "in"
                    ? "bg-emerald-500 text-white shadow"
                    : "bg-slate-950 border border-slate-800 text-slate-400"
                }`}
              >
                Cash In (Deposit)
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Reason / Expense Description *</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="e.g. Bought fresh milk, ice delivery, petty cash..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCashMovementOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMovement}
                disabled={!movementAmount || !movementReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
              >
                Save Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {reportShift && (
        <ZReportModal
          shift={reportShift}
          onClose={() => setReportShift(null)}
          settings={settings}
        />
      )}
    </div>
  );
};

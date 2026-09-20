import React from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Printer, FileText } from "lucide-react";
import { db } from "@/db";
import type { Shift, StoreSettings, CashMovement } from "@/types";
import { money, khr, formatDateTime, round2 } from "@/lib/format";
import { Modal, Button } from "@/components/ui";

interface ZReportModalProps {
  shift: Shift | null;
  onClose: () => void;
  settings: StoreSettings;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({ shift, onClose, settings }) => {
  const shiftId = shift?.id;
  const movements = useLiveQuery<CashMovement[]>(() => (shiftId != null ? db.cashMovements.where("shiftId").equals(shiftId).sortBy("createdAt") : Promise.resolve([] as CashMovement[])), [shiftId]) || [];
  if (!shift) return null;

  const actualCash = shift.closingCashUsd || 0;
  const expectedCash = shift.expectedCashUsd || 0;
  const variance = round2(actualCash - expectedCash);
  const cashIn = round2(movements.filter((m) => m.type === "in").reduce((s, m) => s + m.amountUsd, 0));
  const cashOut = round2(movements.filter((m) => m.type === "out").reduce((s, m) => s + m.amountUsd, 0));
  const netSales = round2((shift.totalSalesUsd || 0) - (shift.refundsTotalUsd || 0));

  const paper = (
    <>
      <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2.5 text-center">
        <h2 className="text-sm font-extrabold uppercase tracking-tight">{settings.storeName}</h2>
        <p className="text-[0.625rem] font-bold">*** Z-REPORT · SHIFT SUMMARY ***</p>
        {settings.address && <p className="text-[0.625rem] text-slate-600">{settings.address}</p>}
      </div>

      <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2 text-[0.625rem]">
        <Line l={`Shift #${shift.id}`} r={shift.status.toUpperCase()} />
        <Line l="Opened" r={formatDateTime(shift.openedAt)} />
        <Line l="Closed" r={shift.closedAt ? formatDateTime(shift.closedAt) : "—"} />
        <Line l="Cashier" r={shift.openedBy} />
        {shift.closedBy && shift.closedBy !== shift.openedBy && <Line l="Closed by" r={shift.closedBy} />}
      </div>

      <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2">
        <p className="mb-1 text-[0.625rem] font-bold uppercase text-slate-500">Sales</p>
        <Line l="Orders" r={String(shift.totalOrders || 0)} />
        <Line l="Gross sales" r={money(shift.totalSalesUsd || 0, settings.currency)} />
        <Line l="Refunds" r={`-${money(shift.refundsTotalUsd || 0, settings.currency)}`} />
        <Line l="NET SALES" r={money(netSales, settings.currency)} bold />
        {settings.enableDualCurrency && <Line l="Net in KHR" r={khr(Math.round(netSales * settings.exchangeRate))} />}
      </div>

      <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2">
        <p className="mb-1 text-[0.625rem] font-bold uppercase text-slate-500">By payment method</p>
        <Line l="Cash" r={money(shift.cashSalesUsd || 0, settings.currency)} />
        <Line l="Card" r={money(shift.cardSalesUsd || 0, settings.currency)} />
        <Line l="KHQR" r={money(shift.qrSalesUsd || 0, settings.currency)} />
      </div>

      <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2">
        <p className="mb-1 text-[0.625rem] font-bold uppercase text-slate-500">Cash drawer</p>
        <Line l="Opening float" r={money(shift.openingCashUsd, settings.currency)} />
        <Line l="+ Cash sales" r={money(shift.cashSalesUsd || 0, settings.currency)} />
        <Line l="+ Cash in" r={money(cashIn, settings.currency)} />
        <Line l="- Cash out" r={money(cashOut, settings.currency)} />
        <Line l="Expected" r={money(expectedCash, settings.currency)} bold />
        <Line l="Counted" r={money(actualCash, settings.currency)} bold />
        <div className={`mt-1 flex justify-between border px-1.5 py-1 text-xs font-extrabold ${variance === 0 ? "border-slate-900" : "border-slate-900 bg-slate-100"}`}>
          <span>VARIANCE</span>
          <span>{variance > 0 ? `+${money(variance, settings.currency)} OVER` : variance < 0 ? `${money(variance, settings.currency)} SHORT` : "BALANCED"}</span>
        </div>
      </div>

      {movements.length > 0 && (
        <div className="space-y-0.5 border-b border-dashed border-slate-400 py-2 text-[0.625rem]">
          <p className="mb-1 font-bold uppercase text-slate-500">Cash movements</p>
          {movements.map((m) => (
            <Line key={m.id} l={`${m.type === "in" ? "IN " : "OUT"} ${m.reason}`} r={`${m.type === "in" ? "+" : "-"}${money(m.amountUsd, settings.currency)}`} />
          ))}
        </div>
      )}

      {shift.notes && (
        <div className="border-b border-dashed border-slate-400 py-2 text-[0.625rem]">
          <p className="font-bold uppercase text-slate-500">Notes</p>
          <p className="italic">{shift.notes}</p>
        </div>
      )}

      <div className="pt-3 text-center text-[0.625rem] text-slate-600">
        <p>Signature: ______________________</p>
        <p className="mt-2">Printed {formatDateTime(new Date())}</p>
      </div>
    </>
  );

  return (
    <>
      <Modal
        open={!!shift}
        onClose={onClose}
        size="sm"
        title={`Z-report · shift #${shift.id}`}
        description={`${shift.openedBy} · ${formatDateTime(shift.openedAt)}`}
        icon={<FileText />}
        bodyClassName="bg-surface-2/60 flex justify-center"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Done
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={() => window.print()} leftIcon={<Printer className="h-5 w-5" />}>
              Print
            </Button>
          </div>
        }
      >
        <div className="w-full max-w-[20rem] select-text rounded-xl bg-white p-4 font-mono text-[0.6875rem] leading-tight text-slate-900 shadow-md">{paper}</div>
      </Modal>
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

const Line: React.FC<{ l: string; r: string; bold?: boolean }> = ({ l, r, bold }) => (
  <div className={`flex justify-between gap-2 ${bold ? "font-extrabold" : ""}`}>
    <span className="truncate">{l}</span>
    <span className="shrink-0">{r}</span>
  </div>
);

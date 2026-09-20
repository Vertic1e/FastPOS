import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Layers, Banknote, ArrowDownRight, ArrowUpRight, FileText, Clock, User, Receipt, CreditCard, QrCode, LockKeyhole, Play, ChevronRight } from "lucide-react";
import { db } from "@/db";
import type { Shift, StoreSettings, CashMovement } from "@/types";
import { ZReportModal } from "./ZReportModal";
import { money, khr, formatDateTime, formatTime, round2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Page, PageHeader, Card, CardHeader, CardBody, StatCard, Button, Field, Input, Textarea, Modal, Segmented, Badge, EmptyState, useToast } from "@/components/ui";

interface ShiftManagerProps {
  settings: StoreSettings;
}

function elapsed(from: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const toast = useToast();
  const shifts = useLiveQuery(() => db.shifts.filter((s) => !s.shopId || s.shopId === activeShopId).reverse().sortBy("openedAt"), [activeShopId]) || [];
  const activeShift = shifts.find((s) => s.status === "open");
  const closedShifts = shifts.filter((s) => s.status === "closed");

  // Open shift form
  const [cashierName, setCashierName] = useState("");
  const [openingFloatUsd, setOpeningFloatUsd] = useState("100");
  const [openingFloatKhr, setOpeningFloatKhr] = useState("400000");

  // Close shift dialog
  const [isClosing, setIsClosing] = useState(false);
  const [countedCashUsd, setCountedCashUsd] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Cash in/out dialog
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"in" | "out">("out");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  const [reportShift, setReportShift] = useState<Shift | null>(null);

  const cashMovements = useLiveQuery<CashMovement[]>(() => (activeShift?.id ? db.cashMovements.where("shiftId").equals(activeShift.id).reverse().sortBy("createdAt") : Promise.resolve([] as CashMovement[])), [activeShift?.id]) || [];

  const openShift = async () => {
    const floatUsd = parseFloat(openingFloatUsd) || 0;
    const floatKhr = parseFloat(openingFloatKhr) || 0;
    const name = cashierName.trim() || "Cashier";
    await db.shifts.add({
      shopId: activeShopId,
      status: "open",
      openedAt: new Date(),
      openedBy: name,
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
    toast({ title: "Shift opened", description: `${name} · float ${money(floatUsd, settings.currency)}` });
  };

  const confirmClose = async () => {
    if (!activeShift) return;
    const actualCash = parseFloat(countedCashUsd) || 0;
    const updated: Partial<Shift> = {
      status: "closed",
      closedAt: new Date(),
      closedBy: activeShift.openedBy,
      closingCashUsd: actualCash,
      notes: closeNotes.trim() || undefined,
    };
    await db.shifts.update(activeShift.id!, updated);
    setReportShift({ ...activeShift, ...updated } as Shift);
    setIsClosing(false);
    setCountedCashUsd("");
    setCloseNotes("");
  };

  const saveMovement = async () => {
    if (!activeShift) return;
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) return;
    const reason = movementReason.trim() || (movementType === "in" ? "Cash in" : "Cash out");
    await db.cashMovements.add({
      shiftId: activeShift.id!,
      type: movementType,
      amountUsd: amt,
      amountKhr: Math.round(amt * settings.exchangeRate),
      reason,
      createdAt: new Date(),
    });
    const prevExpCash = activeShift.expectedCashUsd || activeShift.openingCashUsd;
    const newExpCash = movementType === "in" ? prevExpCash + amt : Math.max(0, prevExpCash - amt);
    await db.shifts.update(activeShift.id!, { expectedCashUsd: round2(newExpCash) });
    toast({ title: movementType === "in" ? "Cash added to drawer" : "Cash removed from drawer", description: `${money(amt, settings.currency)} · ${reason}`, tone: "info" });
    setMovementOpen(false);
    setMovementAmount("");
    setMovementReason("");
  };

  const expectedCash = activeShift ? activeShift.expectedCashUsd ?? activeShift.openingCashUsd : 0;
  const counted = parseFloat(countedCashUsd);
  const variance = Number.isNaN(counted) ? null : round2(counted - expectedCash);

  return (
    <Page>
      <PageHeader title="Shift & cash drawer" subtitle="Open the register, log cash in/out and close with a Z-report." />

      {!activeShift ? (
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader icon={<Layers />} title="Open a shift" subtitle="Count the float in the drawer before the first sale." />
          <CardBody className="flex flex-col gap-4">
            <Field label="Cashier name">
              <Input value={cashierName} onChange={(e) => setCashierName(e.target.value)} placeholder="Who is on the register?" leftIcon={<User />} autoComplete="name" enterKeyHint="next" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Float (${settings.currency})`}>
                <Input type="text" inputMode="decimal" value={openingFloatUsd} onChange={(e) => setOpeningFloatUsd(e.target.value.replace(/[^0-9.]/g, ""))} prefix={settings.currency} mono size="lg" />
              </Field>
              <Field label="Float (KHR)">
                <Input type="text" inputMode="numeric" value={openingFloatKhr} onChange={(e) => setOpeningFloatKhr(e.target.value.replace(/\D/g, ""))} prefix="៛" mono size="lg" />
              </Field>
            </div>
            <Button variant="primary" size="xl" fullWidth onClick={openShift} leftIcon={<Play className="h-5 w-5 fill-current" />}>
              Open shift
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-ok-soft/40 p-4">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-ok" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-fg">Shift open · {activeShift.openedBy}</h3>
                  <p className="text-xs text-fg-muted">
                    Since {formatTime(activeShift.openedAt)} · {elapsed(activeShift.openedAt)} · #{activeShift.id}
                  </p>
                </div>
                <Button variant="danger" size="md" onClick={() => setIsClosing(true)} leftIcon={<LockKeyhole className="h-4 w-4" />}>
                  Close shift
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
                <StatCard label="Sales" value={money(activeShift.totalSalesUsd || 0, settings.currency)} hint={`${activeShift.totalOrders || 0} orders`} tone="success" icon={<Receipt />} />
                <StatCard label="Cash sales" value={money(activeShift.cashSalesUsd || 0, settings.currency)} icon={<Banknote />} />
                <StatCard label="Card" value={money(activeShift.cardSalesUsd || 0, settings.currency)} icon={<CreditCard />} />
                <StatCard label="KHQR" value={money(activeShift.qrSalesUsd || 0, settings.currency)} icon={<QrCode />} />
              </div>
            </Card>

            <Card>
              <CardHeader
                icon={<Banknote />}
                title="Cash drawer"
                subtitle="Expected cash right now"
                actions={
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setMovementType("in");
                        setMovementOpen(true);
                      }}
                      leftIcon={<ArrowDownRight className="h-4 w-4 text-ok" />}
                    >
                      Cash in
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setMovementType("out");
                        setMovementOpen(true);
                      }}
                      leftIcon={<ArrowUpRight className="h-4 w-4 text-bad" />}
                    >
                      Cash out
                    </Button>
                  </div>
                }
              />
              <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2 rounded-2xl bg-surface-2/60 p-4">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-fg-subtle">Expected in drawer</span>
                  <span className="num block text-3xl font-extrabold text-fg">{money(expectedCash, settings.currency)}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 text-xs text-fg-muted sm:text-sm">
                  <dt>Opening float</dt>
                  <dd className="num text-right">{money(activeShift.openingCashUsd, settings.currency)}</dd>
                  <dt>+ Cash sales</dt>
                  <dd className="num text-right">{money(activeShift.cashSalesUsd || 0, settings.currency)}</dd>
                  <dt>± Movements</dt>
                  <dd className="num text-right">{money(round2(cashMovements.reduce((s, m) => s + (m.type === "in" ? m.amountUsd : -m.amountUsd), 0)), settings.currency)}</dd>
                  {settings.enableDualCurrency && (
                    <>
                      <dt>KHR float</dt>
                      <dd className="num text-right">{khr(activeShift.openingCashKhr)}</dd>
                    </>
                  )}
                </dl>
              </div>

              {cashMovements.length > 0 && (
                <ul className="divide-y divide-line rounded-2xl border border-line">
                  {cashMovements.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", m.type === "in" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                        {m.type === "in" ? <ArrowDownRight className="h-4.5 w-4.5" /> : <ArrowUpRight className="h-4.5 w-4.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">{m.reason}</span>
                        <span className="num block text-xs text-fg-subtle">{formatTime(m.createdAt)}</span>
                      </span>
                      <span className={cn("num text-sm font-bold", m.type === "in" ? "text-ok" : "text-bad")}>
                        {m.type === "in" ? "+" : "−"}
                        {money(m.amountUsd, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              </CardBody>
            </Card>
          </div>

          <Card className="self-start">
            <CardHeader icon={<Clock />} title="This shift" />
            <dl className="flex flex-col gap-2 p-4 text-sm sm:p-5">
              <Row label="Opened" value={formatDateTime(activeShift.openedAt)} />
              <Row label="Cashier" value={activeShift.openedBy} />
              <Row label="Orders" value={String(activeShift.totalOrders || 0)} />
              <Row label="Refunds" value={money(activeShift.refundsTotalUsd || 0, settings.currency)} tone={activeShift.refundsTotalUsd ? "danger" : undefined} />
              <Row label="Net sales" value={money(round2((activeShift.totalSalesUsd || 0) - (activeShift.refundsTotalUsd || 0)), settings.currency)} tone="success" />
            </dl>
          </Card>
        </div>
      )}

      {/* History */}
      <section>
        <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-fg-subtle">Previous shifts</h3>
        {closedShifts.length === 0 ? (
          <EmptyState icon={<FileText />} title="No closed shifts yet" description="Z-reports for closed shifts will be listed here." className="rounded-3xl border border-line bg-surface py-10" />
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
            {closedShifts.map((s) => {
              const v = round2((s.closingCashUsd || 0) - (s.expectedCashUsd || 0));
              return (
                <li key={s.id} className="border-b border-line last:border-b-0">
                  <button type="button" onClick={() => setReportShift(s)} className="press flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-2 sm:px-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg-muted">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-bold text-fg">{formatDateTime(s.openedAt)}</span>
                        <span className="text-xs text-fg-subtle">→ {s.closedAt ? formatTime(s.closedAt) : "—"}</span>
                      </span>
                      <span className="block truncate text-xs text-fg-muted">
                        {s.openedBy} · {s.totalOrders || 0} orders
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-sm font-extrabold text-fg">{money(s.totalSalesUsd || 0, settings.currency)}</span>
                      <Badge tone={v === 0 ? "success" : v > 0 ? "info" : "danger"}>{v === 0 ? "Balanced" : v > 0 ? `+${money(v, settings.currency)} over` : `${money(v, settings.currency)} short`}</Badge>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-fg-subtle" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Close shift dialog */}
      <Modal
        open={isClosing && !!activeShift}
        onClose={() => setIsClosing(false)}
        size="sm"
        title="Close shift"
        description="Count the cash in the drawer, then confirm."
        icon={<LockKeyhole />}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setIsClosing(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" fullWidth onClick={confirmClose} disabled={countedCashUsd === ""}>
              Close & print Z-report
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl bg-surface-2/60 px-4 py-3">
            <span className="text-sm text-fg-muted">Expected cash</span>
            <span className="num text-lg font-extrabold text-fg">{money(expectedCash, settings.currency)}</span>
          </div>
          <Field label={`Counted cash (${settings.currency})`} required>
            <Input type="text" inputMode="decimal" value={countedCashUsd} onChange={(e) => setCountedCashUsd(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" prefix={settings.currency} mono size="lg" autoFocus enterKeyHint="done" />
          </Field>
          {variance !== null && (
            <div className={cn("flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold", variance === 0 ? "bg-ok-soft text-ok" : variance > 0 ? "bg-info-soft text-info" : "bg-bad-soft text-bad")} aria-live="polite">
              <span>{variance === 0 ? "Drawer balanced" : variance > 0 ? "Over by" : "Short by"}</span>
              <span className="num">{variance === 0 ? "✓" : money(Math.abs(variance), settings.currency)}</span>
            </div>
          )}
          <Field label="Notes">
            <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Anything the manager should know?" rows={2} className="min-h-[4rem]" />
          </Field>
        </div>
      </Modal>

      {/* Cash movement dialog */}
      <Modal
        open={movementOpen && !!activeShift}
        onClose={() => setMovementOpen(false)}
        size="sm"
        title="Cash movement"
        description="Record money added to or taken out of the drawer."
        icon={<Banknote />}
        footer={
          <Button variant={movementType === "in" ? "success" : "danger"} size="lg" fullWidth onClick={saveMovement} disabled={!(parseFloat(movementAmount) > 0)}>
            {movementType === "in" ? "Add to drawer" : "Take from drawer"} {parseFloat(movementAmount) > 0 && money(parseFloat(movementAmount), settings.currency)}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Segmented<"in" | "out">
            fullWidth
            aria-label="Movement type"
            value={movementType}
            onChange={setMovementType}
            options={[
              { value: "in", label: "Cash in", icon: <ArrowDownRight />, tone: "success" },
              { value: "out", label: "Cash out", icon: <ArrowUpRight />, tone: "danger" },
            ]}
          />
          <Field label={`Amount (${settings.currency})`} required>
            <Input type="text" inputMode="decimal" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" prefix={settings.currency} mono size="lg" autoFocus enterKeyHint="next" />
          </Field>
          <Field label="Reason">
            <Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder={movementType === "in" ? "e.g. change from bank" : "e.g. supplier payment, tips"} enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && saveMovement()} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {(movementType === "in" ? ["Change from bank", "Owner top-up", "Correction"] : ["Supplier payment", "Tips payout", "Bank deposit", "Petty cash"]).map((r) => (
              <button key={r} type="button" onClick={() => setMovementReason(r)} className="press h-9 rounded-full border border-line bg-surface-2 px-3 text-xs font-semibold text-fg-muted hover:text-fg">
                {r}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ZReportModal shift={reportShift} onClose={() => setReportShift(null)} settings={settings} />
    </Page>
  );
};

const Row: React.FC<{ label: string; value: string; tone?: "success" | "danger" }> = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0">
    <dt className="text-fg-muted">{label}</dt>
    <dd className={cn("num text-right font-semibold", tone === "success" ? "text-ok" : tone === "danger" ? "text-bad" : "text-fg")}>{value}</dd>
  </div>
);

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtTime, money, n } from "@/lib/format";
import { getOrderDetail } from "@/lib/queries";
import { getOrCreateSettings } from "@/lib/seed";
import { PrintBar } from "./print-bar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const auto = sp.auto === "1";

  const orderId = parseInt(id, 10);
  if (!Number.isFinite(orderId)) notFound();

  const data = await getOrderDetail(orderId);
  if (!data) notFound();
  const settings = await getOrCreateSettings();
  const currency = settings.currency;
  const secondaryCurrency = settings.secondaryCurrency || "KHR";
  const enableDual = settings.enableDualCurrency ?? true;

  const { order, items } = data;
  const rate = n(order.exchangeRate) || n(settings.exchangeRate) || 4000;
  const totalKhrVal = n(order.totalKhr) || Math.round(n(order.total) * rate);

  return (
    <div className="min-h-dvh bg-[#e9e5dc] py-8">
      <PrintBar auto={auto} orderNumber={order.orderNumber} />

      {/* Printable area — 80mm thermal look */}
      <div
        id="print-area"
        className="receipt-paper mx-auto w-[320px] bg-white p-5 text-[12px] leading-[1.45] text-black shadow-xl"
      >
        <div className="text-center">
          <p className="text-[17px] font-bold tracking-wide">{settings.storeName}</p>
          <p>{settings.address}</p>
          <p>{settings.phone}</p>
          {settings.receiptHeader && <p className="mt-1.5 italic">{settings.receiptHeader}</p>}
        </div>

        {order.status === "refunded" && (
          <div className="my-3 rounded border-2 border-red-500 bg-red-50 py-2 text-center">
            <p className="text-[14px] font-black uppercase tracking-widest text-red-600">⚠ REFUNDED ⚠</p>
            {order.refundNote && <p className="mt-0.5 text-[10px] text-red-500">{order.refundNote}</p>}
          </div>
        )}

        <div className="my-3 border-t border-dashed border-black/60" />

        <div className="flex justify-between">
          <span>Order #{order.orderNumber}</span>
          <span>
            {fmtDate(order.createdAt)} {fmtTime(order.createdAt)}
          </span>
        </div>
        {order.cashierName && <p>Cashier: {order.cashierName}</p>}

        <div className="my-3 border-t border-dashed border-black/60" />

        <table className="w-full">
          <tbody>
            {items.map((it) => (
              <FragmentRows
                key={it.id}
                name={it.name}
                qty={it.qty}
                unit={money(it.unitPrice, currency)}
                total={money(it.lineTotal, currency)}
                mods={it.modifiers
                  .map((m) => `${m.option}${m.price > 0 ? ` +${money(m.price, currency)}` : ""}`)
                  .join(", ")}
                note={it.note}
              />
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed border-black/60" />

        <div className="space-y-0.5">
          <Row label="Subtotal" value={money(order.subtotal, currency)} />
          <Row label={`Tax (${n(settings.taxRate)}%)`} value={money(order.tax, currency)} />

          <div className="mt-1.5 flex justify-between border-t border-dashed border-black/40 pt-1 text-[15px] font-bold">
            <span>TOTAL ({currency})</span>
            <span>{money(order.total, currency)}</span>
          </div>

          {enableDual && (
            <div className="flex justify-between font-bold text-[14px]">
              <span>TOTAL ({secondaryCurrency})</span>
              <span>{totalKhrVal.toLocaleString()} {secondaryCurrency}</span>
            </div>
          )}

          {enableDual && (
            <p className="mt-0.5 text-[10px] italic text-right text-black/60">
              Exchange Rate: 1 {currency} = {rate.toLocaleString()} {secondaryCurrency}
            </p>
          )}

          <div className="mt-2 border-t border-dashed border-black/40 pt-1 space-y-0.5">
            {order.paymentMethod === "card" ? (
              <Row label="Payment (Card)" value={money(order.total, currency)} />
            ) : order.paymentMethod === "khqr" ? (
              <Row label="Payment (KHQR)" value={money(order.total, currency)} />
            ) : (
              <>
                {order.cashReceived && (
                  <Row label={`Cash Tendered (${currency})`} value={money(order.cashReceived, currency)} />
                )}
                {order.cashReceivedKhr && (
                  <Row
                    label={`Cash Tendered (${secondaryCurrency})`}
                    value={`${n(order.cashReceivedKhr).toLocaleString()} ${secondaryCurrency}`}
                  />
                )}
                {!order.cashReceived && !order.cashReceivedKhr && (
                  <Row label="Cash Tendered" value={money(order.total, currency)} />
                )}
                {order.changeDue !== null && (
                  <Row label={`Change Due (${currency})`} value={money(order.changeDue, currency)} />
                )}
                {enableDual && (order.changeDueKhr !== null || order.changeDue !== null) && (
                  <Row
                    label={`Change Due (${secondaryCurrency})`}
                    value={`${(n(order.changeDueKhr) || Math.round(n(order.changeDue) * rate)).toLocaleString()} ${secondaryCurrency}`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-black/60" />

        <p className="text-center">{settings.receiptFooter}</p>

        {/* Faux barcode */}
        <div className="mt-4 flex h-10 items-stretch justify-center gap-[2px]">
          {Array.from({ length: 42 }).map((_, i) => (
            <span
              key={i}
              className="bg-black"
              style={{ width: (i * 7 + order.orderNumber) % 3 === 0 ? 3 : 1.5 }}
            />
          ))}
        </div>
        <p className="mt-1 text-center tracking-[0.3em]">{String(order.orderNumber).padStart(8, "0")}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function FragmentRows({
  name,
  qty,
  unit,
  total,
  mods,
  note,
}: {
  name: string;
  qty: number;
  unit: string;
  total: string;
  mods: string;
  note: string | null;
}) {
  return (
    <>
      <tr>
        <td className="pr-2 align-top">{name}</td>
        <td className="w-8 align-top text-right tabular-nums">{qty}×</td>
        <td className="w-16 align-top text-right tabular-nums">{total}</td>
      </tr>
      <tr>
        <td colSpan={3} className="pb-1.5 text-black/55">
          {qty > 1 ? `@ ${unit} each · ` : ""}
          {mods}
          {mods && note ? " · " : ""}
          {note ? `“${note}”` : ""}
        </td>
      </tr>
    </>
  );
}

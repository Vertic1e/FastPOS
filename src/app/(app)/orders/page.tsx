import { Banknote, CreditCard, Printer, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtTime, money, n } from "@/lib/format";
import { getOrdersList, type OrderRange } from "@/lib/queries";
import { getOrCreateSettings } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const RANGES: { key: OrderRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "all", label: "All time" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const settings = await getOrCreateSettings();
  const currency = settings.currency;
  const secondaryCurrency = settings.secondaryCurrency || "KHR";
  const enableDual = settings.enableDualCurrency ?? true;
  const rate = n(settings.exchangeRate) || 4000;

  const sp = await searchParams;
  const range: OrderRange = sp.range === "week" || sp.range === "all" ? sp.range : "today";
  const q = (sp.q ?? "").trim();

  const { rows, rangeRevenue, rangeCount } = await getOrdersList(range, q || undefined);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Orders</h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {rangeCount} orders · {money(rangeRevenue, currency)}
            {enableDual && ` (${Math.round(rangeRevenue * rate).toLocaleString()} ${secondaryCurrency})`} in this period
          </p>
        </div>
        <form method="get" className="flex gap-2">
          <input type="hidden" name="range" value={range} />
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              name="q"
              defaultValue={q}
              inputMode="numeric"
              placeholder="Order # (e.g. 1042)"
              className="w-52 rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>
          <button className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]">
            Find
          </button>
        </form>
      </header>

      <div className="anim-rise flex gap-1 rounded-2xl bg-ink/[0.05] p-1 sm:w-fit" style={{ animationDelay: "0.05s" }}>
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/orders?range=${r.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`flex-1 rounded-xl px-4 py-2 text-center text-[13px] font-semibold transition-all sm:flex-none ${
              range === r.key ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="anim-rise flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper px-6 py-16 text-center" style={{ animationDelay: "0.1s" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink/40">
            <ReceiptText size={22} strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-display text-[15px] font-semibold">
            {q ? `No order #${q} found` : "No orders in this period"}
          </p>
          <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink/50">
            {q ? "Check the number and try again." : "Ring up the first sale from the register and it will appear here."}
          </p>
          <Link
            href="/pos"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-deep)] active:scale-[0.98]"
          >
            Open register
          </Link>
        </div>
      ) : (
        <div className="anim-rise overflow-hidden rounded-2xl border border-line bg-paper" style={{ animationDelay: "0.1s" }}>
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink/40">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-3 py-3.5">Date</th>
                <th className="px-3 py-3.5">Cashier</th>
                <th className="px-3 py-3.5">Items</th>
                <th className="px-3 py-3.5">Payment</th>
                <th className="px-3 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => {
                const orderRate = n(o.exchangeRate) || rate;
                const orderKhr = n(o.totalKhr) || Math.round(n(o.total) * orderRate);
                return (
                  <tr key={o.id} className="transition-colors hover:bg-cream/60">
                    <td className="px-5 py-3 font-display font-semibold">#{o.orderNumber}</td>
                    <td className="px-3 py-3 text-ink/60">
                      {fmtDate(o.createdAt)} · {fmtTime(o.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-ink/60">{o.cashierName?.split(" ")[0] ?? "—"}</td>
                    <td className="px-3 py-3 text-ink/60">{o.itemCount}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-2.5 py-1 text-[11px] font-semibold text-ink/60">
                        {o.paymentMethod === "cash" ? <Banknote size={12} /> : <CreditCard size={12} />}
                        {o.paymentMethod === "cash" ? "Cash" : "Card"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      <div>{money(o.total, currency)}</div>
                      {enableDual && (
                        <div className="text-[11px] font-medium text-ink/45">
                          {orderKhr.toLocaleString()} {secondaryCurrency}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/receipt/${o.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink/[0.05] px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-ink hover:text-white"
                      >
                        <Printer size={12} />
                        View & print
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile list */}
          <div className="divide-y divide-line md:hidden">
            {rows.map((o) => {
              const orderRate = n(o.exchangeRate) || rate;
              const orderKhr = n(o.totalKhr) || Math.round(n(o.total) * orderRate);
              return (
                <Link key={o.id} href={`/receipt/${o.id}`} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                  >
                    {o.paymentMethod === "cash" ? <Banknote size={15} /> : <CreditCard size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">#{o.orderNumber}</p>
                    <p className="truncate text-[11px] text-ink/45">
                      {fmtDate(o.createdAt)} · {fmtTime(o.createdAt)} · {o.itemCount} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold tabular-nums">{money(o.total, currency)}</p>
                    {enableDual && (
                      <p className="text-[11px] font-medium text-ink/45">
                        {orderKhr.toLocaleString()} {secondaryCurrency}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {rows.length >= 200 && (
        <p className="text-center text-[12px] text-ink/40">Showing the 200 most recent orders. Narrow the range to see more.</p>
      )}
    </div>
  );
}

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  ClipboardList,
  Coins,
  CreditCard,
  Package,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Donut, TopItems } from "@/components/charts";
import { CategoryIcon } from "@/components/category-icon";
import { getAccent } from "@/lib/accents";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtTime, money } from "@/lib/format";
import { getDashboardData } from "@/lib/queries";
import { getOrCreateSettings } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings();
  const accent = getAccent(settings.accent);
  const currency = settings.currency;
  const secondaryCurrency = settings.secondaryCurrency || "KHR";
  const enableDual = settings.enableDualCurrency ?? true;
  const rate = Number(settings.exchangeRate) || 4000;
  const data = await getDashboardData();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      label: "Revenue today",
      value: money(data.revenueToday, currency),
      secondary: enableDual ? `${Math.round(data.revenueToday * rate).toLocaleString()} ${secondaryCurrency}` : undefined,
      sub: `${data.ordersToday} orders so far`,
      icon: Coins,
    },
    {
      label: "Items sold today",
      value: String(data.itemsSoldToday),
      secondary: undefined,
      sub: `avg ticket ${money(data.avgOrderToday, currency)}`,
      icon: ShoppingBag,
    },
    {
      label: "Revenue · 14 days",
      value: money(data.revenueRange, currency),
      secondary: enableDual ? `${Math.round(data.revenueRange * rate).toLocaleString()} ${secondaryCurrency}` : undefined,
      sub: `${data.cashCount + data.cardCount} orders this period`,
      icon: ClipboardList,
    },
    {
      label: "Inventory value",
      value: money(data.stockValue, currency),
      secondary: enableDual ? `${Math.round(data.stockValue * rate).toLocaleString()} ${secondaryCurrency}` : undefined,
      sub: `${data.lowStockCount} item${data.lowStockCount === 1 ? "" : "s"} low on stock`,
      icon: Package,
      warn: data.lowStockCount > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink/45">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            {greeting}, {user.name.split(" ")[0]}.
          </h1>
        </div>
        <Link
          href="/pos"
          className="group inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-lg active:scale-[0.98]"
        >
          Open register
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* Stats */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-line bg-paper p-4 transition-shadow hover:shadow-md sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  s.warn ? "bg-amber-100 text-amber-700" : ""
                }`}
                style={s.warn ? undefined : { background: "var(--accent-soft)", color: "var(--accent-deep)" }}
              >
                <s.icon size={17} strokeWidth={2} />
              </div>
              <ArrowUpRight
                size={15}
                className="text-ink/20 transition-all group-hover:translate-x-0.5 group-hover:text-ink/50"
              />
            </div>
            <p className="mt-3 font-display text-[22px] font-semibold tracking-tight sm:text-2xl">
              {s.value}
            </p>
            {s.secondary && (
              <p className="text-[11px] font-bold text-emerald-700">
                {s.secondary}
              </p>
            )}
            <p className="mt-0.5 text-[12px] font-medium text-ink/45">
              {s.label} <span className="text-ink/30">· {s.sub}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Chart + top items */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="anim-rise rounded-2xl border border-line bg-paper p-5 lg:col-span-3" style={{ animationDelay: "0.1s" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-semibold">Sales, last 14 days</h2>
              <p className="text-[12px] text-ink/45">Daily revenue across the register</p>
            </div>
            <div className="flex items-center gap-4">
              <Donut
                size={52}
                slices={[
                  { label: "Cash", value: data.cashCount || 0.0001, color: "var(--accent)" },
                  { label: "Card", value: data.cardCount || 0.0001, color: "#1c1814" },
                ]}
              />
              <div className="space-y-1 text-[12px] font-medium text-ink/60">
                <p className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                  Cash · {data.cashCount}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  Card · {data.cardCount}
                </p>
              </div>
            </div>
          </div>
          <AreaChart
            data={data.series.map((s) => ({ label: s.label, date: s.date, value: Math.round(s.revenue * 100) / 100 }))}
            accent={accent.color}
            currency={currency}
          />
        </div>

        <div className="anim-rise rounded-2xl border border-line bg-paper p-5 lg:col-span-2" style={{ animationDelay: "0.16s" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-semibold">Top sellers</h2>
              <p className="text-[12px] text-ink/45">By units, last 14 days</p>
            </div>
            <Link href="/orders" className="text-[12px] font-semibold text-ink/50 transition-colors hover:text-ink">
              All orders →
            </Link>
          </div>
          <TopItems items={data.topItems} accent={accent.color} currency={currency} />
        </div>
      </section>

      {/* Recent orders + low stock */}
      <section className="grid gap-4 pb-8 lg:grid-cols-5">
        <div className="anim-rise overflow-hidden rounded-2xl border border-line bg-paper lg:col-span-3" style={{ animationDelay: "0.22s" }}>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-display text-[17px] font-semibold">Recent orders</h2>
            <Link href="/orders" className="text-[12px] font-semibold text-ink/50 transition-colors hover:text-ink">
              View all →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {data.recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/receipt/${o.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cream/60"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
                >
                  {o.paymentMethod === "cash" ? <Banknote size={16} /> : <CreditCard size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">#{o.orderNumber}</p>
                  <p className="truncate text-[12px] text-ink/45">
                    {fmtDate(o.createdAt)} · {fmtTime(o.createdAt)} · {o.itemCount} items
                    {o.cashierName ? ` · ${o.cashierName.split(" ")[0]}` : ""}
                  </p>
                </div>
                <p className="font-display text-sm font-semibold tabular-nums">{money(o.total, currency)}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="anim-rise rounded-2xl border border-line bg-paper p-5 lg:col-span-2" style={{ animationDelay: "0.28s" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-semibold">Stock alerts</h2>
              <p className="text-[12px] text-ink/45">Items at or below reorder level</p>
            </div>
            <Link
              href="/inventory?filter=low"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-200"
            >
              <AlertTriangle size={12} />
              Restock
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold">All stocked up</p>
              <p className="mt-1 text-[12px] text-ink/45">Nothing is below its reorder level.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.lowStock.map((i) => (
                <Link
                  key={i.id}
                  href={`/inventory?edit=${i.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition-all hover:border-ink/20 hover:shadow-sm"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: i.color }}
                  >
                    <CategoryIcon name="utensils" size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.name}</p>
                    <p className="text-[11px] text-ink/45">reorder at {i.lowStockAt}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      i.stock <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {i.stock} left
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

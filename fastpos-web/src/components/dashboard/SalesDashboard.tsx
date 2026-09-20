import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp, ShoppingBag, CreditCard, QrCode, Banknote, Download, Award, Percent, RotateCcw, Split, BarChart3 } from "lucide-react";
import { db } from "@/db";
import type { StoreSettings } from "@/types";
import { money, khr, round2, downloadCsv } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Page, PageHeader, StatCard, Card, CardHeader, CardBody, Button, Segmented, EmptyState } from "@/components/ui";

interface SalesDashboardProps {
  settings: StoreSettings;
}

type Timeframe = "today" | "yesterday" | "7d" | "30d" | "all";

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const orders = useLiveQuery(() => db.orders.filter((o) => !o.shopId || o.shopId === activeShopId).toArray(), [activeShopId]) || [];
  const orderItems = useLiveQuery(() => db.orderItems.toArray()) || [];
  const menuItems = useLiveQuery(() => db.menuItems.filter((m) => !m.shopId || m.shopId === activeShopId).toArray(), [activeShopId]) || [];
  const [timeframe, setTimeframe] = useState<Timeframe>("today");

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;
    return orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      if (timeframe === "today") return t >= startOfToday;
      if (timeframe === "yesterday") return t >= startOfYesterday && t < startOfToday;
      if (timeframe === "7d") return t >= sevenDaysAgo;
      if (timeframe === "30d") return t >= thirtyDaysAgo;
      return true;
    });
  }, [orders, timeframe]);

  const completedOrders = useMemo(() => filteredOrders.filter((o) => o.status === "completed"), [filteredOrders]);
  const refundedOrders = useMemo(() => filteredOrders.filter((o) => o.status === "refunded"), [filteredOrders]);
  const completedIdSet = useMemo(() => new Set(completedOrders.map((o) => o.id)), [completedOrders]);
  const soldItems = useMemo(() => orderItems.filter((it) => completedIdSet.has(it.orderId)), [orderItems, completedIdSet]);

  const grossSales = round2(completedOrders.reduce((s, o) => s + o.total, 0));
  const refundsTotal = round2(refundedOrders.reduce((s, o) => s + o.total, 0));
  const netSales = grossSales;
  const orderCount = completedOrders.length;
  const avgOrderValue = orderCount > 0 ? round2(netSales / orderCount) : 0;
  const itemsSold = soldItems.reduce((s, it) => s + it.qty, 0);

  const totalCost = round2(
    soldItems.reduce((sum, it) => {
      const prod = menuItems.find((p) => p.id === it.menuItemId);
      return sum + (prod ? prod.cost : 0) * it.qty;
    }, 0)
  );
  const grossProfit = round2(netSales - totalCost);
  const profitMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;

  const byMethod = (m: string) => round2(completedOrders.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0));
  const methods = [
    { key: "cash", label: "Cash", value: byMethod("cash"), icon: <Banknote className="h-4 w-4" />, color: "bg-emerald-500" },
    { key: "khqr", label: "KHQR", value: byMethod("khqr"), icon: <QrCode className="h-4 w-4" />, color: "bg-rose-500" },
    { key: "card", label: "Card", value: byMethod("card"), icon: <CreditCard className="h-4 w-4" />, color: "bg-blue-500" },
    { key: "split", label: "Split", value: byMethod("split"), icon: <Split className="h-4 w-4" />, color: "bg-violet-500" },
  ].filter((m) => m.value > 0 || m.key !== "split");

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    soldItems.forEach((it) => {
      const prev = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
      map.set(it.name, { name: it.name, qty: prev.qty + it.qty, revenue: round2(prev.revenue + it.lineTotal) });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [soldItems]);
  const topRevenueMax = Math.max(...topProducts.map((p) => p.revenue), 1);

  const hourly = useMemo(() => {
    // Default window 06:00 – 22:00, widened automatically if sales fall outside it (late-night venues)
    const soldHours = completedOrders.map((o) => new Date(o.createdAt).getHours());
    const start = Math.min(6, ...soldHours);
    const end = Math.max(22, ...soldHours);
    const hours = Array.from({ length: end - start + 1 }, (_, i) => i + start);
    const buckets = hours.map((h) => {
      const list = completedOrders.filter((o) => new Date(o.createdAt).getHours() === h);
      return { h, count: list.length, sales: round2(list.reduce((s, o) => s + o.total, 0)) };
    });
    const max = Math.max(...buckets.map((b) => b.sales), 0.01);
    const peak = buckets.reduce((best, b) => (b.sales > best.sales ? b : best), buckets[0]);
    return { buckets, max, peak };
  }, [completedOrders]);

  const exportCsv = () => {
    const headers = ["OrderNumber", "Date", "Table", "PaymentMethod", "Subtotal", "Tax", "TotalUSD", "TotalKHR", "Status"];
    const rows = filteredOrders.map((o) => [o.orderNumber, new Date(o.createdAt).toISOString(), o.tableNumber || "Walk-in", o.paymentMethod, o.subtotal, o.tax, o.total, o.totalKhr, o.status]);
    downloadCsv(`fastpos-sales-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "p" : "a"}`;

  return (
    <Page>
      <PageHeader
        title="Analytics"
        subtitle="Sales, margins and busiest hours for this branch."
        actions={
          <Button variant="secondary" size="md" onClick={exportCsv} leftIcon={<Download className="h-4 w-4" />} disabled={filteredOrders.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Segmented<Timeframe>
        aria-label="Timeframe"
        value={timeframe}
        onChange={setTimeframe}
        fullWidth
        options={[
          { value: "today", label: "Today" },
          { value: "yesterday", label: "Yesterday", shortLabel: "Yest." },
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
          { value: "all", label: "All time", shortLabel: "All" },
        ]}
        className="max-w-2xl"
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Net sales" value={money(netSales, settings.currency)} hint={settings.enableDualCurrency ? khr(Math.round(netSales * settings.exchangeRate)) : undefined} tone="success" icon={<TrendingUp />} />
        <StatCard label="Orders" value={orderCount} hint={`${itemsSold} items sold`} icon={<ShoppingBag />} />
        <StatCard label="Avg. ticket" value={money(avgOrderValue, settings.currency)} icon={<BarChart3 />} tone="info" />
        <StatCard label="Est. gross profit" value={money(grossProfit, settings.currency)} hint={`${profitMargin}% margin · cost ${money(totalCost, settings.currency)}`} icon={<Percent />} tone="brand" />
      </div>

      {refundedOrders.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-bad/30 bg-bad-soft/50 px-4 py-3 text-sm">
          <RotateCcw className="h-4 w-4 shrink-0 text-bad" />
          <span className="text-fg-muted">
            <span className="font-bold text-bad">{refundedOrders.length} refunded</span> in this period · {money(refundsTotal, settings.currency)} returned to customers (not included in net sales).
          </span>
        </div>
      )}

      {orderCount === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No sales in this period" description="Ring up a few orders and this page fills in automatically." className="rounded-3xl border border-line bg-surface py-16" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon={<Banknote />} title="Payment mix" subtitle="Share of net sales by method" />
            <CardBody>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
              {methods.map((m) => (
                <span key={m.key} className={m.color} style={{ width: `${netSales > 0 ? (m.value / netSales) * 100 : 0}%` }} title={`${m.label} ${money(m.value, settings.currency)}`} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {methods.map((m) => (
                <li key={m.key} className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", m.color)}>{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs text-fg-muted">
                      {m.label} · {netSales > 0 ? Math.round((m.value / netSales) * 100) : 0}%
                    </span>
                    <span className="num block truncate text-sm font-bold text-fg">{money(m.value, settings.currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Award />} title="Top sellers" subtitle="By revenue" />
            <CardBody>
            <ol className="flex flex-col gap-2">
              {topProducts.map((p, i) => (
                <li key={p.name} className="relative overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2">
                  <span className="absolute inset-y-0 left-0 bg-brand/15" style={{ width: `${(p.revenue / topRevenueMax) * 100}%` }} aria-hidden />
                  <span className="relative flex items-center gap-3">
                    <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-extrabold text-fg-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{p.name}</span>
                      <span className="num block text-xs text-fg-muted">{p.qty} sold</span>
                    </span>
                    <span className="num text-sm font-bold text-fg">{money(p.revenue, settings.currency)}</span>
                  </span>
                </li>
              ))}
            </ol>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              icon={<BarChart3 />}
              title="Sales by hour"
              subtitle={hourly.peak.sales > 0 ? `Busiest hour: ${fmtHour(hourly.peak.h)} · ${money(hourly.peak.sales, settings.currency)} from ${hourly.peak.count} orders` : "Hourly distribution"}
            />
            <CardBody>
            <div className="flex h-36 items-end gap-1 sm:gap-1.5" role="img" aria-label="Bar chart of sales by hour">
              {hourly.buckets.map((b) => (
                <div key={b.h} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${fmtHour(b.h)}: ${money(b.sales, settings.currency)} · ${b.count} orders`}>
                  <span className={cn("w-full rounded-t-md transition-all", b.sales > 0 ? (b.h === hourly.peak.h ? "bg-brand" : "bg-brand/50 group-hover:bg-brand/80") : "bg-surface-3")} style={{ height: `${Math.max(b.sales > 0 ? 6 : 2, (b.sales / hourly.max) * 100)}%` }} />
                  <span className={cn("num text-[0.625rem] text-fg-subtle", b.h % 2 === 1 && "invisible min-[560px]:visible")}>{fmtHour(b.h)}</span>
                </div>
              ))}
            </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Page>
  );
};

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  Download,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { db } from "@/db";
import type { Order, OrderItem, MenuItem, StoreSettings } from "@/types";
import { money, khr, round2, downloadCsv } from "@/lib/format";

interface SalesDashboardProps {
  settings: StoreSettings;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const orders = useLiveQuery(
    () => db.orders.filter((o) => !o.shopId || o.shopId === activeShopId).toArray(),
    [activeShopId]
  ) || [];
  const orderItems = useLiveQuery(() => db.orderItems.toArray()) || [];
  const menuItems = useLiveQuery(
    () => db.menuItems.filter((m) => !m.shopId || m.shopId === activeShopId).toArray(),
    [activeShopId]
  ) || [];

  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "7d" | "30d" | "all">("today");

  // Filter orders by timeframe
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 3600 * 1000;
    const sevenDaysAgo = startOfToday - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = startOfToday - 30 * 24 * 3600 * 1000;

    return orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      if (timeframe === "today") return t >= startOfToday;
      if (timeframe === "yesterday") return t >= startOfYesterday && t < startOfToday;
      if (timeframe === "7d") return t >= sevenDaysAgo;
      if (timeframe === "30d") return t >= thirtyDaysAgo;
      return true;
    });
  }, [orders, timeframe]);

  // Order IDs in this timeframe
  const orderIdSet = useMemo(() => new Set(filteredOrders.map((o) => o.id)), [filteredOrders]);

  // Filtered order items
  const filteredItems = useMemo(
    () => orderItems.filter((it) => orderIdSet.has(it.orderId)),
    [orderItems, orderIdSet]
  );

  // Financial calculations
  const completedOrders = filteredOrders.filter((o) => o.status === "completed");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");

  const grossSales = round2(completedOrders.reduce((sum, o) => sum + o.total, 0));
  const refundsTotal = round2(refundedOrders.reduce((sum, o) => sum + o.total, 0));
  const netSales = round2(grossSales - refundsTotal);
  const totalOrdersCount = completedOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? round2(netSales / totalOrdersCount) : 0;

  // Cost & Profit
  const totalCost = round2(
    filteredItems.reduce((sum, it) => {
      const prod = menuItems.find((p) => p.id === it.menuItemId);
      const unitCost = prod ? prod.cost : 0;
      return sum + unitCost * it.qty;
    }, 0)
  );
  const estimatedGrossProfit = round2(netSales - totalCost);
  const profitMargin = netSales > 0 ? Math.round((estimatedGrossProfit / netSales) * 100) : 0;

  // Payment Breakdown
  const cashSales = round2(
    completedOrders.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0)
  );
  const cardSales = round2(
    completedOrders.filter((o) => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0)
  );
  const qrSales = round2(
    completedOrders.filter((o) => o.paymentMethod === "khqr").reduce((s, o) => s + o.total, 0)
  );

  // Top Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredItems.forEach((it) => {
      const existing = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
      map.set(it.name, {
        name: it.name,
        qty: existing.qty + it.qty,
        revenue: round2(existing.revenue + it.lineTotal),
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredItems]);

  // Hourly distribution (7:00 to 22:00)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 21pm
    const counts = hours.map((h) => {
      const count = completedOrders.filter((o) => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === h;
      }).length;
      return { hour: `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`, count };
    });
    const maxCount = Math.max(...counts.map((c) => c.count), 1);
    return { counts, maxCount };
  }, [completedOrders]);

  const handleExportSalesReport = () => {
    const headers = [
      "OrderNumber",
      "Date",
      "Table",
      "PaymentMethod",
      "Subtotal",
      "Tax",
      "TotalUSD",
      "TotalKHR",
      "Status",
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.tableNumber || "Takeout",
      o.paymentMethod,
      o.subtotal,
      o.tax,
      o.total,
      o.totalKhr,
      o.status,
    ]);
    downloadCsv(`fastpos-sales-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Sales & Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial performance, product velocity, peak hours, and profit margins
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Filter */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "all", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id as typeof timeframe)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${timeframe === t.id
                    ? "bg-orange-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportSalesReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Net Sales
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">
            {money(netSales, settings.currency)}
          </div>
          {settings.enableDualCurrency && (
            <p className="text-xs font-mono text-amber-400">
              {khr(netSales * settings.exchangeRate)}
            </p>
          )}
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Completed Orders
            </span>
            <span className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {totalOrdersCount}
          </div>
          <p className="text-xs text-slate-500">Avg ticket: {money(avgOrderValue, settings.currency)}</p>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {money(estimatedGrossProfit, settings.currency)}
          </div>
          <p className="text-xs text-blue-400 font-bold">{profitMargin}% margin</p>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Refunds Total
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 rotate-180" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400">
            {money(refundsTotal, settings.currency)}
          </div>
          <p className="text-xs text-slate-500">{refundedOrders.length} orders refunded</p>
        </div>
      </div>

      {/* Middle Grid: Hourly Peak Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Peaks Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-white">Hourly Sales Activity</h3>
              <p className="text-xs text-slate-400">Customer volume distribution across the day</p>
            </div>
            <BarChart3 className="w-5 h-5 text-orange-400" />
          </div>

          <div className="h-44 flex items-end justify-between gap-1.5 pt-4 pb-2 border-b border-slate-800">
            {hourlyData.counts.map((item, idx) => {
              const heightPercent =
                item.count > 0 ? Math.max(12, Math.round((item.count / hourlyData.maxCount) * 100)) : 4;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    {item.count}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${item.count > 0
                        ? "bg-gradient-to-t from-orange-600 to-amber-400 group-hover:brightness-125"
                        : "bg-slate-800/40"
                      }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500 truncate">{item.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Share */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-white">Payment Methods</h3>
            <p className="text-xs text-slate-400">Tender breakdown for this period</p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-200">Cash USD & KHR</span>
                  <p className="text-[10px] text-slate-500">Physical drawer cash</p>
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {money(cashSales, settings.currency)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-200">KHQR / Bakong</span>
                  <p className="text-[10px] text-slate-500">Bank QR transfers</p>
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {money(qrSales, settings.currency)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-200">Card Terminal</span>
                  <p className="text-[10px] text-slate-500">Visa / Mastercard / UnionPay</p>
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {money(cardSales, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Best-Selling Products */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">Top 5 Best-Selling Items</h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by volume sold</span>
        </div>

        <div className="space-y-2">
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No product sales recorded in this timeframe
            </p>
          ) : (
            topProducts.map((prod, idx) => (
              <div
                key={prod.name}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-xs text-slate-200">{prod.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400 font-semibold">{prod.qty} units sold</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {money(prod.revenue, settings.currency)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

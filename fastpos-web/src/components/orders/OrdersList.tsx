import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { db } from "@/db";
import type { Order, StoreSettings } from "@/types";
import { OrderDetailModal } from "./OrderDetailModal";
import { money, khr, formatDateTime, formatTime, round2 } from "@/lib/format";

interface OrdersListProps {
  settings: StoreSettings;
}

export const OrdersList: React.FC<OrdersListProps> = ({ settings }) => {
  const orders = useLiveQuery(() => db.orders.orderBy("createdAt").reverse().toArray()) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "refunded">("all");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("today");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 3600 * 1000;

    return orders.filter((o) => {
      // Status
      if (statusFilter !== "all" && o.status !== statusFilter) return false;

      // Date
      const orderTime = new Date(o.createdAt).getTime();
      if (dateFilter === "today" && orderTime < startOfToday) return false;
      if (dateFilter === "week" && orderTime < sevenDaysAgo) return false;

      // Search
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchNum = o.orderNumber.toString().includes(q);
        const matchTable = (o.tableNumber || "").toLowerCase().includes(q);
        const matchCashier = (o.cashierName || "").toLowerCase().includes(q);
        if (!matchNum && !matchTable && !matchCashier) return false;
      }

      return true;
    });
  }, [orders, statusFilter, dateFilter, searchQuery]);

  // Key metrics
  const completedOrders = filteredOrders.filter((o) => o.status === "completed");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const totalGross = round2(completedOrders.reduce((s, o) => s + o.total, 0));
  const totalRefunds = round2(refundedOrders.reduce((s, o) => s + o.total, 0));
  const netRevenue = round2(totalGross - totalRefunds);

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Orders History</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit, inspect tickets, issue refunds, and print thermal receipts
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-semibold">Total Orders</span>
            <span className="text-lg font-extrabold text-white font-mono">{filteredOrders.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-semibold">Refunded</span>
            <span className="text-lg font-extrabold text-rose-400 font-mono">{refundedOrders.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-semibold">Net Revenue</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              {money(netRevenue, settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, table, cashier..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Status Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {(["all", "completed", "refunded"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition ${
                  statusFilter === st
                    ? "bg-orange-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Date Range Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {(["today", "week", "all"] as const).map((dt) => (
              <button
                key={dt}
                onClick={() => setDateFilter(dt)}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
                  dateFilter === dt
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {dt === "week" ? "7 Days" : dt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders View */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-700" />
            <h4 className="font-bold text-slate-300">No orders match filter</h4>
            <p className="text-xs text-slate-500 mt-1">
              Try modifying your search or changing the date/status filter above.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< sm screens) */}
            <div className="block sm:hidden divide-y divide-slate-850">
              {filteredOrders.map((ord) => {
                const isRef = ord.status === "refunded";
                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="p-3.5 hover:bg-slate-850/60 active:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-400 text-xs">
                          #{ord.orderNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {ord.tableNumber || "Takeout"}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isRef
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{formatTime(ord.createdAt)}</span>
                        <span>•</span>
                        <span>{ord.itemCount} items</span>
                        <span>•</span>
                        <span className="uppercase">{ord.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-white">
                        {money(ord.total, settings.currency)}
                      </div>
                      <span className="text-[10px] text-slate-500">Tap to view</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Table (sm+ screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Table / Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredOrders.map((ord) => {
                    const isRef = ord.status === "refunded";
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className="hover:bg-slate-850/60 transition cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-orange-400">
                          #{ord.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {formatDateTime(ord.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {ord.tableNumber || "Takeout"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {ord.itemCount} items
                        </td>
                        <td className="py-3.5 px-4 uppercase font-bold text-slate-400 text-[10px]">
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              isRef
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                          {money(ord.total, settings.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(ord);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          settings={settings}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Receipt, ChevronRight, RotateCcw, ReceiptText, Banknote } from "lucide-react";
import { db } from "@/db";
import type { Order, StoreSettings } from "@/types";
import { OrderDetailModal } from "./OrderDetailModal";
import { money, formatTime, round2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Page, PageHeader, StatCard, Input, Segmented, EmptyState, Badge } from "@/components/ui";

interface OrdersListProps {
  settings: StoreSettings;
}

type StatusFilter = "all" | "completed" | "refunded";
type DateFilter = "today" | "week" | "all";

const METHOD_LABEL: Record<string, string> = { cash: "Cash", card: "Card", khqr: "KHQR", split: "Split" };

export const OrdersList: React.FC<OrdersListProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const orders = useLiveQuery(() => db.orders.filter((o) => !o.shopId || o.shopId === activeShopId).reverse().sortBy("createdAt"), [activeShopId]) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 3600 * 1000;
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const t = new Date(o.createdAt).getTime();
      if (dateFilter === "today" && t < startOfToday) return false;
      if (dateFilter === "week" && t < sevenDaysAgo) return false;
      if (q) {
        return o.orderNumber.toString().includes(q) || (o.tableNumber || "").toLowerCase().includes(q) || (o.cashierName || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, dateFilter, searchQuery]);

  const completedOrders = filteredOrders.filter((o) => o.status === "completed");
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded");
  const totalGross = round2(completedOrders.reduce((s, o) => s + o.total, 0));
  const totalRefunds = round2(refundedOrders.reduce((s, o) => s + o.total, 0));

  // Group by day for the list (helps when "7 days" / "all" is selected)
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of filteredOrders) {
      const key = new Date(o.createdAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries());
  }, [filteredOrders]);

  const dayLabel = (key: string) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (key === today) return "Today";
    if (key === yesterday) return "Yesterday";
    return new Date(key).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };

  // Keep the selected order in sync with live data (e.g. after a refund)
  const liveSelected = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder : null;

  return (
    <Page>
      <PageHeader title="Orders" subtitle="Look up tickets, reprint receipts and issue refunds." />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Orders" value={filteredOrders.length} icon={<ReceiptText />} />
        <StatCard label="Sales" value={money(totalGross, settings.currency)} tone="success" icon={<Banknote />} />
        <StatCard label="Refunded" value={refundedOrders.length ? money(totalRefunds, settings.currency) : "—"} hint={refundedOrders.length ? `${refundedOrders.length} orders` : undefined} tone={refundedOrders.length ? "danger" : "neutral"} icon={<RotateCcw />} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, table or cashier"
            leftIcon={<Search />}
            aria-label="Search orders"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 max-[400px]:grid-cols-1 sm:flex sm:shrink-0">
          <Segmented<DateFilter>
            size="md"
            aria-label="Date range"
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: "today", label: "Today", tone: "neutral" },
              { value: "week", label: "7 days", shortLabel: "7d", tone: "neutral" },
              { value: "all", label: "All", tone: "neutral" },
            ]}
            className="min-w-0"
            fullWidth="mobile"
          />
          <Segmented<StatusFilter>
            size="md"
            aria-label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Any" },
              { value: "completed", label: "Paid", tone: "success" },
              { value: "refunded", label: "Refunded", shortLabel: "Refund", tone: "danger" },
            ]}
            className="min-w-0"
            fullWidth="mobile"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title="No orders match"
          description={orders.length === 0 ? "Completed sales will show up here." : "Try a different date range, status or search."}
          className="rounded-3xl border border-line bg-surface py-16"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([day, list]) => (
            <section key={day} aria-label={dayLabel(day)}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">{dayLabel(day)}</h3>
                <span className="num text-xs text-fg-subtle">
                  {list.length} · {money(round2(list.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0)), settings.currency)}
                </span>
              </div>
              <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
                {list.map((ord) => {
                  const isRef = ord.status === "refunded";
                  return (
                    <li key={ord.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="press flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-2 sm:px-4"
                      >
                        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold num", isRef ? "bg-bad-soft text-bad" : "bg-brand-soft text-brand-text")}>
                          #{ord.orderNumber.toString().slice(-4)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-sm font-bold text-fg">{ord.tableNumber || "Walk-in"}</span>
                            {isRef && <Badge tone="danger">Refunded</Badge>}
                          </span>
                          <span className="block truncate text-xs text-fg-muted">
                            <span className="num">{formatTime(ord.createdAt)}</span> · {ord.itemCount} {ord.itemCount === 1 ? "item" : "items"} · {METHOD_LABEL[ord.paymentMethod] ?? ord.paymentMethod}
                            <span className="hidden sm:inline"> · {ord.cashierName}</span>
                          </span>
                        </span>
                        <span className={cn("num shrink-0 text-right text-base font-extrabold", isRef ? "text-fg-subtle line-through" : "text-fg")}>{money(ord.total, settings.currency)}</span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-fg-subtle" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="px-1 text-center text-xs text-fg-subtle">
            Showing {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
          </p>
        </div>
      )}

      <OrderDetailModal order={liveSelected} onClose={() => setSelectedOrder(null)} settings={settings} />
    </Page>
  );
};

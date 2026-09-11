import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  menuItems,
  orderItems,
  orders,
  stockMovements,
} from "@/db/schema";
import { dayLabel, n, startOfDay } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export async function getCatalog() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  const items = await db.select().from(menuItems).orderBy(asc(menuItems.name));
  return { cats, items };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export async function getDashboardData() {
  const today = startOfDay();
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - 13);

  const rangeOrders = await db
    .select({
      id: orders.id,
      total: orders.total,
      itemCount: orders.itemCount,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(gte(orders.createdAt, rangeStart));

  const todays = rangeOrders.filter((o) => o.createdAt >= today);
  const revenueToday = todays.reduce((s, o) => s + n(o.total), 0);
  const itemsSoldToday = todays.reduce((s, o) => s + o.itemCount, 0);

  // 14-day series
  const series: { label: string; date: string; revenue: number; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    series.push({
      label: dayLabel(d),
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: 0,
      count: 0,
    });
  }
  for (const o of rangeOrders) {
    const idx = Math.floor(
      (startOfDay(o.createdAt).getTime() - rangeStart.getTime()) / 86400000,
    );
    if (idx >= 0 && idx < 14) {
      series[idx].revenue += n(o.total);
      series[idx].count += 1;
    }
  }

  // Top items by qty across range
  const rangeIds = rangeOrders.map((o) => o.id);
  const topMap = new Map<string, { qty: number; revenue: number }>();
  if (rangeIds.length > 0) {
    const lines = await db
      .select({ name: orderItems.name, qty: orderItems.qty, lineTotal: orderItems.lineTotal })
      .from(orderItems)
      .where(sql`${orderItems.orderId} in (${sql.join(rangeIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const l of lines) {
      const cur = topMap.get(l.name) ?? { qty: 0, revenue: 0 };
      cur.qty += l.qty;
      cur.revenue += n(l.lineTotal);
      topMap.set(l.name, cur);
    }
  }
  const topItems = [...topMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  // Low stock
  const lowStock = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.trackStock, true), eq(menuItems.isActive, true), sql`${menuItems.stock} <= ${menuItems.lowStockAt}`))
    .orderBy(asc(menuItems.stock))
    .limit(6);

  // Recent orders
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);

  // Inventory value
  const allItems = await db.select({ stock: menuItems.stock, cost: menuItems.cost, trackStock: menuItems.trackStock }).from(menuItems);
  const stockValue = allItems.reduce((s, i) => s + (i.trackStock ? i.stock * n(i.cost) : 0), 0);
  const lowStockCount = allItems.length
    ? (await db.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.trackStock, true), sql`${menuItems.stock} <= ${menuItems.lowStockAt}`))).length
    : 0;

  const cashCount = rangeOrders.filter((o) => o.paymentMethod === "cash").length;
  const cardCount = rangeOrders.length - cashCount;
  const revenueRange = rangeOrders.reduce((s, o) => s + n(o.total), 0);

  return {
    revenueToday,
    ordersToday: todays.length,
    avgOrderToday: todays.length ? revenueToday / todays.length : 0,
    itemsSoldToday,
    series,
    topItems,
    lowStock,
    lowStockCount,
    recentOrders,
    stockValue,
    itemTotal: allItems.length,
    cashCount,
    cardCount,
    revenueRange,
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type OrderRange = "today" | "week" | "all";

export async function getOrdersList(range: OrderRange, q?: string) {
  let from: Date | null = null;
  if (range === "today") from = startOfDay();
  if (range === "week") {
    from = startOfDay();
    from.setDate(from.getDate() - 6);
  }
  const where = from
    ? and(gte(orders.createdAt, from), q && /^\d+$/.test(q.trim()) ? eq(orders.orderNumber, parseInt(q.trim(), 10)) : undefined)
    : q && /^\d+$/.test(q.trim())
      ? eq(orders.orderNumber, parseInt(q.trim(), 10))
      : undefined;

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(200);

  const rangeOrders = from
    ? await db.select({ total: orders.total }).from(orders).where(gte(orders.createdAt, from))
    : rows;

  return {
    rows,
    rangeRevenue: rangeOrders.reduce((s, o) => s + n(o.total), 0),
    rangeCount: rangeOrders.length,
  };
}

export async function getOrderDetail(id: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id));
  return { order, items };
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export async function getStockLog(limitCount = 50) {
  return db
    .select({
      id: stockMovements.id,
      delta: stockMovements.delta,
      reason: stockMovements.reason,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      itemName: menuItems.name,
      itemColor: menuItems.color,
    })
    .from(stockMovements)
    .innerJoin(menuItems, eq(menuItems.id, stockMovements.itemId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limitCount);
}

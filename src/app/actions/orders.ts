"use server";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  menuItems,
  orderItems,
  orders,
  stockMovements,
  type SelectedModifier,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { n, round2 } from "@/lib/format";
import { getOrCreateSettings } from "@/lib/seed";

export type CartLineInput = {
  menuItemId: number;
  qty: number;
  modifiers: SelectedModifier[];
  note?: string;
};

export type CheckoutResult =
  | {
      ok: true;
      orderId: number;
      orderNumber: number;
      total: number;
      totalKhr: number;
      change: number | null;
      changeKhr: number | null;
    }
  | { ok: false; error: string };

export async function createOrderAction(input: {
  lines: CartLineInput[];
  paymentMethod: "cash" | "card";
  cashReceived?: number;
  cashReceivedKhr?: number;
}): Promise<CheckoutResult> {
  const user = await requireUser();

  const lines = (input.lines ?? [])
    .map((l) => ({
      menuItemId: Number(l.menuItemId),
      qty: Math.max(1, Math.min(99, Math.floor(Number(l.qty) || 0))),
      modifiers: Array.isArray(l.modifiers) ? l.modifiers.slice(0, 12) : [],
      note: typeof l.note === "string" ? l.note.slice(0, 140) : undefined,
    }))
    .filter((l) => Number.isFinite(l.menuItemId));

  if (lines.length === 0) return { ok: false, error: "The ticket is empty." };
  if (lines.length > 60) return { ok: false, error: "Too many lines on one ticket." };
  const paymentMethod = input.paymentMethod === "card" ? "card" : "cash";

  const settings = await getOrCreateSettings();
  const taxRate = n(settings.taxRate);

  try {
    const result = await db.transaction(async (tx) => {
      const ids = [...new Set(lines.map((l) => l.menuItemId))];
      const dbItems = await tx
        .select()
        .from(menuItems)
        .where(inArray(menuItems.id, ids));

      const byId = new Map(dbItems.map((i) => [i.id, i]));
      for (const line of lines) {
        const item = byId.get(line.menuItemId);
        if (!item || !item.isActive) {
          throw new Error(`An item on this ticket is no longer available.`);
        }
        if (item.trackStock && item.stock < line.qty) {
          throw new Error(`Not enough stock for “${item.name}” (${item.stock} left).`);
        }
      }

      // Build priced lines server-side (never trust client prices)
      const priced = lines.map((line) => {
        const item = byId.get(line.menuItemId)!;
        let unit = n(item.price);
        const valid: SelectedModifier[] = [];
        for (const group of item.modifiers) {
          const chosen = line.modifiers.filter((m) => m.group === group.name);
          if (chosen.length === 0 && group.required && group.options.length > 0) {
            const opt = group.options[0];
            valid.push({ group: group.name, option: opt.name, price: opt.price });
            unit += opt.price;
          }
          for (const c of chosen) {
            const opt = group.options.find((o) => o.name === c.option);
            if (opt) {
              valid.push({ group: group.name, option: opt.name, price: opt.price });
              unit += opt.price;
            }
          }
        }
        const lineTotal = round2(unit * line.qty);
        return { line, item, unit, valid, lineTotal };
      });

      const subtotal = round2(priced.reduce((s, p) => s + p.lineTotal, 0));
      const tax = round2((subtotal * taxRate) / 100);
      const total = round2(subtotal + tax);

      const exchangeRate = n(settings.exchangeRate) || 4000;
      const totalKhr = Math.round(total * exchangeRate);

      let cashReceived: number | null = null;
      let cashReceivedKhr: number | null = null;
      let change: number | null = null;
      let changeKhr: number | null = null;

      if (paymentMethod === "cash") {
        const usdReceived = round2(Number(input.cashReceived ?? 0));
        const khrReceived = Math.round(Number(input.cashReceivedKhr ?? 0));
        const effectiveTenderedUsd = round2(usdReceived + khrReceived / exchangeRate);

        if (!Number.isFinite(effectiveTenderedUsd) || effectiveTenderedUsd < total) {
          throw new Error("Cash received is less than the total due.");
        }
        cashReceived = usdReceived > 0 ? usdReceived : null;
        cashReceivedKhr = khrReceived > 0 ? khrReceived : null;
        change = round2(effectiveTenderedUsd - total);
        changeKhr = Math.round(change * exchangeRate);
      }

      const [{ nextNumber }] = await tx
        .select({
          nextNumber: sql<number>`coalesce(max(${orders.orderNumber}), 1000) + 1`,
        })
        .from(orders);

      const itemCount = priced.reduce((s, p) => s + p.line.qty, 0);

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: nextNumber,
          status: "completed",
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          exchangeRate: exchangeRate.toFixed(2),
          totalKhr: totalKhr.toFixed(0),
          paymentMethod,
          cashReceived: cashReceived?.toFixed(2) ?? null,
          cashReceivedKhr: cashReceivedKhr?.toFixed(0) ?? null,
          changeDue: change?.toFixed(2) ?? null,
          changeDueKhr: changeKhr?.toFixed(0) ?? null,
          itemCount,
          userId: user.id,
          cashierName: user.name,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        priced.map((p) => ({
          orderId: order.id,
          menuItemId: p.item.id,
          name: p.item.name,
          unitPrice: p.unit.toFixed(2),
          qty: p.line.qty,
          modifiers: p.valid,
          note: p.line.note ?? null,
          lineTotal: p.lineTotal.toFixed(2),
        })),
      );

      for (const p of priced) {
        if (!p.item.trackStock) continue;
        await tx
          .update(menuItems)
          .set({ stock: sql`${menuItems.stock} - ${p.line.qty}` })
          .where(eq(menuItems.id, p.item.id));
        await tx.insert(stockMovements).values({
          itemId: p.item.id,
          delta: -p.line.qty,
          reason: "sale",
          note: `Order #${nextNumber}`,
        });
      }

      return { orderId: order.id, nextNumber, total, totalKhr, change, changeKhr };
    });

    revalidatePath("/");
    return {
      ok: true,
      orderId: result.orderId,
      orderNumber: result.nextNumber,
      total: result.total,
      totalKhr: result.totalKhr,
      change: result.change,
      changeKhr: result.changeKhr,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return { ok: false, error: message };
  }
}

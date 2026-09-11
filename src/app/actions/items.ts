"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  categories,
  menuItems,
  stockMovements,
  type ModifierGroup,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type ActionResult = { ok: boolean; error?: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

export type ItemInput = {
  id?: number;
  name: string;
  categoryId: number | null;
  price: number;
  cost: number;
  stock: number;
  lowStockAt: number;
  trackStock: boolean;
  color: string;
  sku: string;
  isActive: boolean;
  modifiers: ModifierGroup[];
};

function cleanModifiers(input: unknown): ModifierGroup[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((g): ModifierGroup | null => {
      const name = String((g as ModifierGroup)?.name ?? "").trim().slice(0, 40);
      const options = Array.isArray((g as ModifierGroup)?.options)
        ? (g as ModifierGroup).options
            .map((o) => ({
              name: String(o?.name ?? "").trim().slice(0, 40),
              price: Math.max(0, Math.round((Number(o?.price) || 0) * 100) / 100),
            }))
            .filter((o) => o.name.length > 0)
            .slice(0, 10)
        : [];
      if (!name || options.length === 0) return null;
      return { name, required: Boolean((g as ModifierGroup)?.required), options };
    })
    .filter((g): g is ModifierGroup => g !== null)
    .slice(0, 8);
}

export async function saveItemAction(input: ItemInput): Promise<ActionResult> {
  await requireUser();
  const name = String(input.name ?? "").trim();
  if (name.length < 2) return fail("Item name is required.");
  const price = Math.round((Number(input.price) || 0) * 100) / 100;
  if (price <= 0) return fail("Price must be greater than zero.");
  const cost = Math.max(0, Math.round((Number(input.cost) || 0) * 100) / 100);
  const stock = Math.max(0, Math.floor(Number(input.stock) || 0));
  const lowStockAt = Math.max(0, Math.floor(Number(input.lowStockAt) || 0));

  const values = {
    name: name.slice(0, 80),
    categoryId: input.categoryId ?? null,
    price: price.toFixed(2),
    cost: cost.toFixed(2),
    stock,
    lowStockAt,
    trackStock: Boolean(input.trackStock),
    color: String(input.color ?? "#E85D26"),
    sku: String(input.sku ?? "").trim().slice(0, 40) || null,
    isActive: Boolean(input.isActive),
    modifiers: cleanModifiers(input.modifiers),
  };

  if (input.id) {
    await db.update(menuItems).set(values).where(eq(menuItems.id, input.id));
  } else {
    await db.insert(menuItems).values(values);
  }
  revalidatePath("/");
  return ok;
}

export async function deleteItemAction(id: number): Promise<ActionResult> {
  await requireUser();
  await db.delete(menuItems).where(eq(menuItems.id, id));
  revalidatePath("/");
  return ok;
}

export async function adjustStockAction(input: {
  itemId: number;
  mode: "set" | "delta";
  value: number;
  reason: "restock" | "adjustment" | "waste";
  note?: string;
}): Promise<ActionResult & { newStock?: number }> {
  await requireUser();
  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, input.itemId)).limit(1);
  if (!item) return fail("Item not found.");

  const value = Math.floor(Number(input.value) || 0);
  const delta = input.mode === "set" ? value - item.stock : value;
  if (delta === 0) return { ok: true, newStock: item.stock };
  const newStock = item.stock + delta;
  if (newStock < 0) return fail("Stock cannot go below zero.");

  await db.update(menuItems).set({ stock: newStock }).where(eq(menuItems.id, item.id));
  await db.insert(stockMovements).values({
    itemId: item.id,
    delta,
    reason: input.reason,
    note: (input.note ?? "").slice(0, 140) || null,
  });
  revalidatePath("/");
  return { ok: true, newStock };
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export type CategoryInput = {
  id?: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult> {
  await requireUser();
  const name = String(input.name ?? "").trim();
  if (name.length < 2) return fail("Category name is required.");
  const values = {
    name: name.slice(0, 60),
    color: String(input.color ?? "#E85D26"),
    icon: String(input.icon ?? "utensils"),
    sortOrder: Math.floor(Number(input.sortOrder) || 0),
    isActive: Boolean(input.isActive),
  };
  if (input.id) {
    await db.update(categories).set(values).where(eq(categories.id, input.id));
  } else {
    await db.insert(categories).values(values);
  }
  revalidatePath("/");
  return ok;
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requireUser();
  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(menuItems)
    .where(eq(menuItems.categoryId, id));
  if (used > 0) {
    return fail(`This category still has ${used} item${used === 1 ? "" : "s"}. Reassign them first.`);
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/");
  return ok;
}

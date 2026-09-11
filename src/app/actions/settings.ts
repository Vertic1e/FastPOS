"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/app/actions/items";

export type SettingsInput = {
  storeName: string;
  address: string;
  phone: string;
  taxRate: number;
  currency: string;
  secondaryCurrency: string;
  exchangeRate: number;
  enableDualCurrency: boolean;
  fontSize: string;
  receiptHeader: string;
  receiptFooter: string;
  accent: string;
  posColumns: number;
  categoryChips: boolean;
};

export async function saveSettingsAction(input: SettingsInput): Promise<ActionResult> {
  await requireUser();
  const storeName = String(input.storeName ?? "").trim();
  if (storeName.length < 2) return { ok: false, error: "Store name is required." };
  const taxRate = Number(input.taxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) {
    return { ok: false, error: "Tax rate must be between 0 and 30%." };
  }
  const posColumns = [2, 3, 4, 5].includes(Number(input.posColumns))
    ? Number(input.posColumns)
    : 3;
  const exchangeRate = Math.max(1, Number(input.exchangeRate) || 4000);
  const secondaryCurrency = String(input.secondaryCurrency ?? "KHR").trim().slice(0, 6) || "KHR";
  const fontSize = ["normal", "large", "xl"].includes(input.fontSize) ? input.fontSize : "normal";

  await db
    .insert(settings)
    .values({
      id: 1,
      storeName: storeName.slice(0, 60),
      address: String(input.address ?? "").slice(0, 120),
      phone: String(input.phone ?? "").slice(0, 40),
      taxRate: taxRate.toFixed(2),
      currency: String(input.currency ?? "$").slice(0, 3) || "$",
      secondaryCurrency,
      exchangeRate: exchangeRate.toFixed(2),
      enableDualCurrency: Boolean(input.enableDualCurrency),
      fontSize,
      receiptHeader: String(input.receiptHeader ?? "").slice(0, 120),
      receiptFooter: String(input.receiptFooter ?? "").slice(0, 120),
      accent: String(input.accent ?? "flame"),
      posColumns,
      categoryChips: Boolean(input.categoryChips),
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        storeName: storeName.slice(0, 60),
        address: String(input.address ?? "").slice(0, 120),
        phone: String(input.phone ?? "").slice(0, 40),
        taxRate: taxRate.toFixed(2),
        currency: String(input.currency ?? "$").slice(0, 3) || "$",
        secondaryCurrency,
        exchangeRate: exchangeRate.toFixed(2),
        enableDualCurrency: Boolean(input.enableDualCurrency),
        fontSize,
        receiptHeader: String(input.receiptHeader ?? "").slice(0, 120),
        receiptFooter: String(input.receiptFooter ?? "").slice(0, 120),
        accent: String(input.accent ?? "flame"),
        posColumns,
        categoryChips: Boolean(input.categoryChips),
      },
    });

  revalidatePath("/");
  return { ok: true };
}

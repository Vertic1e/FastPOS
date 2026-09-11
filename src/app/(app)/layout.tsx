import type { CSSProperties, ReactNode } from "react";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccent } from "@/lib/accents";
import { n } from "@/lib/format";
import { ensureSeeded, getOrCreateSettings } from "@/lib/seed";
import { FontProvider, type FontSize } from "@/components/font-provider";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const user = await requireUser();
  const settings = await getOrCreateSettings();
  const accent = getAccent(settings.accent);

  const [{ low }] = await db
    .select({ low: sql<number>`count(*)::int` })
    .from(menuItems)
    .where(
      and(
        eq(menuItems.trackStock, true),
        eq(menuItems.isActive, true),
        sql`${menuItems.stock} <= ${menuItems.lowStockAt}`,
      ),
    );

  return (
    <FontProvider initialSize={(settings.fontSize as FontSize) || "normal"}>
      <div
        style={
          {
            "--accent": accent.color,
            "--accent-deep": accent.deep,
            "--accent-soft": accent.soft,
          } as CSSProperties
        }
      >
        <Sidebar
          user={{ name: user.name, email: user.email }}
          storeName={settings.storeName}
          lowStockCount={low}
          currency={settings.currency}
          secondaryCurrency={settings.secondaryCurrency || "KHR"}
          exchangeRate={n(settings.exchangeRate) || 4000}
          enableDualCurrency={settings.enableDualCurrency ?? true}
        />
        <main className="min-h-dvh pb-24 pt-14 lg:pb-0 lg:pl-[248px] lg:pt-0">
          {children}
        </main>
      </div>
    </FontProvider>
  );
}

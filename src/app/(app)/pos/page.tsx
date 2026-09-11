import { PosClient } from "@/components/pos/pos-client";
import { requireUser } from "@/lib/auth";
import { n } from "@/lib/format";
import { getCatalog } from "@/lib/queries";
import { getOrCreateSettings } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Point of Sale" };

export default async function PosPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings();
  const { cats, items } = await getCatalog();

  return (
    <PosClient
      cashierName={user.name}
      categories={cats
        .filter((c) => c.isActive)
        .map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
      items={items
        .filter((i) => i.isActive)
        .map((i) => ({
          id: i.id,
          name: i.name,
          price: n(i.price),
          stock: i.stock,
          trackStock: i.trackStock,
          lowStockAt: i.lowStockAt,
          color: i.color,
          categoryId: i.categoryId,
          modifiers: i.modifiers,
          sku: i.sku,
        }))}
      taxRate={n(settings.taxRate)}
      currency={settings.currency}
      secondaryCurrency={settings.secondaryCurrency || "KHR"}
      exchangeRate={n(settings.exchangeRate) || 4000}
      enableDualCurrency={settings.enableDualCurrency ?? true}
      posColumns={settings.posColumns}
      categoryChips={settings.categoryChips}
      storeName={settings.storeName}
    />
  );
}

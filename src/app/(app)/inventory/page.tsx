import { InventoryClient, type InvCategory, type InvItem, type LogRow } from "@/components/inventory/inventory-client";
import { requireUser } from "@/lib/auth";
import { n } from "@/lib/format";
import { getCatalog, getStockLog } from "@/lib/queries";
import { getOrCreateSettings } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const settings = await getOrCreateSettings();
  const sp = await searchParams;
  const { cats, items } = await getCatalog();
  const log = await getStockLog(80);

  const invItems: InvItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: n(i.price),
    cost: n(i.cost),
    stock: i.stock,
    lowStockAt: i.lowStockAt,
    trackStock: i.trackStock,
    color: i.color,
    categoryId: i.categoryId,
    modifiers: i.modifiers,
    sku: i.sku,
    isActive: i.isActive,
  }));

  const invCats: InvCategory[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    itemCount: items.filter((i) => i.categoryId === c.id).length,
  }));

  const logRows: LogRow[] = log.map((l) => ({
    id: l.id,
    delta: l.delta,
    reason: l.reason,
    note: l.note,
    createdAt: l.createdAt.toISOString(),
    itemName: l.itemName,
    itemColor: l.itemColor,
  }));

  return (
    <InventoryClient
      items={invItems}
      categories={invCats}
      log={logRows}
      currency={settings.currency}
      initialTab={sp.tab === "categories" || sp.tab === "log" ? sp.tab : "items"}
      initialFilter={sp.filter === "low" || sp.filter === "out" ? sp.filter : "all"}
      editId={sp.edit ? parseInt(sp.edit, 10) : null}
    />
  );
}

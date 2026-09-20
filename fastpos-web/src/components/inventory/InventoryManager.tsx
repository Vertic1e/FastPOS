import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Package, Plus, Search, AlertTriangle, Layers, Pencil, Trash2, Download, Minus, Star, EyeOff } from "lucide-react";
import { db } from "@/db";
import type { MenuItem, StoreSettings } from "@/types";
import { ItemEditModal } from "./ItemEditModal";
import { CategoryEditModal } from "./CategoryEditModal";
import { money, downloadCsv } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Page, PageHeader, Button, Input, EmptyState, Badge, useConfirm, useToast } from "@/components/ui";

interface InventoryManagerProps {
  settings: StoreSettings;
}

type StockFilter = "all" | "low";

export const InventoryManager: React.FC<InventoryManagerProps> = ({ settings }) => {
  const activeShopId = settings.activeShopId || 1;
  const confirm = useConfirm();
  const toast = useToast();
  const items = useLiveQuery(() => db.menuItems.filter((i) => !i.shopId || i.shopId === activeShopId).toArray(), [activeShopId]) || [];
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.shopId || c.shopId === activeShopId).sortBy("sortOrder"), [activeShopId]) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);

  const lowStockItems = useMemo(() => items.filter((i) => i.trackStock && i.stock <= i.lowStockAt), [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((i) => {
        if (stockFilter === "low" && !(i.trackStock && i.stock <= i.lowStockAt)) return false;
        const matchCat = selectedCatId === null || i.categoryId === selectedCatId;
        const matchSearch = q === "" || i.name.toLowerCase().includes(q) || (i.sku ? i.sku.toLowerCase().includes(q) : false);
        return matchCat && matchSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, selectedCatId, searchQuery, stockFilter]);

  const adjustStock = async (item: MenuItem, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    if (newStock === item.stock) return;
    await db.menuItems.update(item.id!, { stock: newStock });
    await db.stockMovements.add({ itemId: item.id!, delta: newStock - item.stock, reason: delta > 0 ? "restock" : "adjustment", note: "Manual quick adjustment", createdAt: new Date() });
  };

  const toggleFavorite = async (item: MenuItem) => {
    await db.menuItems.update(item.id!, { isFavorite: !item.isFavorite });
  };

  const deleteItem = async (item: MenuItem) => {
    const ok = await confirm({
      title: `Delete “${item.name}”?`,
      message: "Past orders keep their line items, but the product is removed from the catalog.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await db.menuItems.delete(item.id!);
    toast({ title: "Item deleted", description: item.name, tone: "info" });
  };

  const exportCsv = () => {
    const headers = ["SKU", "Name", "Category", "Price", "Cost", "Stock", "LowStockThreshold"];
    const rows = items.map((i) => {
      const cat = categories.find((c) => c.id === i.categoryId);
      return [i.sku || "", i.name, cat ? cat.name : "Uncategorized", i.price, i.cost, i.trackStock ? i.stock : "N/A", i.trackStock ? i.lowStockAt : "N/A"];
    });
    downloadCsv(`fastpos-inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const chip = "press flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold";
  const chipOn = "border-brand bg-brand text-white";
  const chipOff = "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg";

  return (
    <Page>
      <PageHeader
        title="Items & stock"
        subtitle={`${items.length} products · ${categories.length} categories`}
        actions={
          <>
            <Button variant="secondary" size="md" onClick={exportCsv} leftIcon={<Download className="h-4 w-4" />} className="hidden sm:inline-flex">
              CSV
            </Button>
            <Button variant="secondary" size="md" onClick={() => setIsManagingCats(true)} leftIcon={<Layers className="h-4 w-4" />}>
              Categories
            </Button>
            <Button variant="primary" size="md" onClick={() => setIsCreatingItem(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add item
            </Button>
          </>
        }
      />

      {lowStockItems.length > 0 && (
        <button
          type="button"
          onClick={() => setStockFilter((f) => (f === "low" ? "all" : "low"))}
          className={cn(
            "press flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
            stockFilter === "low" ? "border-warn bg-warn-soft" : "border-warn/40 bg-warn-soft/50 hover:border-warn"
          )}
          aria-pressed={stockFilter === "low"}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn/20 text-warn">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-warn">
              {lowStockItems.length} {lowStockItems.length === 1 ? "item needs" : "items need"} restocking
            </span>
            <span className="block truncate text-xs text-fg-muted">{lowStockItems.map((i) => i.name).join(", ")}</span>
          </span>
          <span className="shrink-0 text-xs font-bold text-warn">{stockFilter === "low" ? "Show all" : "Show only these"}</span>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <Input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or SKU" leftIcon={<Search />} aria-label="Search items" className="[&::-webkit-search-cancel-button]:hidden" />
        <div className="scroll-x -mx-3 flex items-center gap-1.5 px-3 sm:-mx-4 sm:px-4" role="tablist" aria-label="Filter by category">
          <button type="button" role="tab" aria-selected={selectedCatId === null} onClick={() => setSelectedCatId(null)} className={cn(chip, selectedCatId === null ? chipOn : chipOff)}>
            <Layers className="h-4 w-4" />
            All
          </button>
          {categories.map((c) => {
            const on = selectedCatId === c.id;
            return (
              <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => setSelectedCatId(on ? null : c.id!)} className={cn(chip, on ? chipOn : chipOff)} style={on ? { backgroundColor: c.color, borderColor: c.color } : undefined}>
                <CategoryIcon name={c.icon} className="h-4 w-4" />
                {c.name}
                <span className="num opacity-70">{items.filter((i) => i.categoryId === c.id).length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={items.length === 0 ? "No items yet" : "Nothing matches"}
          description={items.length === 0 ? "Add your first product to start selling." : "Try another search or category."}
          action={
            items.length === 0 ? (
              <Button variant="primary" onClick={() => setIsCreatingItem(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add item
              </Button>
            ) : undefined
          }
          className="rounded-3xl border border-line bg-surface py-16"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {filteredItems.map((item) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            const isLow = item.trackStock && item.stock <= item.lowStockAt;
            const isOut = item.trackStock && item.stock <= 0;
            return (
              <li key={item.id} className={cn("flex flex-col gap-2 rounded-2xl border bg-surface p-3", isOut ? "border-bad/40" : isLow ? "border-warn/40" : "border-line")}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => setEditingItem(item)} className="press flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-extrabold text-white" style={{ backgroundColor: item.color }} aria-label={`Edit ${item.name}`}>
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : item.name.charAt(0)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => setEditingItem(item)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-bold text-fg">{item.name}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {cat ? cat.name : "Uncategorized"}
                          {item.sku && <span className="num"> · {item.sku}</span>}
                          {item.modifiers.length > 0 && ` · ${item.modifiers.length} option ${item.modifiers.length === 1 ? "group" : "groups"}`}
                        </span>
                      </button>
                      <button type="button" onClick={() => toggleFavorite(item)} aria-pressed={!!item.isFavorite} aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"} className={cn("press -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.isFavorite ? "text-amber-400" : "text-fg-subtle hover:text-fg")}>
                        <Star className={cn("h-4.5 w-4.5", item.isFavorite && "fill-current")} />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="num text-base font-extrabold text-ok">{money(item.price, settings.currency)}</span>
                      <span className="num text-xs text-fg-subtle">cost {money(item.cost, settings.currency)}</span>
                      {!item.isActive && (
                        <Badge tone="neutral">
                          <EyeOff className="mr-1 h-3 w-3" />
                          Hidden
                        </Badge>
                      )}
                      {isOut ? <Badge tone="danger">Sold out</Badge> : isLow ? <Badge tone="warning">Low stock</Badge> : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                  {item.trackStock ? (
                    <div className="flex items-center gap-1">
                      <Button variant="secondary" size="sm" iconOnly aria-label={`Decrease stock of ${item.name}`} onClick={() => adjustStock(item, -1)} disabled={item.stock <= 0}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className={cn("num min-w-[3.5rem] text-center text-sm font-bold", isOut ? "text-bad" : isLow ? "text-warn" : "text-fg")}>
                        {item.stock} <span className="text-xs font-medium text-fg-subtle">left</span>
                      </span>
                      <Button variant="secondary" size="sm" iconOnly aria-label={`Increase stock of ${item.name}`} onClick={() => adjustStock(item, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => adjustStock(item, 10)} className="px-2 text-xs">
                        +10
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-fg-subtle">Stock not tracked</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${item.name}`} onClick={() => setEditingItem(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Delete ${item.name}`} className="hover:bg-bad-soft hover:text-bad" onClick={() => deleteItem(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ItemEditModal
        open={isCreatingItem || !!editingItem}
        item={editingItem}
        categories={categories}
        onClose={() => {
          setIsCreatingItem(false);
          setEditingItem(null);
        }}
        settings={settings}
      />
      <CategoryEditModal open={isManagingCats} categories={categories} onClose={() => setIsManagingCats(false)} settings={settings} />
    </Page>
  );
};

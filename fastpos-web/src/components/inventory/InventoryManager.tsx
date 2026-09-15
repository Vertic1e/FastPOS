import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  Download,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { db } from "@/db";
import type { MenuItem, Category, StoreSettings } from "@/types";
import { ItemEditModal } from "./ItemEditModal";
import { CategoryEditModal } from "./CategoryEditModal";
import { money, downloadCsv } from "@/lib/format";

interface InventoryManagerProps {
  settings: StoreSettings;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ settings }) => {
  const items = useLiveQuery(() => db.menuItems.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchCat = selectedCatId === null || i.categoryId === selectedCatId;
      const matchSearch =
        searchQuery.trim() === "" ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCatId, searchQuery]);

  // Low stock calculation
  const lowStockItems = items.filter((i) => i.trackStock && i.stock <= i.lowStockAt);

  // Quick stock adjust
  const handleAdjustStock = async (item: MenuItem, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    await db.menuItems.update(item.id!, { stock: newStock });
    await db.stockMovements.add({
      itemId: item.id!,
      delta,
      reason: delta > 0 ? "restock" : "adjustment",
      note: "Manual quick adjustment",
      createdAt: new Date(),
    });
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      await db.menuItems.delete(item.id!);
    }
  };

  const handleExportCsv = () => {
    const headers = ["SKU", "Name", "Category", "Price", "Cost", "Stock", "LowStockThreshold"];
    const rows = items.map((i) => {
      const cat = categories.find((c) => c.id === i.categoryId);
      return [
        i.sku || "",
        i.name,
        cat ? cat.name : "Uncategorized",
        i.price,
        i.cost,
        i.trackStock ? i.stock : "N/A",
        i.trackStock ? i.lowStockAt : "N/A",
      ];
    });
    downloadCsv(`fastpos-inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Inventory & Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage menu items, recipes, stock levels, categories, and low-inventory warnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsManagingCats(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition"
          >
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => setIsCreatingItem(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-300 text-sm">
                {lowStockItems.length} items need restock!
              </h4>
              <p className="text-slate-400 mt-0.5">
                {lowStockItems.map((i) => i.name).slice(0, 3).join(", ")}
                {lowStockItems.length > 3 ? "..." : ""} are at or below their alert threshold.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or SKU..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCatId === null
                ? "bg-orange-500 text-white shadow"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id!)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCatId === c.id
                  ? "bg-orange-500 text-white shadow"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items View */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Mobile View (< sm) */}
        <div className="block sm:hidden divide-y divide-slate-850">
          {filteredItems.map((item) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            const isOut = item.trackStock && item.stock <= 0;
            const isLow = item.trackStock && item.stock > 0 && item.stock <= item.lowStockAt;

            return (
              <div key={item.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: item.color || "#f97316" }}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-100">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {cat?.name || "Uncategorized"} {item.sku && `• SKU: ${item.sku}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-emerald-400">
                      {money(item.price, settings.currency)}
                    </span>
                  </div>
                </div>

                {/* Bottom row: Stock control & edit */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-xs">
                  {item.trackStock ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOut
                            ? "bg-rose-500/20 text-rose-300"
                            : isLow
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.stock} left
                      </span>

                      {/* Quick Adjust */}
                      <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
                        <button
                          onClick={() => handleAdjustStock(item, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white bg-slate-900 active:scale-90"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleAdjustStock(item, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white bg-slate-900 active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Untracked stock</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet View (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Cost</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4 text-center">Quick Adjust</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredItems.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId);
                const isOut = item.trackStock && item.stock <= 0;
                const isLow = item.trackStock && item.stock > 0 && item.stock <= item.lowStockAt;

                return (
                  <tr key={item.id} className="hover:bg-slate-850/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || "#f97316" }}
                      />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {cat?.name || <span className="text-slate-600">Uncategorized</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{item.sku || "—"}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {money(item.price, settings.currency)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {money(item.cost, settings.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.trackStock ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                              isOut
                                ? "bg-rose-500/20 text-rose-300"
                                : isLow
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.stock} in stock
                          </span>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Untracked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.trackStock ? (
                        <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            onClick={() => handleAdjustStock(item, -1)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 active:scale-90 transition"
                            title="-1 Stock"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="font-mono text-xs font-bold text-slate-300 w-7 text-center">
                            {item.stock}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(item, 1)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 active:scale-90 transition"
                            title="+1 Stock"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {(isCreatingItem || editingItem) && (
        <ItemEditModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setIsCreatingItem(false);
            setEditingItem(null);
          }}
          settings={settings}
        />
      )}

      {isManagingCats && (
        <CategoryEditModal
          categories={categories}
          onClose={() => setIsManagingCats(false)}
        />
      )}
    </div>
  );
};

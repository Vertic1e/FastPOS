import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, DollarSign, Layers } from "lucide-react";
import type { MenuItem, Category, ModifierGroup, StoreSettings } from "@/types";
import { db } from "@/db";

interface ItemEditModalProps {
  item: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  settings: StoreSettings;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({
  item,
  categories,
  onClose,
  settings,
}) => {
  const isEditing = !!item && !!item.id;

  const [name, setName] = useState(item?.name || "");
  const [sku, setSku] = useState(item?.sku || "");
  const [categoryId, setCategoryId] = useState<number | null>(
    item?.categoryId ?? (categories[0]?.id || null)
  );
  const [price, setPrice] = useState(item?.price?.toString() || "3.50");
  const [cost, setCost] = useState(item?.cost?.toString() || "1.00");
  const [stock, setStock] = useState(item?.stock?.toString() || "50");
  const [lowStockAt, setLowStockAt] = useState(item?.lowStockAt?.toString() || "10");
  const [trackStock, setTrackStock] = useState(item?.trackStock ?? true);
  const [color, setColor] = useState(item?.color || "#f97316");
  const [image, setImage] = useState<string | undefined>(item?.image);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>(item?.modifiers || []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const colorPalette = [
    "#f97316", // orange
    "#ea580c", // dark orange
    "#eab308", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#ef4444", // red
  ];

  // Modifier Group management
  const handleAddGroup = () => {
    setModifiers((prev) => [
      ...prev,
      {
        name: "New Group",
        required: false,
        options: [
          { name: "Option 1", price: 0 },
          { name: "Option 2", price: 0.5 },
        ],
      },
    ]);
  };

  const handleRemoveGroup = (idx: number) => {
    setModifiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateGroupName = (idx: number, newName: string) => {
    setModifiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name: newName };
      return next;
    });
  };

  const handleToggleGroupRequired = (idx: number) => {
    setModifiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], required: !next[idx].required };
      return next;
    });
  };

  const handleAddOption = (groupIdx: number) => {
    setModifiers((prev) => {
      const next = [...prev];
      next[groupIdx] = {
        ...next[groupIdx],
        options: [...next[groupIdx].options, { name: "Extra", price: 0.5 }],
      };
      return next;
    });
  };

  const handleUpdateOption = (
    groupIdx: number,
    optIdx: number,
    optName: string,
    optPrice: number
  ) => {
    setModifiers((prev) => {
      const next = [...prev];
      const nextOpts = [...next[groupIdx].options];
      nextOpts[optIdx] = { name: optName, price: optPrice };
      next[groupIdx] = { ...next[groupIdx], options: nextOpts };
      return next;
    });
  };

  const handleRemoveOption = (groupIdx: number, optIdx: number) => {
    setModifiers((prev) => {
      const next = [...prev];
      next[groupIdx] = {
        ...next[groupIdx],
        options: next[groupIdx].options.filter((_, i) => i !== optIdx),
      };
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const parsedPrice = parseFloat(price) || 0;
    const parsedCost = parseFloat(cost) || 0;
    const parsedStock = parseInt(stock) || 0;
    const parsedLow = parseInt(lowStockAt) || 10;

    const payload: Partial<MenuItem> = {
      shopId: item?.shopId || settings.activeShopId || 1,
      name: name.trim(),
      sku: sku.trim() || undefined,
      categoryId,
      price: parsedPrice,
      cost: parsedCost,
      stock: parsedStock,
      lowStockAt: parsedLow,
      trackStock,
      color,
      image,
      modifiers,
      isActive: true,
      createdAt: item?.createdAt || new Date(),
    };

    if (isEditing) {
      await db.menuItems.update(item!.id!, payload);
    } else {
      await db.menuItems.add(payload as MenuItem);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/70 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="font-extrabold text-base text-white">
            {isEditing ? `Edit "${item?.name}"` : "Create Menu Item"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Image Upload Area */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200">Product Photo</span>
                <p className="text-[10px] text-slate-500">Camera or photo gallery upload</p>
              </div>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              {image ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-750 shrink-0 bg-slate-900">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 shrink-0">
                  <span className="text-[9px]">No photo</span>
                </div>
              )}

              <label className="flex-1 cursor-pointer">
                <div className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-750 text-center font-bold text-xs text-orange-400 transition active:scale-95">
                  {image ? "Change Photo" : "Upload Photo"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Item Name & SKU */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="font-semibold text-slate-300">Item Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vanilla Bean Latte"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">SKU / Barcode</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CF-05"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Category</label>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Accent Color</label>
              <div className="flex items-center gap-1.5 pt-1">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center transition"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing & Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Selling Price ($) *</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Cost of Goods ($)</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Stock Tracking */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200">Track Inventory Stock</span>
                <p className="text-[11px] text-slate-500">
                  Automatically reduce stock on order sale and alert on low stock
                </p>
              </div>
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {trackStock && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">In-Stock Quantity</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Low Stock Warning At</label>
                  <input
                    type="number"
                    value={lowStockAt}
                    onChange={(e) => setLowStockAt(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modifiers Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200">Item Modifiers & Add-ons</h4>
                <p className="text-[11px] text-slate-500">
                  e.g. Size choices, Milk types, Sweetness levels, Toppings
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddGroup}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-orange-400 font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group</span>
              </button>
            </div>

            {modifiers.map((grp, gIdx) => (
              <div
                key={gIdx}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={grp.name}
                    onChange={(e) => handleUpdateGroupName(gIdx, e.target.value)}
                    className="font-bold text-slate-100 bg-transparent border-b border-dashed border-slate-700 focus:outline-none focus:border-orange-500 pb-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grp.required}
                        onChange={() => handleToggleGroupRequired(gIdx)}
                        className="rounded text-orange-500 focus:ring-0"
                      />
                      <span>Required</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(gIdx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Options list */}
                <div className="space-y-1.5 pl-2">
                  {grp.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          handleUpdateOption(gIdx, oIdx, e.target.value, opt.price)
                        }
                        placeholder="Option name"
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-slate-500 font-mono">+$</span>
                        <input
                          type="number"
                          step="0.05"
                          value={opt.price}
                          onChange={(e) =>
                            handleUpdateOption(
                              gIdx,
                              oIdx,
                              opt.name,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(gIdx, oIdx)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(gIdx)}
                    className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 pt-1"
                  >
                    + Add option
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
          >
            {isEditing ? "Update Item" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import type { Category } from "@/types";
import { db } from "@/db";
import { CategoryIcon } from "@/components/common/CategoryIcon";

interface CategoryEditModalProps {
  categories: Category[];
  onClose: () => void;
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  categories,
  onClose,
}) => {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#f97316");
  const [newCatIcon, setNewCatIcon] = useState("coffee");

  const icons = [
    "coffee",
    "cup-soda",
    "croissant",
    "sandwich",
    "utensils",
    "pizza",
    "cake",
    "ice-cream",
    "beer",
    "wine",
    "apple",
    "flame",
    "soup",
  ];

  const colors = [
    "#f97316",
    "#10b981",
    "#eab308",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#3b82f6",
    "#ec4899",
  ];

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;

    await db.categories.add({
      name: newCatName.trim(),
      color: newCatColor,
      icon: newCatIcon,
      sortOrder: categories.length + 1,
      isActive: true,
    });

    setNewCatName("");
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Delete this category? Items under it will be unassigned.")) {
      await db.categories.delete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl shadow-black/70 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="font-extrabold text-base text-white">Manage Categories</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* New Category Form */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200">Create New Category</h4>
            <div className="space-y-1">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g. Desserts)..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Select Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {icons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setNewCatIcon(ic)}
                    className={`p-2 rounded-xl border transition ${
                      newCatIcon === ic
                        ? "bg-orange-500 text-white border-orange-400"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <CategoryIcon name={ic} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Select Color</label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center transition"
                    style={{ backgroundColor: c }}
                  >
                    {newCatColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="w-full py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-md active:scale-95 transition"
            >
              Add Category
            </button>
          </div>

          {/* Existing Categories */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Active Categories ({categories.length})
            </h4>
            <div className="space-y-1.5">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-slate-200 text-xs">{c.name}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(c.id!)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

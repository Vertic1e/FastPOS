import React, { useEffect, useState } from "react";
import { Plus, Trash2, Check, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { Category, StoreSettings } from "@/types";
import { db } from "@/db";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { Modal, Button, Input, SectionLabel, useConfirm } from "@/components/ui";

interface CategoryEditModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  settings: StoreSettings;
}

const ICONS = ["coffee", "cup-soda", "croissant", "sandwich", "utensils", "pizza", "cake", "ice-cream", "beer", "wine", "apple", "flame", "soup"];
const COLORS = ["#f97316", "#10b981", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#3b82f6", "#ec4899"];

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ open, categories, onClose, settings }) => {
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id!);
    setName(c.name);
    setColor(c.color);
    setIcon(c.icon);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (editingId != null) {
      await db.categories.update(editingId, { name: name.trim(), color, icon });
    } else {
      await db.categories.add({
        shopId: settings.activeShopId || 1,
        name: name.trim(),
        color,
        icon,
        sortOrder: (categories[categories.length - 1]?.sortOrder ?? categories.length) + 1,
        isActive: true,
      });
    }
    resetForm();
  };

  const remove = async (c: Category) => {
    const ok = await confirm({
      title: `Delete “${c.name}”?`,
      message: "Items in this category are kept and become uncategorized.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await db.categories.delete(c.id!);
    await db.menuItems.where("categoryId").equals(c.id!).modify({ categoryId: null });
    if (editingId === c.id) resetForm();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    await db.transaction("rw", db.categories, async () => {
      await db.categories.update(a.id!, { sortOrder: target + 1 });
      await db.categories.update(b.id!, { sortOrder: index + 1 });
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Categories" description="Group items into tabs on the register. Order here is the order cashiers see.">
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-1.5">
          {categories.map((c, i) => (
            <li key={c.id} className={cn("flex items-center gap-2 rounded-2xl border p-2", editingId === c.id ? "border-brand bg-brand-soft/40" : "border-line bg-surface-2/40")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{c.name}</span>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" iconOnly aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Move down" onClick={() => move(i, 1)} disabled={i === categories.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Delete ${c.name}`} className="hover:bg-bad-soft hover:text-bad" onClick={() => remove(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {categories.length === 0 && <li className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-fg-subtle">No categories yet.</li>}
        </ul>

        <section className="rounded-2xl border border-line bg-surface-2/40 p-3 sm:p-4">
          <SectionLabel>{editingId != null ? "Edit category" : "New category"}</SectionLabel>
          <div className="mt-2 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" aria-label="Category name" enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && save()} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                aria-label={ic}
                aria-pressed={icon === ic}
                className={cn("press flex h-10 w-10 items-center justify-center rounded-xl border", icon === ic ? "border-brand bg-brand text-white" : "border-line bg-surface text-fg-muted hover:text-fg")}
              >
                <CategoryIcon name={ic} className="h-5 w-5" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                className={cn("press flex h-9 w-9 items-center justify-center rounded-full border-2", color === c ? "border-fg" : "border-transparent")}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {editingId != null && (
              <Button variant="secondary" size="md" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button variant="primary" size="md" fullWidth onClick={save} disabled={!name.trim()} leftIcon={editingId != null ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
              {editingId != null ? "Save" : "Add category"}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
};

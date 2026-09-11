"use client";

import {
  Banknote,
  Boxes,
  ClipboardList,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  adjustStockAction,
  deleteCategoryAction,
  deleteItemAction,
  saveCategoryAction,
} from "@/app/actions/items";
import { CategoryIcon, ICON_CHOICES } from "@/components/category-icon";
import {
  ConfirmModal,
  EmptyState,
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  Select,
  StockBadge,
  TextInput,
  Toggle,
} from "@/components/ui";
import type { ModifierGroup } from "@/db/schema";
import { CATEGORY_COLORS } from "@/lib/accents";
import { fmtDateTime, money } from "@/lib/format";
import { ItemModal } from "./item-modal";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type InvItem = {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  lowStockAt: number;
  trackStock: boolean;
  color: string;
  categoryId: number | null;
  modifiers: ModifierGroup[];
  sku: string | null;
  isActive: boolean;
};

export type InvCategory = {
  id: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
};

export type LogRow = {
  id: number;
  delta: number;
  reason: string;
  note: string | null;
  createdAt: string;
  itemName: string;
  itemColor: string;
};

type Filter = "all" | "low" | "out" | "inactive";

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export function InventoryClient({
  items,
  categories,
  log,
  currency,
  initialTab,
  initialFilter,
  editId,
}: {
  items: InvItem[];
  categories: InvCategory[];
  log: LogRow[];
  currency: string;
  initialTab: "items" | "categories" | "log";
  initialFilter: "all" | "low" | "out";
  editId: number | null;
}) {
  const router = useTransitionRouter();
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<number | "all">("all");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [itemList, setItemList] = useState(items);
  const [editing, setEditing] = useState<InvItem | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<InvItem | null>(null);
  const [deleting, setDeleting] = useState<InvItem | null>(null);
  const [catEditing, setCatEditing] = useState<InvCategory | "new" | null>(null);
  const [catDeleting, setCatDeleting] = useState<InvCategory | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => setItemList(items), [items]);

  useEffect(() => {
    if (editId) {
      const found = items.find((i) => i.id === editId);
      if (found) setEditing(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return itemList.filter((i) => {
      if (catFilter !== "all" && i.categoryId !== catFilter) return false;
      if (filter === "low" && !(i.trackStock && i.stock > 0 && i.stock <= i.lowStockAt)) return false;
      if (filter === "out" && !(i.trackStock && i.stock <= 0)) return false;
      if (filter === "inactive" && i.isActive) return false;
      // archived items only appear when explicitly requested
      if (filter !== "inactive" && !i.isActive) return false;
      if (needle && !i.name.toLowerCase().includes(needle) && !(i.sku ?? "").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [itemList, q, catFilter, filter]);

  const stockValue = itemList.reduce((s, i) => s + (i.trackStock ? i.stock * i.cost : 0), 0);
  const lowCount = itemList.filter((i) => i.isActive && i.trackStock && i.stock <= i.lowStockAt).length;

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    // optimistic removal
    setItemList((prev) => prev.filter((i) => i.id !== target.id));
    deleteItemAction(target.id).then(() => {
      setDeleteBusy(false);
      setDeleting(null);
      router.refresh();
    });
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All items" },
    { key: "low", label: "Low stock" },
    { key: "out", label: "Out of stock" },
    { key: "inactive", label: "Archived" },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Inventory</h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {itemList.filter((i) => i.isActive).length} active items · {money(stockValue, currency)} stock value
            {lowCount > 0 && <span className="font-semibold text-amber-600"> · {lowCount} low</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={() => { setCatEditing("new"); setTab("categories"); }}>
            <Plus size={15} />
            Category
          </GhostButton>
          <PrimaryButton onClick={() => setEditing("new")}>
            <Plus size={15} strokeWidth={2.5} />
            New item
          </PrimaryButton>
        </div>
      </header>

      {/* Tabs */}
      <div className="anim-rise flex gap-1 rounded-2xl border border-line bg-paper p-1.5" style={{ animationDelay: "0.05s" }}>
        {(
          [
            { key: "items", label: "Menu items", icon: Package },
            { key: "categories", label: "Categories", icon: Boxes },
            { key: "log", label: "Stock log", icon: ClipboardList },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
              tab === t.key ? "bg-ink text-white shadow-sm" : "text-ink/50 hover:text-ink"
            }`}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="anim-fade space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or SKU…"
                className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-ink/30 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>
            <Select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="!w-auto"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <div className="flex gap-1 rounded-xl bg-ink/[0.05] p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    filter === f.key ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={itemList.length === 0 ? Package : SearchX}
              title={itemList.length === 0 ? "Your menu is empty" : "No items match"}
              hint={
                itemList.length === 0
                  ? "Create your first menu item to start selling."
                  : "Try clearing the search or picking another filter."
              }
              action={
                itemList.length === 0 ? (
                  <PrimaryButton onClick={() => setEditing("new")}>
                    <Plus size={15} />
                    Create first item
                  </PrimaryButton>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink/40">
                      <th className="px-5 py-3.5">Item</th>
                      <th className="px-3 py-3.5">Category</th>
                      <th className="px-3 py-3.5 text-right">Price</th>
                      <th className="px-3 py-3.5 text-right">Margin</th>
                      <th className="px-3 py-3.5">Stock</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((i) => {
                      const cat = categories.find((c) => c.id === i.categoryId);
                      const margin = i.price > 0 ? ((i.price - i.cost) / i.price) * 100 : 0;
                      return (
                        <tr key={i.id} className="group transition-colors hover:bg-cream/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{i.name}</p>
                                <p className="text-[11px] text-ink/40">
                                  {i.sku ?? "—"}
                                  {i.modifiers.length > 0 && ` · ${i.modifiers.length} option${i.modifiers.length === 1 ? "" : "s"}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {cat ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                style={{ background: `${cat.color}18`, color: cat.color }}
                              >
                                <CategoryIcon name={cat.icon} size={12} />
                                {cat.name}
                              </span>
                            ) : (
                              <span className="text-[12px] text-ink/35">Uncategorized</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(i.price, currency)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink/50">{margin.toFixed(0)}%</td>
                          <td className="px-3 py-3">
                            <StockBadge stock={i.stock} lowAt={i.lowStockAt} track={i.trackStock} />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                              <IconBtn title="Adjust stock" onClick={() => setAdjusting(i)}>
                                <PackagePlus size={15} />
                              </IconBtn>
                              <IconBtn title="Edit" onClick={() => setEditing(i)}>
                                <Pencil size={15} />
                              </IconBtn>
                              <IconBtn title="Delete" danger onClick={() => setDeleting(i)}>
                                <Trash2 size={15} />
                              </IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {visible.map((i) => (
                  <div key={i.id} className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{i.name}</p>
                          <p className="text-[11px] text-ink/40">{money(i.price, currency)} · {i.sku ?? "no SKU"}</p>
                        </div>
                      </div>
                      <StockBadge stock={i.stock} lowAt={i.lowStockAt} track={i.trackStock} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setAdjusting(i)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink/[0.05] py-2 text-[12px] font-semibold">
                        <PackagePlus size={13} /> Stock
                      </button>
                      <button onClick={() => setEditing(i)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink/[0.05] py-2 text-[12px] font-semibold">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => setDeleting(i)} className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "categories" && (
        <CategoriesTab
          categories={categories}
          onEdit={(c) => setCatEditing(c)}
          onDelete={(c) => setCatDeleting(c)}
          onNew={() => setCatEditing("new")}
        />
      )}

      {tab === "log" && <LogTab log={log} />}

      {/* Modals */}
      {editing && (
        <ItemModal
          item={editing === "new" ? null : editing}
          categories={categories}
          currency={currency}
          onClose={() => setEditing(null)}
        />
      )}
      {adjusting && <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} />}
      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title={`Delete “${deleting?.name}”?`}
        message="This removes the item from the menu and stock. Past orders keep their records."
      />
      {catEditing && (
        <CategoryModal
          category={catEditing === "new" ? null : catEditing}
          categoriesCount={categories.length}
          onClose={() => setCatEditing(null)}
        />
      )}
      <ConfirmModal
        open={catDeleting !== null}
        onClose={() => setCatDeleting(null)}
        onConfirm={async () => {
          if (!catDeleting) return;
          setDeleteBusy(true);
          const res = await deleteCategoryAction(catDeleting.id);
          setDeleteBusy(false);
          if (res.ok) {
            setCatDeleting(null);
            router.refresh();
          } else {
            alert(res.error);
          }
        }}
        busy={deleteBusy}
        title={`Delete “${catDeleting?.name}”?`}
        message="Only empty categories can be deleted. Items inside must be moved first."
      />
    </div>
  );
}

function useTransitionRouter() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return {
    refresh: () => startTransition(() => router.refresh()),
  };
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors ${
        danger ? "text-ink/40 hover:bg-red-50 hover:text-red-600" : "text-ink/40 hover:bg-ink/[0.06] hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Adjust stock modal                                                  */
/* ------------------------------------------------------------------ */

function AdjustModal({ item, onClose }: { item: InvItem; onClose: () => void }) {
  const router = useTransitionRouter();
  const [mode, setMode] = useState<"add" | "remove" | "count">("add");
  const [qty, setQty] = useState("10");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qtyNum = Math.max(0, parseInt(qty, 10) || 0);
  const newStock =
    mode === "add" ? item.stock + qtyNum : mode === "remove" ? item.stock - qtyNum : qtyNum;

  const MODES = [
    { key: "add", label: "Restock", icon: TrendingUp },
    { key: "remove", label: "Waste / loss", icon: TrendingDown },
    { key: "count", label: "Set count", icon: Banknote },
  ] as const;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await adjustStockAction({
      itemId: item.id,
      mode: mode === "count" ? "set" : "delta",
      value: mode === "add" ? qtyNum : mode === "remove" ? -qtyNum : qtyNum,
      reason: mode === "add" ? "restock" : mode === "remove" ? "waste" : "adjustment",
      note: note || undefined,
    });
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error ?? "Could not adjust stock.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} width="max-w-sm">
      <div className="p-6">
        <h3 className="font-display text-lg font-semibold">Adjust stock</h3>
        <p className="mt-0.5 text-[13px] text-ink/50">
          {item.name} · currently <span className="font-semibold text-ink">{item.stock}</span> on hand
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-ink/[0.05] p-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-semibold transition-all ${
                mode === m.key ? "bg-white text-ink shadow-sm" : "text-ink/45"
              }`}
            >
              <m.icon size={13} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setQty(String(Math.max(0, qtyNum - 1)))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white active:scale-90"
          >
            <Minus size={15} />
          </button>
          <input
            value={qty}
            onChange={(e) => /^\d{0,5}$/.test(e.target.value) && setQty(e.target.value)}
            inputMode="numeric"
            className="w-24 rounded-xl border border-line bg-white py-2.5 text-center font-display text-xl font-semibold outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => setQty(String(qtyNum + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white active:scale-90"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="mt-4">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. Friday delivery)" />
        </div>

        <div className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-semibold ${newStock < 0 ? "bg-red-50 text-red-600" : "bg-ink/[0.04]"}`}>
          New stock level: {newStock < 0 ? "invalid (below zero)" : newStock}
        </div>

        {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}

        <PrimaryButton onClick={submit} busy={busy} disabled={newStock < 0} className="mt-4 w-full !py-3">
          Apply adjustment
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Categories tab + modal                                              */
/* ------------------------------------------------------------------ */

function CategoriesTab({
  categories,
  onEdit,
  onDelete,
  onNew,
}: {
  categories: InvCategory[];
  onEdit: (c: InvCategory) => void;
  onDelete: (c: InvCategory) => void;
  onNew: () => void;
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No categories yet"
        hint="Categories organize your register — Burgers, Drinks, Desserts…"
        action={
          <PrimaryButton onClick={onNew}>
            <Plus size={15} />
            Create category
          </PrimaryButton>
        }
      />
    );
  }
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <div
          key={c.id}
          className="group relative overflow-hidden rounded-2xl border border-line bg-paper p-4 transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: c.color }} />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: c.color }}>
              <CategoryIcon name={c.icon} size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-[11px] text-ink/45">
                {c.itemCount} item{c.itemCount === 1 ? "" : "s"}
                {!c.isActive && " · hidden"}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex gap-2">
            <button onClick={() => onEdit(c)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink/[0.05] py-2 text-[12px] font-semibold transition-colors hover:bg-ink/10">
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(c)}
              disabled={c.itemCount > 0}
              title={c.itemCount > 0 ? "Move items out first" : "Delete category"}
              className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={onNew}
        className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 text-ink/40 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Plus size={20} />
        <span className="text-[12px] font-semibold">New category</span>
      </button>
    </div>
  );
}

function CategoryModal({
  category,
  categoriesCount,
  onClose,
}: {
  category: InvCategory | null;
  categoriesCount: number;
  onClose: () => void;
}) {
  const router = useTransitionRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[3]);
  const [icon, setIcon] = useState(category?.icon ?? "utensils");
  const [active, setActive] = useState(category?.isActive ?? true);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCategoryAction({
        id: category?.id,
        name,
        color,
        icon,
        sortOrder: category?.sortOrder ?? categoriesCount,
        isActive: active,
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Could not save category.");
      }
    });
  }

  return (
    <Modal open onClose={onClose} width="max-w-md">
      <div className="p-6">
        <h3 className="font-display text-xl font-semibold">{category ? "Edit category" : "New category"}</h3>
        {error && (
          <p className="anim-pop mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-4">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Wood-Fired Pizza" autoFocus />
          </Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold">Color</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold">Icon</span>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_CHOICES.map((ic) => {
                const Icon = CategoryIcon;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`flex h-9 items-center justify-center rounded-lg border transition-all ${
                      icon === ic ? "border-transparent text-white" : "border-line bg-white text-ink/50 hover:border-ink/30"
                    }`}
                    style={icon === ic ? { background: color } : undefined}
                    title={ic}
                  >
                    <Icon name={ic} size={15} />
                  </button>
                );
              })}
            </div>
          </div>
          <Toggle checked={active} onChange={setActive} label="Show on register" />
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton onClick={save} busy={pending}>
            {category ? "Save changes" : "Create category"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Stock log tab                                                       */
/* ------------------------------------------------------------------ */

function LogTab({ log }: { log: LogRow[] }) {
  if (log.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No stock movements yet"
        hint="Every sale, restock, and adjustment is recorded here automatically."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="divide-y divide-line">
        {log.map((l) => {
          const positive = l.delta > 0;
          const meta =
            l.reason === "sale"
              ? { label: "Sale", icon: Banknote, cls: "bg-ink/[0.06] text-ink/60" }
              : l.reason === "restock"
                ? { label: "Restock", icon: TrendingUp, cls: "bg-emerald-50 text-emerald-600" }
                : l.reason === "waste"
                  ? { label: "Waste", icon: TrendingDown, cls: "bg-red-50 text-red-500" }
                  : { label: "Adjustment", icon: Package, cls: "bg-sky-50 text-sky-600" };
          return (
            <div key={l.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}>
                <meta.icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: l.itemColor }} />
                  {l.itemName}
                </p>
                <p className="truncate text-[12px] text-ink/45">
                  {meta.label}
                  {l.note ? ` · ${l.note}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-display text-sm font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-500"}`}>
                  {positive ? "+" : ""}{l.delta}
                </p>
                <p className="text-[11px] text-ink/40">{fmtDateTime(new Date(l.createdAt))}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

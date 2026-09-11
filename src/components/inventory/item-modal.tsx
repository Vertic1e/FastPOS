"use client";

import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveItemAction, type ItemInput } from "@/app/actions/items";
import { Field, Modal, PrimaryButton, Select, TextInput, Toggle } from "@/components/ui";
import type { ModifierGroup } from "@/db/schema";
import { CATEGORY_COLORS } from "@/lib/accents";
import type { InvCategory, InvItem } from "./inventory-client";

export function ItemModal({
  item,
  categories,
  currency,
  onClose,
}: {
  item: InvItem | null;
  categories: InvCategory[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? categories[0]?.id ?? null);
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [cost, setCost] = useState(item ? String(item.cost) : "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [stock, setStock] = useState(item ? String(item.stock) : "0");
  const [lowStockAt, setLowStockAt] = useState(item ? String(item.lowStockAt) : "10");
  const [trackStock, setTrackStock] = useState(item?.trackStock ?? true);
  const [active, setActive] = useState(item?.isActive ?? true);
  const [color, setColor] = useState(item?.color ?? CATEGORY_COLORS[0]);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>(item?.modifiers ?? []);

  function save() {
    setError(null);
    const input: ItemInput = {
      id: item?.id,
      name,
      categoryId,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      stock: parseInt(stock, 10) || 0,
      lowStockAt: parseInt(lowStockAt, 10) || 0,
      trackStock,
      color,
      sku,
      isActive: active,
      modifiers,
    };
    startTransition(async () => {
      const res = await saveItemAction(input);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Could not save item.");
      }
    });
  }

  function updateGroup(idx: number, patch: Partial<ModifierGroup>) {
    setModifiers((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  return (
    <Modal open onClose={onClose} width="max-w-xl">
      <div className="p-6">
        <h3 className="font-display text-xl font-semibold">{item ? "Edit item" : "New menu item"}</h3>
        <p className="mt-0.5 text-[13px] text-ink/50">
          {item ? `Update “${item.name}” — changes go live on the register instantly.` : "Add something delicious to the menu."}
        </p>

        {error && (
          <p className="anim-pop mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Item name">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Truffle Smash Burger" autoFocus />
              </Field>
            </div>
            <Field label="Category">
              <Select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="SKU" hint="optional">
              <TextInput value={sku} onChange={(e) => setSku(e.target.value)} placeholder="BRG-001" />
            </Field>
            <Field label={`Sell price (${currency})`}>
              <TextInput value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="12.90" />
            </Field>
            <Field label={`Cost (${currency})`} hint="for margin tracking">
              <TextInput value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="4.10" />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-semibold">Card color</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle checked={trackStock} onChange={setTrackStock} label="Track stock for this item" />
            <Toggle checked={active} onChange={setActive} label="Visible on register" />
          </div>

          {trackStock && (
            <div className="anim-fade grid gap-4 sm:grid-cols-2">
              <Field label="Stock on hand">
                <TextInput value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="Low-stock alert at">
                <TextInput value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value)} inputMode="numeric" />
              </Field>
            </div>
          )}

          {/* Modifier builder */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Customization options</p>
                <p className="text-[12px] text-ink/45">Sizes, add-ons, doneness — anything a guest can pick.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModifiers((prev) => [
                    ...prev,
                    { name: `Option ${prev.length + 1}`, required: false, options: [{ name: "Choice", price: 0 }] },
                  ])
                }
                className="flex items-center gap-1 rounded-lg bg-ink/[0.05] px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-ink/10"
              >
                <Plus size={13} />
                Group
              </button>
            </div>

            {modifiers.length === 0 ? (
              <p className="mt-3 rounded-xl bg-cream/80 px-3 py-3 text-[12px] text-ink/45">
                No options — tapping this item on the register adds it straight to the ticket.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {modifiers.map((g, gi) => (
                  <div key={gi} className="rounded-xl border border-line p-3.5">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="shrink-0 text-ink/20" />
                      <input
                        value={g.name}
                        onChange={(e) => updateGroup(gi, { name: e.target.value })}
                        placeholder="Group name (e.g. Size)"
                        className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:border-[var(--accent)]"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-ink/50">
                        <input
                          type="checkbox"
                          checked={g.required}
                          onChange={(e) => updateGroup(gi, { required: e.target.checked })}
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setModifiers((prev) => prev.filter((_, i) => i !== gi))}
                        className="rounded-lg p-1.5 text-ink/35 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove group"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {g.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            value={opt.name}
                            onChange={(e) =>
                              updateGroup(gi, {
                                options: g.options.map((o, i) => (i === oi ? { ...o, name: e.target.value } : o)),
                              })
                            }
                            placeholder="Option name"
                            className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                          />
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink/35">{currency}</span>
                            <input
                              value={String(opt.price)}
                              onChange={(e) =>
                                updateGroup(gi, {
                                  options: g.options.map((o, i) =>
                                    i === oi ? { ...o, price: parseFloat(e.target.value) || 0 } : o,
                                  ),
                                })
                              }
                              inputMode="decimal"
                              className="w-full rounded-lg border border-line py-1.5 pl-7 pr-2 text-[13px] outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateGroup(gi, { options: g.options.filter((_, i) => i !== oi) })
                            }
                            className="rounded-lg p-1.5 text-ink/30 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove option"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateGroup(gi, { options: [...g.options, { name: "", price: 0 }] })
                        }
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink/50 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                      >
                        <Plus size={12} />
                        Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <PrimaryButton onClick={save} busy={pending}>
            <Save size={15} />
            {item ? "Save changes" : "Create item"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

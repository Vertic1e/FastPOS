import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Camera, ImagePlus, Star } from "lucide-react";
import type { MenuItem, Category, ModifierGroup, StoreSettings } from "@/types";
import { db } from "@/db";
import { cn } from "@/lib/cn";
import { Modal, Button, Field, Input, Select, Switch, SectionLabel, Badge, useToast } from "@/components/ui";

interface ItemEditModalProps {
  open: boolean;
  item: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  settings: StoreSettings;
}

const COLORS = ["#f97316", "#ea580c", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#64748b"];

export const ItemEditModal: React.FC<ItemEditModalProps> = ({ open, item, categories, onClose, settings }) => {
  const toast = useToast();
  const isEditing = !!item?.id;
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [lowStockAt, setLowStockAt] = useState("");
  const [trackStock, setTrackStock] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState(COLORS[0]);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // (Re)initialise the form each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setName(item?.name || "");
    setSku(item?.sku || "");
    setCategoryId(item?.categoryId ?? (categories[0]?.id ?? null));
    setPrice(item ? String(item.price) : "");
    setCost(item ? String(item.cost) : "");
    setStock(item ? String(item.stock) : "50");
    setLowStockAt(item ? String(item.lowStockAt) : "10");
    setTrackStock(item?.trackStock ?? true);
    setIsFavorite(!!item?.isFavorite);
    setIsActive(item?.isActive ?? true);
    setColor(item?.color || COLORS[0]);
    setImage(item?.image);
    setModifiers(item?.modifiers ? item.modifiers.map((g) => ({ ...g, options: g.options.map((o) => ({ ...o })) })) : []);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

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
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setImage(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ---------- modifier groups ---------- */
  const updateGroup = (idx: number, patch: Partial<ModifierGroup>) =>
    setModifiers((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const addGroup = () =>
    setModifiers((prev) => [
      ...prev,
      { name: `Option group ${prev.length + 1}`, required: false, options: [{ name: "Regular", price: 0 }, { name: "Large", price: 0.5 }] },
    ]);
  const removeGroup = (idx: number) => setModifiers((prev) => prev.filter((_, i) => i !== idx));
  const addOption = (gi: number) => updateGroup(gi, { options: [...modifiers[gi].options, { name: "", price: 0 }] });
  const updateOption = (gi: number, oi: number, patch: { name?: string; price?: number }) =>
    updateGroup(gi, { options: modifiers[gi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });
  const removeOption = (gi: number, oi: number) => updateGroup(gi, { options: modifiers[gi].options.filter((_, i) => i !== oi) });

  const save = async () => {
    if (!name.trim()) {
      setError("Give the item a name.");
      return;
    }
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid selling price.");
      return;
    }
    const cleanModifiers = modifiers
      .map((g) => ({ ...g, name: g.name.trim() || "Options", options: g.options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), price: o.price || 0 })) }))
      .filter((g) => g.options.length > 0);

    const payload: Omit<MenuItem, "id"> = {
      shopId: item?.shopId || settings.activeShopId || 1,
      name: name.trim(),
      sku: sku.trim() || undefined,
      categoryId,
      price: parsedPrice,
      cost: parseFloat(cost) || 0,
      stock: parseInt(stock, 10) || 0,
      lowStockAt: parseInt(lowStockAt, 10) || 0,
      trackStock,
      color,
      image,
      isFavorite,
      modifiers: cleanModifiers,
      isActive,
      createdAt: item?.createdAt || new Date(),
    };
    if (isEditing) await db.menuItems.update(item!.id!, payload);
    else await db.menuItems.add(payload as MenuItem);
    toast({ title: isEditing ? "Item updated" : "Item added", description: payload.name });
    onClose();
  };

  const margin = (() => {
    const p = parseFloat(price);
    const c = parseFloat(cost);
    if (!p || Number.isNaN(c)) return null;
    return Math.round(((p - c) / p) * 100);
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? "Edit item" : "New item"}
      description={isEditing ? item?.name : "Products appear in the register as soon as they're saved."}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={save}>
            {isEditing ? "Save changes" : "Add item"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-xl border border-bad/40 bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">
            {error}
          </p>
        )}

        {/* Identity */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="press relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line text-3xl font-extrabold text-white"
            style={{ backgroundColor: color }}
            aria-label={image ? "Change photo" : "Add photo"}
          >
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : name.trim().charAt(0) || <ImagePlus className="h-8 w-8 opacity-90" />}
            <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-surface/90 text-fg shadow">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Iced Latte" autoFocus={!isEditing} enterKeyHint="next" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU / barcode">
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" mono enterKeyHint="next" />
              </Field>
              <Field label="Category">
                <Select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </div>
        {image && (
          <div className="-mt-3 flex gap-3 text-xs">
            <button type="button" onClick={() => setImage(undefined)} className="font-semibold text-bad hover:underline">
              Remove photo
            </button>
          </div>
        )}

        {/* Pricing */}
        <section>
          <SectionLabel>Pricing</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Field label="Selling price" required>
              <Input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" prefix={settings.currency} mono size="lg" />
            </Field>
            <Field label="Cost" hint={margin !== null ? `${margin}% margin` : undefined}>
              <Input type="text" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" prefix={settings.currency} mono size="lg" />
            </Field>
          </div>
        </section>

        {/* Stock */}
        <section className="rounded-2xl border border-line bg-surface-2/40 p-3">
          <Switch checked={trackStock} onChange={setTrackStock} label="Track stock" description="Deduct on every sale and warn when running low." />
          {trackStock && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="In stock">
                <Input type="text" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} mono />
              </Field>
              <Field label="Warn when below">
                <Input type="text" inputMode="numeric" value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value.replace(/\D/g, ""))} mono />
              </Field>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section>
          <SectionLabel>Tile colour</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                className={cn("press h-10 w-10 rounded-xl border-2", color === c ? "scale-105 border-fg ring-2 ring-fg/20" : "border-transparent")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <Switch checked={isFavorite} onChange={setIsFavorite} icon={<Star className="h-4 w-4 text-amber-400" />} label="Favorite" description="Show in the register's Favorites filter." />
          <Switch checked={isActive} onChange={setIsActive} label="Visible in register" description="Hide seasonal items without deleting them." />
        </div>

        {/* Modifiers */}
        <section>
          <div className="flex items-center justify-between">
            <SectionLabel>Options & add-ons</SectionLabel>
            <Button variant="ghost" size="sm" onClick={addGroup} leftIcon={<Plus className="h-4 w-4" />}>
              Add group
            </Button>
          </div>
          {modifiers.length === 0 ? (
            <p className="mt-1 text-xs text-fg-subtle">Sizes, milk choices, toppings… Customers pick these when the item is added to a ticket.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              {modifiers.map((g, gi) => (
                <div key={gi} className="rounded-2xl border border-line bg-surface-2/40 p-3">
                  <div className="flex items-center gap-2">
                    <Input value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} placeholder="Group name (e.g. Size)" className="h-10 font-semibold" aria-label="Option group name" />
                    <Button variant="ghost" size="md" iconOnly aria-label="Remove group" className="hover:bg-bad-soft hover:text-bad" onClick={() => removeGroup(gi)}>
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateGroup(gi, { required: !g.required })}
                      className="press flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:bg-surface-3"
                      aria-pressed={g.required}
                    >
                      <Badge tone={g.required ? "brand" : "neutral"}>{g.required ? "Required · pick one" : "Optional · pick any"}</Badge>
                      <span className="text-fg-subtle">tap to change</span>
                    </button>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {g.options.map((o, oi) => (
                      <li key={oi} className="flex items-center gap-2">
                        <Input value={o.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} placeholder="Option name" className="h-10" aria-label="Option name" />
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={o.price === 0 ? "" : String(o.price)}
                          onChange={(e) => updateOption(gi, oi, { price: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          prefix="+"
                          mono
                          className="h-10"
                          wrapperClassName="w-28 flex-none"
                          aria-label="Extra price"
                        />
                        <Button variant="ghost" size="sm" iconOnly aria-label="Remove option" className="shrink-0 hover:bg-bad-soft hover:text-bad" onClick={() => removeOption(gi, oi)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" onClick={() => addOption(gi)} leftIcon={<Plus className="h-4 w-4" />} className="mt-1.5 -ml-1">
                    Add option
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};

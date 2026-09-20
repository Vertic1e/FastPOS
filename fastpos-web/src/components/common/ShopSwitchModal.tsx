import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Store, Plus, CheckCircle2, MapPin, Phone } from "lucide-react";
import { db } from "@/db";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/components/layout/nav";
import { Modal, Button, Field, Input } from "@/components/ui";

interface ShopSwitchModalProps {
  open: boolean;
  activeShopId: number;
  onClose: () => void;
  onSelectShop: (shopId: number) => void;
}

export const ShopSwitchModal: React.FC<ShopSwitchModalProps> = ({ open, activeShopId, onClose, onSelectShop }) => {
  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open) {
      setAdding(false);
      setName("");
      setAddress("");
      setPhone("");
    }
  }, [open]);

  const create = async () => {
    if (!name.trim()) return;
    const newId = (await db.shops.add({
      name: name.trim(),
      address: address.trim() || "Branch address",
      phone: phone.trim() || "",
      isDefault: false,
    })) as number;
    onSelectShop(newId);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={adding ? "New branch" : "Switch branch"}
      description={adding ? "Each branch keeps its own catalog, orders and shifts." : "Choose which shop this device is selling for."}
      icon={<Store />}
      footer={
        adding ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setAdding(false)}>
              Back
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={create} disabled={!name.trim()} leftIcon={<Plus className="h-5 w-5" />}>
              Create branch
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="lg" fullWidth onClick={() => setAdding(true)} leftIcon={<Plus className="h-5 w-5" />}>
            Add a branch
          </Button>
        )
      }
    >
      {!adding ? (
        <ul className="flex flex-col gap-2">
          {shops.map((shop) => {
            const active = shop.id === activeShopId;
            return (
              <li key={shop.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectShop(shop.id!);
                    onClose();
                  }}
                  className={cn(
                    "press flex w-full items-center gap-3 rounded-2xl border p-3 text-left",
                    active ? "border-brand bg-brand-soft" : "border-line bg-surface-2/50 hover:border-line-strong"
                  )}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold", active ? "bg-brand text-white" : "bg-surface-3 text-fg-muted")}>
                    {initialsOf(shop.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-fg">{shop.name}</span>
                    <span className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
                      {shop.address && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{shop.address}</span>
                        </span>
                      )}
                      {shop.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {shop.phone}
                        </span>
                      )}
                    </span>
                  </span>
                  {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-text" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Branch name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Café" autoFocus enterKeyHint="next" />
          </Field>
          <Field label="Address" hint="Printed on receipts.">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" enterKeyHint="next" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+855 …" inputMode="tel" enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && create()} />
          </Field>
        </div>
      )}
    </Modal>
  );
};

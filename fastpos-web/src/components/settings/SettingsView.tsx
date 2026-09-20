import React, { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Store, Building2, ShieldCheck, Palette, Coins, ReceiptText, Volume2, Database, Download, Upload, RotateCcw, Eye, EyeOff, Save, Plus, CheckCircle2, Info } from "lucide-react";
import { db, DEFAULT_SETTINGS, seedInitialData } from "@/db";
import type { StoreSettings, UserRole, FontSizeScale } from "@/types";
import type { ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/components/layout/nav";
import { DisplayOptions } from "@/components/layout/DisplayOptions";
import { Page, PageHeader, Card, CardHeader, CardBody, Button, Field, Input, Textarea, Switch, Segmented, Badge, useConfirm, useToast } from "@/components/ui";

interface SettingsViewProps {
  settings: StoreSettings;
  onUpdateSettings: (s: StoreSettings) => void | Promise<void>;
  theme: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  onChangeDensity: (cols: 2 | 3) => void;
  onChangeFontSize: (size: FontSizeScale) => void;
}

const VOLATILE_KEYS: (keyof StoreSettings)[] = ["themeMode", "accessibility", "activeShopId", "currentRole"];

/** Compare persisted form fields only (display/role/shop changes are applied instantly elsewhere). */
function isDirty(a: StoreSettings, b: StoreSettings) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof StoreSettings>;
  for (const k of keys) {
    if (VOLATILE_KEYS.includes(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return true;
  }
  return false;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, theme, onChangeTheme, onChangeDensity, onChangeFontSize }) => {
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Keep volatile fields (changed from the shell) in sync without clobbering edits
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      themeMode: settings.themeMode,
      accessibility: settings.accessibility,
      activeShopId: settings.activeShopId,
      currentRole: settings.currentRole,
    }));
  }, [settings.themeMode, settings.accessibility, settings.activeShopId, settings.currentRole]);

  const dirty = isDirty(form, settings);
  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const [addingBranch, setAddingBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const save = async () => {
    setSaving(true);
    try {
      const next: StoreSettings = {
        ...form,
        exchangeRate: form.exchangeRate > 0 ? form.exchangeRate : 4000,
        taxRate: Math.max(0, form.taxRate || 0),
        ownerPin: form.ownerPin && form.ownerPin.length >= 4 ? form.ownerPin : settings.ownerPin || "1234",
      };
      await onUpdateSettings(next);
      setForm(next);
      toast({ title: "Settings saved" });
    } finally {
      setSaving(false);
    }
  };

  const setRoleNow = async (role: UserRole) => {
    await onUpdateSettings({ ...settings, currentRole: role });
  };
  const setShopNow = async (id: number) => {
    await onUpdateSettings({ ...settings, activeShopId: id });
  };

  const createBranch = async () => {
    if (!branchName.trim()) return;
    const id = (await db.shops.add({ name: branchName.trim(), address: branchAddress.trim() || "Branch address", phone: branchPhone.trim() || "", isDefault: false })) as number;
    setBranchName("");
    setBranchAddress("");
    setBranchPhone("");
    setAddingBranch(false);
    await setShopNow(id);
    toast({ title: "Branch added", description: "This device now sells for the new branch." });
  };

  const exportBackup = async () => {
    const allData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: form,
      shops: await db.shops.toArray(),
      categories: await db.categories.toArray(),
      menuItems: await db.menuItems.toArray(),
      orders: await db.orders.toArray(),
      orderItems: await db.orderItems.toArray(),
      shifts: await db.shifts.toArray(),
      cashMovements: await db.cashMovements.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      heldTickets: await db.heldTickets.toArray(),
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fastpos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded" });
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.categories || !data.menuItems) throw new Error("This file doesn't look like a FastPOS backup.");
        const ok = await confirm({
          title: "Restore this backup?",
          message: `Everything on this device will be replaced with the backup from ${data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "an unknown date"}.`,
          confirmLabel: "Restore",
          tone: "warning",
        });
        if (!ok) return;
        await db.transaction("rw", [db.shops, db.categories, db.menuItems, db.orders, db.orderItems, db.shifts, db.cashMovements, db.stockMovements, db.heldTickets], async () => {
          await Promise.all([db.categories.clear(), db.menuItems.clear(), db.orders.clear(), db.orderItems.clear(), db.shifts.clear(), db.cashMovements.clear(), db.stockMovements.clear(), db.heldTickets.clear()]);
          if (data.shops?.length) {
            await db.shops.clear();
            await db.shops.bulkAdd(data.shops);
          }
          if (data.categories?.length) await db.categories.bulkAdd(data.categories);
          if (data.menuItems?.length) await db.menuItems.bulkAdd(data.menuItems);
          if (data.orders?.length) await db.orders.bulkAdd(data.orders);
          if (data.orderItems?.length) await db.orderItems.bulkAdd(data.orderItems);
          if (data.shifts?.length) await db.shifts.bulkAdd(data.shifts);
          if (data.cashMovements?.length) await db.cashMovements.bulkAdd(data.cashMovements);
          if (data.stockMovements?.length) await db.stockMovements.bulkAdd(data.stockMovements);
          if (data.heldTickets?.length) await db.heldTickets.bulkAdd(data.heldTickets);
        });
        if (data.settings) {
          await onUpdateSettings(data.settings);
          setForm(data.settings);
        }
        toast({ title: "Backup restored" });
      } catch (err) {
        toast({ title: "Restore failed", description: (err as Error).message, tone: "error" });
      }
    };
    reader.readAsText(file);
  };

  const resetDemo = async () => {
    const ok = await confirm({
      title: "Reset to demo data?",
      message: "All orders, items, shifts and settings on this device will be replaced with the sample café data. Export a backup first if you need it.",
      confirmLabel: "Reset everything",
      tone: "danger",
    });
    if (!ok) return;
    await seedInitialData(true);
    await onUpdateSettings(DEFAULT_SETTINGS);
    setForm(DEFAULT_SETTINGS);
    toast({ title: "Demo data restored", tone: "info" });
  };

  return (
    <Page narrow className="relative">
      <PageHeader title="Settings" subtitle="Store details, money, receipts and data." />

      {/* Store */}
      <Card>
        <CardHeader icon={<Store />} title="Store" subtitle="Shown on receipts and the KHQR panel." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" className="sm:col-span-2">
            <Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Merchant name (KHQR)">
            <Input value={form.merchantName} onChange={(e) => set("merchantName", e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      {/* Branches */}
      <Card>
        <CardHeader
          icon={<Building2 />}
          title="Branches"
          subtitle="Each branch keeps its own catalog, orders and shifts."
          actions={
            !addingBranch && (
              <Button variant="secondary" size="sm" onClick={() => setAddingBranch(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add branch
              </Button>
            )
          }
        />
        <CardBody className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {shops.map((s) => {
              const active = s.id === settings.activeShopId;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setShopNow(s.id!)} className={cn("press flex w-full items-center gap-3 rounded-2xl border p-3 text-left", active ? "border-brand bg-brand-soft" : "border-line bg-surface-2/40 hover:border-line-strong")}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold", active ? "bg-brand text-white" : "bg-surface-3 text-fg-muted")}>{initialsOf(s.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-fg">{s.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{[s.address, s.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                    {active && <Badge tone="brand">Selling here</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
          {addingBranch && (
            <div className="anim-fade-in grid gap-3 rounded-2xl border border-line bg-surface-2/40 p-3 sm:grid-cols-2">
              <Field label="Branch name" className="sm:col-span-2">
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} autoFocus placeholder="e.g. Riverside Café" />
              </Field>
              <Field label="Address">
                <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} inputMode="tel" />
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button variant="secondary" onClick={() => setAddingBranch(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={createBranch} disabled={!branchName.trim()} fullWidth>
                  Create branch
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Access */}
      <Card>
        <CardHeader icon={<ShieldCheck />} title="Access" subtitle="Cashier mode hides items, analytics and settings." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Current role" hint="Applied immediately.">
            <Segmented<UserRole>
              fullWidth
              aria-label="Role"
              value={settings.currentRole || "owner"}
              onChange={setRoleNow}
              options={[
                { value: "owner", label: "Owner" },
                { value: "cashier", label: "Cashier" },
              ]}
            />
          </Field>
          <Field label="Owner PIN" hint="4–6 digits. Needed to switch back to owner.">
            <Input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={form.ownerPin}
              onChange={(e) => set("ownerPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
              mono
              autoComplete="off"
              rightSlot={
                <Button variant="ghost" size="sm" iconOnly aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((v) => !v)}>
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              }
            />
          </Field>
        </CardBody>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader icon={<Palette />} title="Display" subtitle="Applied immediately on this device." />
        <CardBody>
          <DisplayOptions theme={theme} accessibility={settings.accessibility || { gridCols: 2, fontSize: "normal" }} onChangeTheme={onChangeTheme} onChangeDensity={onChangeDensity} onChangeFontSize={onChangeFontSize} />
        </CardBody>
      </Card>

      {/* Money */}
      <Card>
        <CardHeader icon={<Coins />} title="Currency & tax" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency symbol">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} maxLength={4} mono />
          </Field>
          <Field label="Secondary currency">
            <Input value={form.secondaryCurrency} onChange={(e) => set("secondaryCurrency", e.target.value)} maxLength={4} mono />
          </Field>
          <Field label="Exchange rate" hint={`1 ${form.currency || "$"} = ${(form.exchangeRate || 0).toLocaleString()} ${form.secondaryCurrency || "៛"}`}>
            <Input type="text" inputMode="numeric" value={String(form.exchangeRate ?? "")} onChange={(e) => set("exchangeRate", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} mono />
          </Field>
          <Field label="Tax / VAT rate" hint="Added on top of the subtotal.">
            <Input type="text" inputMode="decimal" value={String(form.taxRate ?? "")} onChange={(e) => set("taxRate", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} suffix="%" mono />
          </Field>
          <div className="sm:col-span-2">
            <Switch checked={form.enableDualCurrency} onChange={(v) => set("enableDualCurrency", v)} label="Show prices in both currencies" description="Displays riel next to dollar amounts on tiles, the ticket and receipts." />
          </div>
        </CardBody>
      </Card>

      {/* Receipts */}
      <Card>
        <CardHeader icon={<ReceiptText />} title="Receipts" subtitle="Printed on 58/80 mm thermal paper." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Header line">
            <Textarea value={form.receiptHeader} onChange={(e) => set("receiptHeader", e.target.value)} rows={2} className="min-h-[3.5rem]" />
          </Field>
          <Field label="Footer line">
            <Textarea value={form.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} rows={2} className="min-h-[3.5rem]" />
          </Field>
          <Field label="KHQR merchant ID" className="sm:col-span-2">
            <Input value={form.khqrMerchantId} onChange={(e) => set("khqrMerchantId", e.target.value)} mono />
          </Field>
        </CardBody>
      </Card>

      {/* Sounds */}
      <Card>
        <CardBody>
          <Switch checked={form.soundEnabled} onChange={(v) => set("soundEnabled", v)} icon={<Volume2 className="h-4 w-4" />} label="Register sounds" description="Short click on add, a chime when a sale completes." />
        </CardBody>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader icon={<Database />} title="Data & backup" subtitle="Everything is stored on this device. Back up regularly." />
        <CardBody className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" size="lg" onClick={exportBackup} leftIcon={<Download className="h-5 w-5" />}>
              Export backup (JSON)
            </Button>
            <Button variant="secondary" size="lg" onClick={() => importRef.current?.click()} leftIcon={<Upload className="h-5 w-5" />}>
              Restore from backup
            </Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-bad/30 bg-bad-soft/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
              <span className="text-fg-muted">Reset wipes all orders, items and shifts on this device and reloads the sample café.</span>
            </div>
            <Button variant="subtle-danger" size="md" onClick={resetDemo} leftIcon={<RotateCcw className="h-4 w-4" />} className="shrink-0">
              Reset to demo
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="text-center text-xs text-fg-subtle">FastPOS Web · offline-first PWA</p>

      {/* Sticky save bar */}
      <div
        className={cn(
          "pointer-events-none sticky bottom-0 z-20 -mx-3 mt-2 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition sm:-mx-5 sm:px-5",
          dirty ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
        aria-hidden={!dirty}
      >
        <div className="pointer-events-auto mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-line bg-surface/95 p-2 pl-4 shadow-pop backdrop-blur">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">You have unsaved changes</span>
          <Button variant="ghost" size="md" onClick={() => setForm({ ...settings })} disabled={!dirty || saving}>
            Discard
          </Button>
          <Button variant="primary" size="md" onClick={save} disabled={!dirty} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
            Save
          </Button>
        </div>
      </div>
      {!dirty && (
        <span className="sr-only" aria-live="polite">
          <CheckCircle2 /> All changes saved
        </span>
      )}
    </Page>
  );
};

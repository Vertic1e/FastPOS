import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Store,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  UserCheck,
  Lock,
  Grid2X2,
  Grid3X3,
  Type,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { db, DEFAULT_SETTINGS, seedInitialData } from "@/db";
import type { StoreSettings, UserRole, FontSizeScale, Shop } from "@/types";

interface SettingsViewProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Shop management state
  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  const handleChange = (field: keyof StoreSettings, val: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setSaveSuccess(false);
  };

  const handleAccessibilityChange = <K extends keyof NonNullable<StoreSettings["accessibility"]>>(
    field: K,
    val: NonNullable<StoreSettings["accessibility"]>[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      accessibility: {
        gridCols: prev.accessibility?.gridCols ?? 2,
        fontSize: prev.accessibility?.fontSize ?? "normal",
        [field]: val,
      },
    }));
    setSaveSuccess(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    const newId = (await db.shops.add({
      name: newBranchName.trim(),
      address: newBranchAddress.trim() || "Branch Address",
      phone: newBranchPhone.trim() || "+855 12 000 000",
      isDefault: false,
    })) as number;

    setFormData((prev) => ({ ...prev, activeShopId: newId }));
    setNewBranchName("");
    setNewBranchAddress("");
    setNewBranchPhone("");
    setIsAddingBranch(false);
  };

  const handleSave = async () => {
    await db.settings.put({ id: "config", data: formData });
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export complete IndexedDB database as timestamped JSON
  const handleExportBackup = async () => {
    const allData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: formData,
      categories: await db.categories.toArray(),
      menuItems: await db.menuItems.toArray(),
      orders: await db.orders.toArray(),
      orderItems: await db.orderItems.toArray(),
      shifts: await db.shifts.toArray(),
      cashMovements: await db.cashMovements.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      heldTickets: await db.heldTickets.toArray(),
    };

    const jsonStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fastpos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);

        if (!data.categories || !data.menuItems) {
          throw new Error("Invalid backup file structure");
        }

        if (confirm("Restore from this backup? Existing records will be replaced.")) {
          await db.categories.clear();
          await db.menuItems.clear();
          await db.orders.clear();
          await db.orderItems.clear();
          await db.shifts.clear();
          await db.cashMovements.clear();
          await db.stockMovements.clear();
          await db.heldTickets.clear();

          if (data.categories?.length) await db.categories.bulkAdd(data.categories);
          if (data.menuItems?.length) await db.menuItems.bulkAdd(data.menuItems);
          if (data.orders?.length) await db.orders.bulkAdd(data.orders);
          if (data.orderItems?.length) await db.orderItems.bulkAdd(data.orderItems);
          if (data.shifts?.length) await db.shifts.bulkAdd(data.shifts);
          if (data.cashMovements?.length) await db.cashMovements.bulkAdd(data.cashMovements);
          if (data.stockMovements?.length) await db.stockMovements.bulkAdd(data.stockMovements);
          if (data.heldTickets?.length) await db.heldTickets.bulkAdd(data.heldTickets);

          if (data.settings) {
            await db.settings.put({ id: "config", data: data.settings });
            onUpdateSettings(data.settings);
            setFormData(data.settings);
          }

          setImportStatus("Database restored successfully!");
          setTimeout(() => setImportStatus(null), 4000);
        }
      } catch (err) {
        alert("Failed to parse backup JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  // Reset to sample demo data
  const handleResetDemo = async () => {
    if (confirm("Reset everything to default Cafe & Restaurant demo data?")) {
      await seedInitialData(true);
      setFormData(DEFAULT_SETTINGS);
      onUpdateSettings(DEFAULT_SETTINGS);
      alert("Store reset to default demo data.");
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Store Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure store profile, currencies, tax rates, thermal receipts, and backups
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully to browser storage!</span>
        </div>
      )}

      {importStatus && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Store Profile */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Store className="w-5 h-5 text-orange-400" />
          <h3 className="font-extrabold text-base text-white">Restaurant Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Store Name</label>
            <input
              type="text"
              value={formData.storeName}
              onChange={(e) => handleChange("storeName", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="col-span-1 sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-300">Physical Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Multi-Shop / Branch Management */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-400" />
            <h3 className="font-extrabold text-base text-white">Multi-Shop & Branches</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingBranch(!isAddingBranch)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-orange-400 font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Branch</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Seamlessly link and switch between different branch locations. Each shop maintains its own isolated catalog and orders.
        </p>

        {isAddingBranch && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Register New Shop Branch</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <input
                type="text"
                placeholder="Branch Name (e.g. Airport Kiosk)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
              <input
                type="text"
                placeholder="Address / Location"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newBranchPhone}
                onChange={(e) => setNewBranchPhone(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingBranch(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBranch}
                className="px-4 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition"
              >
                Save Branch
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {shops.map((s) => {
            const isSelected = (formData.activeShopId || 1) === s.id;
            return (
              <div
                key={s.id}
                onClick={() => handleChange("activeShopId", s.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-orange-500/10 border-orange-500/50"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{s.name}</span>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">{s.address || "No address set"}</p>
                </div>
                <input
                  type="radio"
                  name="activeShop"
                  checked={isSelected}
                  onChange={() => handleChange("activeShopId", s.id)}
                  className="w-4 h-4 text-orange-500 focus:ring-0 cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Role & Security (Owner vs Cashier) */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-orange-400" />
          <h3 className="font-extrabold text-base text-white">Role & Access Control</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Active User Role</label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleChange("currentRole", "owner")}
                className={`p-3 rounded-2xl border font-bold flex flex-col items-center gap-1.5 transition ${
                  formData.currentRole === "owner"
                    ? "bg-orange-500/15 border-orange-500 text-orange-300 shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-orange-400" />
                <span>Owner (Full Access)</span>
              </button>

              <button
                type="button"
                onClick={() => handleChange("currentRole", "cashier")}
                className={`p-3 rounded-2xl border font-bold flex flex-col items-center gap-1.5 transition ${
                  formData.currentRole === "cashier"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Cashier (Register Only)</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Owner Security PIN</label>
            <p className="text-[11px] text-slate-500 mb-1">
              Required to switch from Cashier to Owner mode or access restricted settings (Default: 1234).
            </p>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                maxLength={6}
                value={formData.ownerPin || "1234"}
                onChange={(e) => handleChange("ownerPin", e.target.value)}
                placeholder="4-digit PIN"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold tracking-widest focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Options */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Type className="w-5 h-5 text-indigo-400" />
          <h3 className="font-extrabold text-base text-white">Accessibility & Display Options</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Grid Density */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Item Grid Density</label>
            <p className="text-[11px] text-slate-500 mb-2">
              Choose card layout density optimized for mobile screens and quick tapping.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAccessibilityChange("gridCols", 2)}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                  (formData.accessibility?.gridCols || 2) === 2
                    ? "bg-orange-500/15 border-orange-500 text-orange-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Grid2X2 className="w-4 h-4 text-orange-400" />
                <span>2x2 (Larger Cards)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAccessibilityChange("gridCols", 3)}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition ${
                  formData.accessibility?.gridCols === 3
                    ? "bg-orange-500/15 border-orange-500 text-orange-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Grid3X3 className="w-4 h-4 text-orange-400" />
                <span>3x3 (Compact Grid)</span>
              </button>
            </div>
          </div>

          {/* Font Size Scaling */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Interface Font Size</label>
            <p className="text-[11px] text-slate-500 mb-2">
              Increase typography scale across register, item cards, and orders for enhanced legibility.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAccessibilityChange("fontSize", "normal")}
                className={`p-3 rounded-2xl border font-bold flex flex-col items-center gap-1 transition ${
                  (formData.accessibility?.fontSize || "normal") === "normal"
                    ? "bg-orange-500/15 border-orange-500 text-orange-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-xs">A</span>
                <span className="text-[10px]">Normal</span>
              </button>

              <button
                type="button"
                onClick={() => handleAccessibilityChange("fontSize", "large")}
                className={`p-3 rounded-2xl border font-bold flex flex-col items-center gap-1 transition ${
                  formData.accessibility?.fontSize === "large"
                    ? "bg-orange-500/15 border-orange-500 text-orange-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-sm font-extrabold">A+</span>
                <span className="text-[10px]">Large</span>
              </button>

              <button
                type="button"
                onClick={() => handleAccessibilityChange("fontSize", "xlarge")}
                className={`p-3 rounded-2xl border font-bold flex flex-col items-center gap-1 transition ${
                  formData.accessibility?.fontSize === "xlarge"
                    ? "bg-orange-500/15 border-orange-500 text-orange-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-base font-extrabold">A++</span>
                <span className="text-[10px]">Extra Large</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-base text-white">Currency & Tax Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Primary Currency Symbol</label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Secondary Currency (e.g. KHR)</label>
            <input
              type="text"
              value={formData.secondaryCurrency}
              onChange={(e) => handleChange("secondaryCurrency", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Exchange Rate (1 USD = X KHR)</label>
            <input
              type="number"
              value={formData.exchangeRate}
              onChange={(e) => handleChange("exchangeRate", parseFloat(e.target.value) || 4000)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.taxRate}
              onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="col-span-1 sm:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <span className="font-bold text-slate-200">Enable Dual Currency (USD + KHR)</span>
              <p className="text-[11px] text-slate-500">
                Displays live Cambodian Riel calculations alongside USD on register and receipts
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.enableDualCurrency}
              onChange={(e) => handleChange("enableDualCurrency", e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Receipts & Sound */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Printer className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-base text-white">Thermal Receipt & Audio</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Receipt Header Line</label>
            <input
              type="text"
              value={formData.receiptHeader}
              onChange={(e) => handleChange("receiptHeader", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Receipt Footer Line</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => handleChange("receiptFooter", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 pt-2">
            <div className="flex items-center gap-3">
              {formData.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <span className="font-bold text-slate-200">Synthesized Register Sound Effects</span>
                <p className="text-[11px] text-slate-500">
                  Plays cash drawer ding and click feedback on order checkouts
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.soundEnabled}
              onChange={(e) => handleChange("soundEnabled", e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Data Backup & Portability */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileJson className="w-5 h-5 text-blue-400" />
          <h3 className="font-extrabold text-base text-white">
            Data Portability & Offline Backup
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          FastPOS Web stores all restaurant records inside your browser's IndexedDB. Download a
          full backup JSON file to transfer your catalog to another device or save a daily offline
          backup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Backup JSON</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold transition cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Restore Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetDemo}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

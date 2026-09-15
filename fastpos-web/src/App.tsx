import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, seedInitialData } from "@/db";
import type { StoreSettings } from "@/types";
import { Navbar } from "@/components/layout/Navbar";
import { PosRegister } from "@/components/pos/PosRegister";
import { OrdersList } from "@/components/orders/OrdersList";
import { InventoryManager } from "@/components/inventory/InventoryManager";
import { ShiftManager } from "@/components/shifts/ShiftManager";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";
import { SettingsView } from "@/components/settings/SettingsView";

export function App() {
  const [activeTab, setActiveTab] = useState<
    "pos" | "orders" | "inventory" | "shifts" | "dashboard" | "settings"
  >("pos");
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Settings from DB
  const settingsRecord = useLiveQuery(() => db.settings.get("config"));
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settingsRecord?.data) {
      setSettings(settingsRecord.data);
    }
  }, [settingsRecord]);

  // Active shift
  const shifts = useLiveQuery(() => db.shifts.toArray()) || [];
  const activeShift = shifts.find((s) => s.status === "open");

  // Held tickets count
  const heldTickets = useLiveQuery(() => db.heldTickets.toArray()) || [];

  // Today's orders count
  const orders = useLiveQuery(() => db.orders.toArray()) || [];
  const todayOrderCount = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  // Initialize DB & storage persistence
  useEffect(() => {
    const init = async () => {
      try {
        await seedInitialData();
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(() => {});
        }
      } catch (err) {
        console.error("DB seed error:", err);
      } finally {
        setIsDbReady(true);
      }
    };
    init();

    // Register PWA service worker
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-300">Starting FastPOS Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShift={activeShift}
        heldCount={heldTickets.length}
        onOpenHeldModal={() => setIsHeldModalOpen(true)}
        settings={settings}
        orderCountToday={todayOrderCount}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-y-auto pb-16 lg:pb-0">
        {activeTab === "pos" && (
          <PosRegister
            settings={settings}
            activeShift={activeShift}
            isHeldModalOpen={isHeldModalOpen}
            setIsHeldModalOpen={setIsHeldModalOpen}
          />
        )}

        {activeTab === "orders" && <OrdersList settings={settings} />}

        {activeTab === "inventory" && <InventoryManager settings={settings} />}

        {activeTab === "shifts" && <ShiftManager settings={settings} />}

        {activeTab === "dashboard" && <SalesDashboard settings={settings} />}

        {activeTab === "settings" && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newSet) => setSettings(newSet)}
          />
        )}
      </main>
    </div>
  );
}

export default App;

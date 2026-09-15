import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, seedInitialData } from "@/db";
import type { StoreSettings, UserRole } from "@/types";
import { Navbar } from "@/components/layout/Navbar";
import { PosRegister } from "@/components/pos/PosRegister";
import { OrdersList } from "@/components/orders/OrdersList";
import { InventoryManager } from "@/components/inventory/InventoryManager";
import { ShiftManager } from "@/components/shifts/ShiftManager";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";
import { SettingsView } from "@/components/settings/SettingsView";
import { RoleSwitchModal } from "@/components/common/RoleSwitchModal";
import { ShopSwitchModal } from "@/components/common/ShopSwitchModal";

export function App() {
  const [activeTab, setActiveTab] = useState<
    "pos" | "orders" | "inventory" | "shifts" | "dashboard" | "settings"
  >("pos");
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Settings from DB
  const settingsRecord = useLiveQuery(() => db.settings.get("config"));
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settingsRecord?.data) {
      setSettings(settingsRecord.data);
    }
  }, [settingsRecord]);

  // Shops
  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const activeShop = shops.find((s) => s.id === (settings.activeShopId || 1)) || shops[0];

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
          navigator.storage.persist().catch(() => { });
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
      navigator.serviceWorker.register("./sw.js").catch(() => { });
    }
  }, []);

  const handleUpdateSettings = async (newSet: StoreSettings) => {
    setSettings(newSet);
    await db.settings.put({ id: "config", data: newSet });
  };

  const handleSelectRole = async (role: UserRole) => {
    const next = { ...settings, currentRole: role };
    await handleUpdateSettings(next);
    if (
      role === "cashier" &&
      (activeTab === "inventory" || activeTab === "dashboard" || activeTab === "settings")
    ) {
      setActiveTab("pos");
    }
  };

  const handleSelectShop = async (shopId: number) => {
    const next = { ...settings, activeShopId: shopId };
    await handleUpdateSettings(next);
  };

  const handleToggleGridCols = async () => {
    const currentCols = settings.accessibility?.gridCols || 2;
    const nextCols: 2 | 3 = currentCols === 2 ? 3 : 2;
    const next: StoreSettings = {
      ...settings,
      accessibility: {
        fontSize: settings.accessibility?.fontSize || "normal",
        gridCols: nextCols,
      },
    };
    await handleUpdateSettings(next);
  };

  const handleCycleFontSize = async () => {
    const currentSize = settings.accessibility?.fontSize || "normal";
    const order: ("normal" | "large" | "xlarge")[] = ["normal", "large", "xlarge"];
    const nextIdx = (order.indexOf(currentSize) + 1) % order.length;
    const nextSize = order[nextIdx];
    const next: StoreSettings = {
      ...settings,
      accessibility: {
        gridCols: settings.accessibility?.gridCols || 2,
        fontSize: nextSize,
      },
    };
    await handleUpdateSettings(next);
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-300">Starting FastPOS Engine...</p>
      </div>
    );
  }

  const fontSizeWrapperClass =
    settings.accessibility?.fontSize === "xlarge"
      ? "text-base font-medium"
      : settings.accessibility?.fontSize === "large"
        ? "text-[14px]"
        : "text-sm";

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white ${fontSizeWrapperClass}`}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShift={activeShift}
        heldCount={heldTickets.length}
        onOpenHeldModal={() => setIsHeldModalOpen(true)}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onOpenShopModal={() => setIsShopModalOpen(true)}
        onToggleGridCols={handleToggleGridCols}
        onCycleFontSize={handleCycleFontSize}
        settings={settings}
        activeShop={activeShop}
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
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Modals */}
      {isRoleModalOpen && (
        <RoleSwitchModal
          currentRole={settings.currentRole || "owner"}
          ownerPin={settings.ownerPin || "1234"}
          onClose={() => setIsRoleModalOpen(false)}
          onSelectRole={handleSelectRole}
        />
      )}

      {isShopModalOpen && (
        <ShopSwitchModal
          activeShopId={settings.activeShopId || 1}
          onClose={() => setIsShopModalOpen(false)}
          onSelectShop={handleSelectShop}
        />
      )}
    </div>
  );
}

export default App;

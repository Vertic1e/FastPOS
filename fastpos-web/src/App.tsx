import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, seedInitialData } from "@/db";
import type { StoreSettings, UserRole, FontSizeScale } from "@/types";
import { AppShell } from "@/components/layout/AppShell";
import { OWNER_ONLY_TABS, type TabId } from "@/components/layout/nav";
import { PosRegister } from "@/components/pos/PosRegister";
import { OrdersList } from "@/components/orders/OrdersList";
import { InventoryManager } from "@/components/inventory/InventoryManager";
import { ShiftManager } from "@/components/shifts/ShiftManager";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";
import { SettingsView } from "@/components/settings/SettingsView";
import { RoleSwitchModal } from "@/components/common/RoleSwitchModal";
import { ShopSwitchModal } from "@/components/common/ShopSwitchModal";
import { ToastProvider, ConfirmProvider } from "@/components/ui";
import { applyTheme, applyFontScale, type ThemeMode } from "@/lib/theme";

const isToday = (d: Date | string | number) => new Date(d).toDateString() === new Date().toDateString();

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("pos");
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Settings live in Dexie; keep a local copy for optimistic updates
  const settingsRecord = useLiveQuery(() => db.settings.get("config"));
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    if (settingsRecord?.data) setSettings(settingsRecord.data);
  }, [settingsRecord]);

  // Theme + text scale follow settings (theme is also cached in localStorage for a flash-free boot)
  const theme: ThemeMode = settings.themeMode === "light" ? "light" : "dark";
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    applyFontScale(settings.accessibility?.fontSize || "normal");
  }, [settings.accessibility?.fontSize]);

  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const activeShop = shops.find((s) => s.id === (settings.activeShopId || 1)) || shops[0];

  const shifts = useLiveQuery(() => db.shifts.toArray()) || [];
  const activeShift = shifts.find((s) => s.status === "open");

  const heldTickets = useLiveQuery(() => db.heldTickets.toArray()) || [];
  const orders = useLiveQuery(() => db.orders.toArray()) || [];
  const { todayOrderCount, todaySales } = useMemo(() => {
    const todays = orders.filter((o) => isToday(o.createdAt) && o.status === "completed");
    return { todayOrderCount: todays.length, todaySales: todays.reduce((s, o) => s + o.total, 0) };
  }, [orders]);

  // Boot: seed DB, request persistent storage, register the service worker
  useEffect(() => {
    const init = async () => {
      try {
        await seedInitialData();
        if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
      } catch (err) {
        console.error("DB seed error:", err);
      } finally {
        setIsDbReady(true);
      }
    };
    void init();
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }, []);

  // Cashiers can't stay on owner-only screens
  useEffect(() => {
    if (settings.currentRole === "cashier" && OWNER_ONLY_TABS.includes(activeTab)) setActiveTab("pos");
  }, [settings.currentRole, activeTab]);

  const handleUpdateSettings = async (next: StoreSettings) => {
    setSettings(next);
    await db.settings.put({ id: "config", data: next });
  };

  const handleSelectRole = async (role: UserRole) => {
    await handleUpdateSettings({ ...settings, currentRole: role });
  };
  const handleSelectShop = async (shopId: number) => {
    await handleUpdateSettings({ ...settings, activeShopId: shopId });
  };
  const handleChangeTheme = (mode: ThemeMode) => {
    applyTheme(mode);
    void handleUpdateSettings({ ...settings, themeMode: mode });
  };
  const handleChangeDensity = (cols: 2 | 3) => {
    void handleUpdateSettings({
      ...settings,
      accessibility: { fontSize: settings.accessibility?.fontSize || "normal", gridCols: cols },
    });
  };
  const handleChangeFontSize = (size: FontSizeScale) => {
    applyFontScale(size);
    void handleUpdateSettings({
      ...settings,
      accessibility: { gridCols: settings.accessibility?.gridCols || 2, fontSize: size },
    });
  };

  if (!isDbReady) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-bg text-fg-muted">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm font-semibold">Starting FastPOS…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="h-dvh w-full overflow-hidden bg-bg text-fg selection:bg-brand selection:text-white">
          <AppShell
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            settings={settings}
            theme={theme}
            activeShop={activeShop}
            activeShift={activeShift}
            heldCount={heldTickets.length}
            orderCountToday={todayOrderCount}
            salesToday={todaySales}
            onOpenHeldModal={() => {
              setActiveTab("pos");
              setIsHeldModalOpen(true);
            }}
            onOpenRoleModal={() => setIsRoleModalOpen(true)}
            onOpenShopModal={() => setIsShopModalOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onChangeTheme={handleChangeTheme}
            onChangeDensity={handleChangeDensity}
            onChangeFontSize={handleChangeFontSize}
          >
            {activeTab === "pos" && (
              <PosRegister
                settings={settings}
                activeShift={activeShift}
                isHeldModalOpen={isHeldModalOpen}
                setIsHeldModalOpen={setIsHeldModalOpen}
                isShortcutsOpen={isShortcutsOpen}
                setIsShortcutsOpen={setIsShortcutsOpen}
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
                theme={theme}
                onChangeTheme={handleChangeTheme}
                onChangeDensity={handleChangeDensity}
                onChangeFontSize={handleChangeFontSize}
              />
            )}
          </AppShell>

          <RoleSwitchModal
            open={isRoleModalOpen}
            currentRole={settings.currentRole || "owner"}
            ownerPin={settings.ownerPin || "1234"}
            onClose={() => setIsRoleModalOpen(false)}
            onSelectRole={handleSelectRole}
          />
          <ShopSwitchModal
            open={isShopModalOpen}
            activeShopId={settings.activeShopId || 1}
            onClose={() => setIsShopModalOpen(false)}
            onSelectShop={handleSelectShop}
          />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

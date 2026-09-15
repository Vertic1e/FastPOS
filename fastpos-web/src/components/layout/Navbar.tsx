import React, { useState, useEffect } from "react";
import {
  Store,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  PauseCircle,
  MoreHorizontal,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  Grid2X2,
  Grid3X3,
  Type,
} from "lucide-react";
import type { Shift, StoreSettings, UserRole, Shop } from "@/types";

interface NavbarProps {
  activeTab: "pos" | "orders" | "inventory" | "shifts" | "dashboard" | "settings";
  setActiveTab: (tab: "pos" | "orders" | "inventory" | "shifts" | "dashboard" | "settings") => void;
  activeShift?: Shift;
  heldCount: number;
  onOpenHeldModal: () => void;
  onOpenRoleModal: () => void;
  onOpenShopModal: () => void;
  onToggleGridCols: () => void;
  onCycleFontSize: () => void;
  settings: StoreSettings;
  activeShop?: Shop;
  orderCountToday: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeShift,
  heldCount,
  onOpenHeldModal,
  onOpenRoleModal,
  onOpenShopModal,
  onToggleGridCols,
  onCycleFontSize,
  settings,
  activeShop,
  orderCountToday,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isOwner = settings.currentRole === "owner";
  const gridCols = settings.accessibility?.gridCols || 2;
  const fontSize = settings.accessibility?.fontSize || "normal";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <>
      {/* Top Header */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-850 sticky top-0 z-30 select-none pt-safe">
        <div className="px-3 sm:px-4 flex items-center justify-between h-12">
          {/* Shop Switcher & Role */}
          <div className="flex items-center gap-2">
            {/* Shop Switch Button */}
            <button
              onClick={onOpenShopModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 transition cursor-pointer"
              title="Switch Shop / Branch"
            >
              <Store className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-extrabold text-xs text-white max-w-[120px] sm:max-w-[180px] truncate">
                {activeShop?.name || settings.storeName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Role Badge (Owner vs Cashier) */}
            <button
              onClick={onOpenRoleModal}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border active:scale-95 transition cursor-pointer ${
                isOwner
                  ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              }`}
              title="Click to switch role (Owner / Cashier)"
            >
              {isOwner ? (
                <ShieldCheck className="w-3 h-3 text-orange-400" />
              ) : (
                <UserCheck className="w-3 h-3 text-emerald-400" />
              )}
              <span className="capitalize">{settings.currentRole}</span>
            </button>
          </div>

          {/* Right Controls: Accessibility, Shift status, Held, Fullscreen */}
          <div className="flex items-center gap-1.5">
            {/* Accessibility Quick Grid Toggle (2x2 vs 3x3) */}
            <button
              onClick={onToggleGridCols}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1 active:scale-95 transition"
              title="Toggle Grid (2 columns vs 3 columns)"
            >
              {gridCols === 2 ? <Grid2X2 className="w-3 h-3 text-orange-400" /> : <Grid3X3 className="w-3 h-3 text-orange-400" />}
              <span>{gridCols}x{gridCols}</span>
            </button>

            {/* Font scale toggle button */}
            <button
              onClick={onCycleFontSize}
              className={`px-1.5 py-1 rounded-lg border text-[10px] font-bold uppercase transition active:scale-95 ${
                fontSize !== "normal"
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
              title={`Font Size: ${fontSize}`}
            >
              <Type className="w-3 h-3 inline mr-0.5" />
              <span>{fontSize === "normal" ? "A" : fontSize === "large" ? "A+" : "A++"}</span>
            </button>

            {/* Held Orders Badge */}
            {heldCount > 0 && (
              <button
                onClick={onOpenHeldModal}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold active:scale-95 transition animate-pulse"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{heldCount}</span>
              </button>
            )}

            {/* Offline Alert Badge */}
            {!isOnline && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                <WifiOff className="w-3 h-3 text-rose-400 animate-bounce" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-lg text-slate-400 hover:text-white active:bg-slate-800 transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile-First Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-850 select-none pb-safe">
        <nav className="flex items-center justify-around h-14 max-w-md mx-auto px-1">
          {/* Register */}
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === "pos"
                ? "text-orange-400 font-bold scale-105"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store className={`w-5 h-5 mb-0.5 ${activeTab === "pos" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px]">Register</span>
          </button>

          {/* Orders */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === "orders"
                ? "text-orange-400 font-bold scale-105"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className={`w-5 h-5 mb-0.5 ${activeTab === "orders" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px]">Orders</span>
            {orderCountToday > 0 && (
              <span className="absolute top-0.5 right-4 w-4 h-4 bg-orange-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
                {orderCountToday}
              </span>
            )}
          </button>

          {/* Items (Only visible or accessible to Owner) */}
          {isOwner && (
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                activeTab === "inventory"
                  ? "text-orange-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className={`w-5 h-5 mb-0.5 ${activeTab === "inventory" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              <span className="text-[10px]">Items</span>
            </button>
          )}

          {/* Shift */}
          <button
            onClick={() => setActiveTab("shifts")}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === "shifts"
                ? "text-orange-400 font-bold scale-105"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className={`w-5 h-5 mb-0.5 ${activeTab === "shifts" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px]">Shift</span>
          </button>

          {/* More Menu (Analytics & Settings) */}
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => {
                if (!isOwner) {
                  // Prompt to switch to Owner
                  onOpenRoleModal();
                } else {
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                }
              }}
              className={`flex flex-col items-center justify-center w-full py-1 transition-all ${
                activeTab === "dashboard" || activeTab === "settings"
                  ? "text-orange-400 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MoreHorizontal className={`w-5 h-5 mb-0.5 ${(activeTab === "dashboard" || activeTab === "settings") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              <span className="text-[10px]">{isOwner ? "More" : "Admin"}</span>
            </button>

            {/* Popup Menu */}
            {isMoreMenuOpen && isOwner && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute bottom-14 right-2 z-50 w-44 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl space-y-1 animate-in fade-in slide-in-from-bottom-2">
                  <button
                    onClick={() => {
                      setActiveTab("dashboard");
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "dashboard" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("settings");
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "settings" ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
};

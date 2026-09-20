import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PauseCircle,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserCheck,
  WifiOff,
  Moon,
  Sun,
  Keyboard,
  Lock,
} from "lucide-react";
import type { AccessibilitySettings, FontSizeScale, Shift, Shop, StoreSettings } from "@/types";
import type { ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { Modal, Button } from "@/components/ui";
import { NAV_ITEMS, initialsOf, type TabId } from "./nav";
import { DisplayOptions } from "./DisplayOptions";

export interface AppShellProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  settings: StoreSettings;
  theme: ThemeMode;
  activeShop?: Shop;
  activeShift?: Shift;
  heldCount: number;
  orderCountToday: number;
  salesToday: number;
  onOpenHeldModal: () => void;
  onOpenRoleModal: () => void;
  onOpenShopModal: () => void;
  onOpenShortcuts: () => void;
  onChangeTheme: (mode: ThemeMode) => void;
  onChangeDensity: (cols: 2 | 3) => void;
  onChangeFontSize: (size: FontSizeScale) => void;
  children: React.ReactNode;
}

function useOnline() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return isOnline;
}

function useFullscreen() {
  const supported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };
  return { supported, isFull, toggle };
}

/* --------------------------------- Shell ---------------------------------- */
export const AppShell: React.FC<AppShellProps> = (props) => {
  const { activeTab, setActiveTab, settings, children } = props;
  const isOwner = settings.currentRole === "owner";
  const isOnline = useOnline();
  const fullscreen = useFullscreen();
  const [moreOpen, setMoreOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((n) => !n.ownerOnly || isOwner);
  // Bottom bar shows at most 4 primary tabs + "More"
  const bottomTabs = visibleNav.filter((n) => ["pos", "orders", "inventory", "shifts"].includes(n.id));
  const accessibility: AccessibilitySettings = settings.accessibility || { gridCols: 2, fontSize: "normal" };

  const go = (tab: TabId) => {
    setActiveTab(tab);
    setMoreOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg text-fg rail:flex-row">
      {/* ------------------------------ Navigation rail (desktop / landscape) ------------------------------ */}
      <nav
        className="hidden w-[4.75rem] shrink-0 flex-col items-center border-r border-line bg-surface pb-safe pl-safe pt-safe rail:flex short:w-[4.25rem]"
        aria-label="Primary"
      >
        <button
          type="button"
          onClick={props.onOpenShopModal}
          title={`${props.activeShop?.name || settings.storeName} — switch shop`}
          className="press mt-2 flex w-full flex-col items-center gap-1 px-1 py-2 short:mt-1 short:py-1"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-base font-extrabold text-white shadow-md shadow-brand/30 short:h-9 short:w-9 short:text-sm">
            {initialsOf(props.activeShop?.name || settings.storeName)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide",
              isOwner ? "bg-brand-soft text-brand-text" : "bg-ok-soft text-ok"
            )}
          >
            {isOwner ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
            <span className="short:hidden">{settings.currentRole}</span>
          </span>
        </button>

        <div className="mt-2 flex w-full flex-1 flex-col items-stretch gap-1 overflow-y-auto px-1.5 no-scrollbar short:mt-1 short:gap-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge = item.id === "orders" && props.orderCountToday > 0 ? props.orderCountToday : 0;
            return (
              <button
                key={item.id}
                type="button"
                data-nav={item.id}
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[0.6875rem] font-semibold transition tall:gap-1 tall:py-2 short:gap-0 short:py-1",
                  active ? "text-brand-text" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition short:h-7 short:w-10",
                    active && "bg-brand-soft"
                  )}
                >
                  <Icon className={cn("h-5.5 w-5.5 short:h-5 short:w-5", active && "stroke-[2.4]")} />
                </span>
                <span className="short:hidden">{item.label}</span>
                {badge > 0 && (
                  <span className="num absolute right-1.5 top-1 min-w-5 rounded-full bg-brand px-1 text-center text-[0.625rem] font-extrabold leading-5 text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-col items-center gap-0.5 px-1.5 pb-2">
          {props.heldCount > 0 && (
            <RailIconButton label={`Held tickets (${props.heldCount})`} onClick={props.onOpenHeldModal} tone="warning">
              <PauseCircle />
              <span className="num absolute -right-0.5 -top-0.5 min-w-4.5 rounded-full bg-amber-500 px-1 text-center text-[0.625rem] font-extrabold leading-4.5 text-slate-950">
                {props.heldCount}
              </span>
            </RailIconButton>
          )}
          {!isOnline && (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bad-soft text-bad" title="Offline — sales are saved on this device">
              <WifiOff className="h-5 w-5" />
            </span>
          )}
          <RailIconButton
            label={props.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => props.onChangeTheme(props.theme === "dark" ? "light" : "dark")}
            data-theme-toggle
            className="hidden tall:flex"
          >
            {props.theme === "dark" ? <Sun /> : <Moon />}
          </RailIconButton>
          <RailIconButton label="Display options" onClick={() => setDisplayOpen(true)}>
            <SlidersHorizontal />
          </RailIconButton>
          <RailIconButton label="Keyboard shortcuts" onClick={props.onOpenShortcuts} className="hidden tall:flex">
            <Keyboard />
          </RailIconButton>
          {fullscreen.supported && (
            <RailIconButton label={fullscreen.isFull ? "Exit fullscreen" : "Fullscreen"} onClick={fullscreen.toggle} className="short:hidden">
              {fullscreen.isFull ? <Minimize2 /> : <Maximize2 />}
            </RailIconButton>
          )}
        </div>
      </nav>

      {/* ------------------------------ Main column ------------------------------ */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar (phones / tablets in portrait) */}
        <header className="z-30 shrink-0 border-b border-line bg-surface/95 px-safe pt-safe backdrop-blur-md rail:hidden">
          <div className="flex h-14 items-center gap-2 px-2 sm:px-3">
            <button
              type="button"
              onClick={props.onOpenShopModal}
              className="press flex h-11 min-w-0 max-w-[60%] items-center gap-2 rounded-xl px-2 text-left hover:bg-surface-2"
              title="Switch shop / branch"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-extrabold text-white">
                {initialsOf(props.activeShop?.name || settings.storeName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight text-fg">
                  {props.activeShop?.name || settings.storeName}
                </span>
                <span className="block truncate text-[0.6875rem] font-medium leading-tight text-fg-subtle">
                  {props.activeShift ? `Shift open · ${props.activeShift.openedBy}` : "No shift open"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-fg-subtle" />
            </button>

            <button
              type="button"
              onClick={props.onOpenRoleModal}
              className={cn(
                "press inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-bold capitalize",
                isOwner ? "border-brand/30 bg-brand-soft text-brand-text" : "border-ok/30 bg-ok-soft text-ok"
              )}
              title="Switch role"
            >
              {isOwner ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
              <span className="hidden min-[360px]:inline">{settings.currentRole}</span>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              {!isOnline && (
                <span className="flex h-9 items-center gap-1 rounded-lg bg-bad-soft px-2 text-xs font-bold text-bad" title="Offline — sales are saved on this device">
                  <WifiOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
              {props.heldCount > 0 && (
                <button
                  type="button"
                  onClick={props.onOpenHeldModal}
                  className="press flex h-10 items-center gap-1.5 rounded-xl bg-warn-soft px-2.5 text-sm font-bold text-warn"
                  title="Held tickets"
                >
                  <PauseCircle className="h-4.5 w-4.5" />
                  <span className="num">{props.heldCount}</span>
                </button>
              )}
              <div className="hidden flex-col items-end px-1 leading-tight sm:flex">
                <span className="text-[0.625rem] font-bold uppercase tracking-wide text-fg-subtle">Today</span>
                <span className="num text-sm font-bold text-ok">{money(props.salesToday, settings.currency)}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-safe">{children}</main>
      </div>

      {/* ------------------------------ Bottom tab bar (phones / portrait tablets) ------------------------------ */}
      <nav
        className="z-30 shrink-0 border-t border-line bg-surface/95 pb-safe px-safe backdrop-blur-md rail:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid h-16 max-w-xl px-1" style={{ gridTemplateColumns: `repeat(${bottomTabs.length + 1}, minmax(0, 1fr))` }}>
          {bottomTabs.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge = item.id === "orders" && props.orderCountToday > 0 ? props.orderCountToday : 0;
            return (
              <button
                key={item.id}
                type="button"
                data-nav={item.id}
                onClick={() => go(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press relative flex flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold",
                  active ? "text-brand-text" : "text-fg-muted"
                )}
              >
                <span className={cn("relative flex h-8 w-14 items-center justify-center rounded-full transition", active && "bg-brand-soft")}>
                  <Icon className={cn("h-5.5 w-5.5", active && "stroke-[2.4]")} />
                  {badge > 0 && (
                    <span className="num absolute -right-0.5 -top-1 min-w-4.5 rounded-full bg-brand px-1 text-center text-[0.625rem] font-extrabold leading-4.5 text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            data-nav="more"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "press relative flex flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold",
              activeTab === "dashboard" || activeTab === "settings" ? "text-brand-text" : "text-fg-muted"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full transition",
                (activeTab === "dashboard" || activeTab === "settings") && "bg-brand-soft"
              )}
            >
              <MoreHorizontal className="h-5.5 w-5.5" />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ------------------------------ "More" sheet ------------------------------ */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm" bodyClassName="p-3 sm:p-4">
        <div className="flex flex-col gap-4">
          {(isOwner || props.heldCount > 0) && (
            <div className="grid grid-cols-1 gap-2">
              {isOwner &&
                NAV_ITEMS.filter((n) => n.id === "dashboard" || n.id === "settings").map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-nav={item.id}
                      onClick={() => go(item.id)}
                      className={cn(
                        "press flex h-14 items-center gap-3 rounded-2xl border px-3 text-left",
                        active ? "border-brand/40 bg-brand-soft text-brand-text" : "border-line bg-surface-2/60 text-fg hover:border-line-strong"
                      )}
                    >
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", active ? "bg-brand text-white" : "bg-surface-3 text-fg-muted")}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-base font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              {props.heldCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    props.onOpenHeldModal();
                  }}
                  className="press flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-3 text-left text-fg hover:border-line-strong"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warn-soft text-warn">
                    <PauseCircle className="h-5 w-5" />
                  </span>
                  <span className="text-base font-semibold">Held tickets</span>
                  <span className="num ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-extrabold text-slate-950">{props.heldCount}</span>
                </button>
              )}
            </div>
          )}

          {!isOwner && (
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                props.onOpenRoleModal();
              }}
              className="press flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-3 text-left text-fg hover:border-line-strong"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
                <Lock className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-semibold">Unlock owner tools</span>
                <span className="block text-xs text-fg-subtle">Items, analytics and settings need the owner PIN</span>
              </span>
            </button>
          )}

          <div className="rounded-2xl border border-line bg-surface-2/40 p-3">
            <DisplayOptions
              compact
              theme={props.theme}
              accessibility={accessibility}
              onChangeTheme={props.onChangeTheme}
              onChangeDensity={props.onChangeDensity}
              onChangeFontSize={props.onChangeFontSize}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" leftIcon={<Store className="h-4.5 w-4.5" />} onClick={() => { setMoreOpen(false); props.onOpenShopModal(); }}>
              <span className="truncate">Switch shop</span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={isOwner ? <ShieldCheck className="h-4.5 w-4.5" /> : <UserCheck className="h-4.5 w-4.5" />}
              onClick={() => { setMoreOpen(false); props.onOpenRoleModal(); }}
            >
              <span className="truncate">Switch role</span>
            </Button>
            {fullscreen.supported && (
              <Button
                variant="secondary"
                size="lg"
                className="col-span-2"
                leftIcon={fullscreen.isFull ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
                onClick={fullscreen.toggle}
              >
                {fullscreen.isFull ? "Exit fullscreen" : "Fullscreen mode"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* ------------------------------ Display options (rail) ------------------------------ */}
      <Modal open={displayOpen} onClose={() => setDisplayOpen(false)} title="Display options" size="sm" icon={<SlidersHorizontal />}>
        <DisplayOptions
          theme={props.theme}
          accessibility={accessibility}
          onChangeTheme={props.onChangeTheme}
          onChangeDensity={props.onChangeDensity}
          onChangeFontSize={props.onChangeFontSize}
        />
      </Modal>
    </div>
  );
};

const RailIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "warning" }
> = ({ label, tone, className, children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      "press relative flex h-10 w-10 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg [&>svg]:h-5 [&>svg]:w-5",
      tone === "warning" && "bg-warn-soft text-warn",
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

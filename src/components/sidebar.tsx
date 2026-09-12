"use client";

import {
  Flame,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Package,
  ReceiptText,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { FastPOSLogo } from "@/components/fastpos-logo";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { initials } from "@/lib/format";
import type { UserPermissions } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";

const ROLE_META: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "text-amber-400" },
  manager: { label: "Manager", color: "text-violet-400" },
  sale: { label: "Sale", color: "text-sky-400" },
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permKey?: string;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permKey: "can_access_dashboard" },
  { href: "/pos", label: "Point of Sale", icon: MonitorSmartphone, permKey: "can_access_pos" },
  { href: "/inventory", label: "Inventory", icon: Package, permKey: "can_access_inventory" },
  { href: "/orders", label: "Orders", icon: ReceiptText, permKey: "can_access_orders" },
  { href: "/settings", label: "Settings", icon: Settings2, permKey: "can_access_settings" },
  { href: "/staff", label: "Staff", icon: Users, ownerOnly: true },
];

export function Sidebar({
  user,
  storeName,
  lowStockCount,
  currency = "$",
  secondaryCurrency = "KHR",
  exchangeRate = 4000,
  enableDualCurrency = true,
  permissions,
}: {
  user: { name: string; email: string; role: string };
  storeName: string;
  lowStockCount: number;
  currency?: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  enableDualCurrency?: boolean;
  permissions: UserPermissions;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const roleMeta = ROLE_META[user.role] ?? ROLE_META.sale;

  const visibleNav = NAV.filter((item) => {
    if (item.ownerOnly) return user.role === "owner";
    if (item.permKey) return hasPermission(permissions, user.role, item.permKey as keyof UserPermissions);
    return true;
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-coal text-cream lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <FastPOSLogo size={40} variant="badge" />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">
              {storeName}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-cream/35">
              Point of Sale
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-cream/45 hover:bg-white/[0.04] hover:text-cream"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <item.icon
                  size={17}
                  strokeWidth={active ? 2.25 : 2}
                  className={active ? "text-white" : "text-cream/40 group-hover:text-cream/70"}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/inventory" && lowStockCount > 0 && (
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {lowStockCount} low
                  </span>
                )}
                {item.href === "/pos" && !active && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
          {enableDualCurrency ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cream/60">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400">
                ៛
              </span>
              <span>1 {currency} = {exchangeRate.toLocaleString()} {secondaryCurrency}</span>
            </div>
          ) : <div />}
          <FontSizeToggle className="!border-white/10 !bg-white/10 text-white" />
        </div>

        <div className="mx-3 mb-3 rounded-2xl bg-white/[0.04] p-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className={`text-[11px] font-semibold ${roleMeta.color}`}>{roleMeta.label}</p>
            </div>
            <button
              onClick={() => startTransition(() => logoutAction())}
              disabled={pending}
              title="Sign out"
              className="rounded-lg p-2 text-cream/40 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-paper/90 px-3 backdrop-blur lg:hidden">
        <FastPOSLogo size={32} variant="badge" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-semibold">{storeName}</p>
          {enableDualCurrency && (
            <p className="text-[10px] font-medium text-ink/45">
              1 {currency} = {exchangeRate.toLocaleString()} {secondaryCurrency}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${roleMeta.color}`}>
          {roleMeta.label}
        </span>
        <FontSizeToggle className="scale-90" />
        <button
          onClick={() => startTransition(() => logoutAction())}
          className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {visibleNav.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-ink" : "text-ink/35"
              }`}
            >
              {active && (
                <span
                  className="absolute -top-px h-0.5 w-8 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <item.icon size={19} strokeWidth={active ? 2.25 : 1.9} />
              {item.label === "Point of Sale" ? "POS" : item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

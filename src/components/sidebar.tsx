"use client";

import {
  Flame,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Package,
  ReceiptText,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Point of Sale", icon: MonitorSmartphone },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/orders", label: "Orders", icon: ReceiptText },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar({
  user,
  storeName,
  lowStockCount,
  currency = "$",
  secondaryCurrency = "KHR",
  exchangeRate = 4000,
  enableDualCurrency = true,
}: {
  user: { name: string; email: string };
  storeName: string;
  lowStockCount: number;
  currency?: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  enableDualCurrency?: boolean;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-coal text-cream lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
          >
            <Flame size={19} strokeWidth={2.25} />
          </div>
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
          {NAV.map((item) => {
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
              <p className="truncate text-[11px] text-cream/40">{user.email}</p>
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
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
        >
          <Flame size={15} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-semibold">{storeName}</p>
          {enableDualCurrency && (
            <p className="text-[10px] font-medium text-ink/45">
              1 {currency} = {exchangeRate.toLocaleString()} {secondaryCurrency}
            </p>
          )}
        </div>
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
        {NAV.map((item) => {
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

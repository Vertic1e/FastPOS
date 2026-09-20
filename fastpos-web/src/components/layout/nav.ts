import {
  Store,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export type TabId = "pos" | "orders" | "inventory" | "shifts" | "dashboard" | "settings";

export interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "pos", label: "Register", icon: Store },
  { id: "orders", label: "Orders", icon: Receipt },
  { id: "inventory", label: "Items", icon: Package, ownerOnly: true },
  { id: "shifts", label: "Shift", icon: Layers },
  { id: "dashboard", label: "Analytics", icon: BarChart3, ownerOnly: true },
  { id: "settings", label: "Settings", icon: SettingsIcon, ownerOnly: true },
];

export const OWNER_ONLY_TABS: TabId[] = NAV_ITEMS.filter((n) => n.ownerOnly).map((n) => n.id);

export function initialsOf(name: string): string {
  const parts = name
    .replace(/[—–-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

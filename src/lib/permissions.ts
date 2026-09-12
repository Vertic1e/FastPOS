import type { UserPermissions } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Permission keys & labels                                            */
/* ------------------------------------------------------------------ */

export const PERMISSION_KEYS = [
  "can_access_pos",
  "can_access_orders",
  "can_access_inventory",
  "can_access_dashboard",
  "can_access_settings",
  "can_refund",
  "can_manage_items",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; description: string }> = {
  can_access_pos: { label: "Point of Sale", description: "Access the register to take orders" },
  can_access_orders: { label: "Orders", description: "View order history and receipts" },
  can_access_inventory: { label: "Inventory", description: "View and manage stock levels" },
  can_access_dashboard: { label: "Dashboard", description: "View sales analytics and reports" },
  can_access_settings: { label: "Settings", description: "Change store configuration" },
  can_refund: { label: "Refunds", description: "Issue refunds on completed orders" },
  can_manage_items: { label: "Menu Management", description: "Add, edit, and delete menu items" },
};

/* ------------------------------------------------------------------ */
/* Default permissions per role                                        */
/* ------------------------------------------------------------------ */

export const OWNER_PERMISSIONS: UserPermissions = {
  can_access_pos: true,
  can_access_orders: true,
  can_access_inventory: true,
  can_access_dashboard: true,
  can_access_settings: true,
  can_refund: true,
  can_manage_items: true,
};

export const MANAGER_PERMISSIONS: UserPermissions = {
  can_access_pos: true,
  can_access_orders: true,
  can_access_inventory: true,
  can_access_dashboard: true,
  can_access_settings: false,
  can_refund: true,
  can_manage_items: true,
};

export const SALE_PERMISSIONS: UserPermissions = {
  can_access_pos: true,
  can_access_orders: true,
  can_access_inventory: false,
  can_access_dashboard: false,
  can_access_settings: false,
  can_refund: false,
  can_manage_items: false,
};

export const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  owner: OWNER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  sale: SALE_PERMISSIONS,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function hasPermission(
  permissions: UserPermissions | null | undefined,
  role: string,
  key: PermissionKey,
): boolean {
  // Owner always has all permissions
  if (role === "owner") return true;
  if (!permissions) return false;
  return permissions[key] === true;
}

export function mergeWithDefaults(
  role: string,
  permissions: Partial<UserPermissions> | null,
): UserPermissions {
  const defaults = DEFAULT_PERMISSIONS[role] ?? SALE_PERMISSIONS;
  if (!permissions) return defaults;
  return { ...defaults, ...permissions };
}

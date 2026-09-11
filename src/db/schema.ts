import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ModifierOption = { name: string; price: number };
export type ModifierGroup = {
  name: string;
  required: boolean;
  options: ModifierOption[];
};
export type SelectedModifier = { group: string; option: string; price: number };

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#E85D26"),
  icon: text("icon").notNull().default("utensils"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  sku: text("sku"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  lowStockAt: integer("low_stock_at").notNull().default(10),
  trackStock: boolean("track_stock").notNull().default(true),
  color: text("color").notNull().default("#E85D26"),
  modifiers: jsonb("modifiers")
    .$type<ModifierGroup[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: integer("order_number").notNull(),
  status: text("status").notNull().default("completed"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  cashReceived: numeric("cash_received", { precision: 10, scale: 2 }),
  changeDue: numeric("change_due", { precision: 10, scale: 2 }),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 2 }),
  totalKhr: numeric("total_khr", { precision: 14, scale: 2 }),
  cashReceivedKhr: numeric("cash_received_khr", { precision: 14, scale: 2 }),
  changeDueKhr: numeric("change_due_khr", { precision: 14, scale: 2 }),
  itemCount: integer("item_count").notNull().default(0),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  cashierName: text("cashier_name"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  qty: integer("qty").notNull(),
  modifiers: jsonb("modifiers")
    .$type<SelectedModifier[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  note: text("note"),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Stock & settings                                                    */
/* ------------------------------------------------------------------ */

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull().default("adjustment"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("Bistro Lumen"),
  address: text("address").notNull().default("128 Ember Street, Portland, OR"),
  phone: text("phone").notNull().default("(503) 555-0182"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("8.25"),
  currency: text("currency").notNull().default("$"),
  secondaryCurrency: text("secondary_currency").notNull().default("KHR"),
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 2 })
    .notNull()
    .default("4000"),
  enableDualCurrency: boolean("enable_dual_currency").notNull().default(true),
  fontSize: text("font_size").notNull().default("normal"),
  receiptHeader: text("receipt_header")
    .notNull()
    .default("Thank you for dining with us"),
  receiptFooter: text("receipt_footer")
    .notNull()
    .default("Follow us @bistrolumen — see you soon!"),
  accent: text("accent").notNull().default("flame"),
  posColumns: integer("pos_columns").notNull().default(3),
  categoryChips: boolean("category_chips").notNull().default(true),
});

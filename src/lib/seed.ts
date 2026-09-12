import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  menuItems,
  orderItems,
  orders,
  settings,
  stockMovements,
  users,
  type ModifierGroup,
  type SelectedModifier,
} from "@/db/schema";
import { mulberry32, round2 } from "@/lib/format";
import { OWNER_PERMISSIONS, MANAGER_PERMISSIONS, SALE_PERMISSIONS } from "@/lib/permissions";

const TAX_RATE = 8.25;

/* ------------------------------------------------------------------ */
/* Catalog definition                                                  */
/* ------------------------------------------------------------------ */

const CATS = [
  { name: "Burgers", color: "#F59E0B", icon: "beef" },
  { name: "Wood-Fired Pizza", color: "#EF4444", icon: "pizza" },
  { name: "Salads & Greens", color: "#10B981", icon: "salad" },
  { name: "Sides & Snacks", color: "#8B5CF6", icon: "fries" },
  { name: "Drinks", color: "#0EA5E9", icon: "cup-soda" },
  { name: "Desserts", color: "#EC4899", icon: "cake-slice" },
];

type ItemDef = {
  name: string;
  price: number;
  cost: number;
  stock: number;
  low?: number;
  track?: boolean;
  modifiers?: ModifierGroup[];
  cat: number;
};

const sizeGroup = (
  options: { name: string; price: number }[],
): ModifierGroup => ({ name: "Size", required: true, options });

const ITEMS: ItemDef[] = [
  // Burgers
  {
    name: "Classic Smash", price: 12.5, cost: 4.1, stock: 58, cat: 0,
    modifiers: [
      { name: "Doneness", required: true, options: [{ name: "Medium", price: 0 }, { name: "Medium-well", price: 0 }, { name: "Well done", price: 0 }] },
      { name: "Add-ons", required: false, options: [{ name: "Aged cheddar", price: 1.5 }, { name: "Smoked bacon", price: 2 }, { name: "Avocado", price: 2.25 }, { name: "Fried egg", price: 1.5 }] },
    ],
  },
  {
    name: "Lumen Double", price: 15.9, cost: 5.6, stock: 42, cat: 0,
    modifiers: [
      { name: "Doneness", required: true, options: [{ name: "Medium", price: 0 }, { name: "Medium-well", price: 0 }, { name: "Well done", price: 0 }] },
      { name: "Add-ons", required: false, options: [{ name: "Aged cheddar", price: 1.5 }, { name: "Smoked bacon", price: 2 }, { name: "Caramelized onion", price: 1 }] },
    ],
  },
  { name: "Truffle Melt", price: 17.5, cost: 6.8, stock: 34, cat: 0, modifiers: [{ name: "Add-ons", required: false, options: [{ name: "Extra truffle mayo", price: 1 }, { name: "Smoked bacon", price: 2 }] }] },
  { name: "Firehouse Jalapeño", price: 14.2, cost: 4.9, stock: 27, cat: 0, modifiers: [{ name: "Heat level", required: true, options: [{ name: "Mild", price: 0 }, { name: "Hot", price: 0 }, { name: "Inferno", price: 0 }] }] },
  { name: "Garden Stack", price: 13.4, cost: 4.2, stock: 23, cat: 0, modifiers: [{ name: "Add-ons", required: false, options: [{ name: "Halloumi", price: 2.5 }, { name: "Avocado", price: 2.25 }] }] },
  // Pizza
  {
    name: "Margherita", price: 13, cost: 3.6, stock: 48, cat: 1,
    modifiers: [
      sizeGroup([{ name: '10"', price: 0 }, { name: '14"', price: 4 }]),
      { name: "Crust", required: false, options: [{ name: "Thin", price: 0 }, { name: "Gluten-free", price: 2 }] },
    ],
  },
  {
    name: "Pepperoni", price: 15.5, cost: 4.6, stock: 4, low: 8, cat: 1,
    modifiers: [
      sizeGroup([{ name: '10"', price: 0 }, { name: '14"', price: 4 }]),
      { name: "Extras", required: false, options: [{ name: "Extra mozzarella", price: 2 }, { name: "Chili honey", price: 1.5 }] },
    ],
  },
  {
    name: "Funghi Truffle", price: 17.9, cost: 5.9, stock: 31, cat: 1,
    modifiers: [sizeGroup([{ name: '10"', price: 0 }, { name: '14"', price: 4 }])],
  },
  {
    name: "Prosciutto Rucola", price: 18.4, cost: 6.4, stock: 19, cat: 1,
    modifiers: [sizeGroup([{ name: '10"', price: 0 }, { name: '14"', price: 4 }])],
  },
  // Salads
  { name: "Caesar", price: 10.5, cost: 3.1, stock: 25, cat: 2, modifiers: [{ name: "Protein", required: false, options: [{ name: "Grilled chicken", price: 3.5 }, { name: "Crispy bacon", price: 2.5 }] }] },
  { name: "Burrata & Tomato", price: 12.9, cost: 4.4, stock: 16, cat: 2 },
  { name: "Harvest Grain Bowl", price: 11.4, cost: 3.6, stock: 21, cat: 2, modifiers: [{ name: "Protein", required: false, options: [{ name: "Grilled chicken", price: 3.5 }, { name: "Seared salmon", price: 5 }] }] },
  // Sides
  { name: "Truffle Fries", price: 6.9, cost: 1.8, stock: 64, cat: 3 },
  { name: "Onion Rings", price: 5.9, cost: 1.5, stock: 39, cat: 3 },
  { name: "Garlic Knots", price: 5.5, cost: 1.2, stock: 7, low: 10, cat: 3 },
  { name: "Soup of the Day", price: 6.5, cost: 1.9, stock: 0, track: false, cat: 3 },
  // Drinks
  { name: "House Lemonade", price: 4.5, cost: 0.7, stock: 80, cat: 4, modifiers: [sizeGroup([{ name: "Regular", price: 0 }, { name: "Large", price: 1 }])] },
  { name: "Cold Brew", price: 5.2, cost: 0.9, stock: 6, low: 10, cat: 4, modifiers: [sizeGroup([{ name: "Regular", price: 0 }, { name: "Large", price: 0.9 }])] },
  { name: "Craft Cola", price: 3.8, cost: 0.6, stock: 96, cat: 4 },
  { name: "Berry Iced Tea", price: 4.2, cost: 0.7, stock: 54, cat: 4, modifiers: [sizeGroup([{ name: "Regular", price: 0 }, { name: "Large", price: 0.8 }])] },
  { name: "Sparkling Water", price: 2.9, cost: 0.4, stock: 120, cat: 4 },
  // Desserts
  { name: "Basque Cheesecake", price: 7.5, cost: 2.2, stock: 14, cat: 5 },
  { name: "Tiramisu", price: 7.9, cost: 2.4, stock: 11, cat: 5 },
  { name: "Gelato Trio", price: 6.5, cost: 1.8, stock: 0, low: 6, cat: 5, modifiers: [{ name: "Flavors", required: false, options: [{ name: "Pistachio", price: 0.5 }, { name: "Stracciatella", price: 0 }, { name: "Dark chocolate", price: 0 }] }] },
  { name: "Affogato", price: 5.9, cost: 1.4, stock: 22, cat: 5 },
];

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

export async function ensureSeeded() {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount > 0) return;

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const [owner] = await db
    .insert(users)
    .values({ name: "Olivia Laurent", email: "owner@bistrolumen.com", passwordHash, role: "owner", permissions: OWNER_PERMISSIONS })
    .returning({ id: users.id });

  // Seed demo staff accounts
  const managerHash = await bcrypt.hash("demo1234", 10);
  await db.insert(users).values({
    name: "Marc Dubois",
    email: "manager@bistrolumen.com",
    passwordHash: managerHash,
    role: "manager",
    permissions: MANAGER_PERMISSIONS,
  });

  const saleHash = await bcrypt.hash("demo1234", 10);
  await db.insert(users).values({
    name: "Lily Chen",
    email: "sale@bistrolumen.com",
    passwordHash: saleHash,
    role: "sale",
    permissions: SALE_PERMISSIONS,
  });

  await db.insert(settings).values({ id: 1 });

  const catRows = await db
    .insert(categories)
    .values(CATS.map((c, i) => ({ ...c, sortOrder: i })))
    .returning({ id: categories.id });

  const itemRows = await db
    .insert(menuItems)
    .values(
      ITEMS.map((it, i) => ({
        name: it.name,
        categoryId: catRows[it.cat].id,
        sku: `SKU-${String(1000 + i)}`,
        price: it.price.toFixed(2),
        cost: it.cost.toFixed(2),
        stock: it.stock,
        lowStockAt: it.low ?? 10,
        trackStock: it.track ?? true,
        color: CATS[it.cat].color,
        modifiers: it.modifiers ?? [],
      })),
    )
    .returning();

  // ---- Orders across the past 14 days -------------------------------
  const rand = mulberry32(20260214);
  let orderNumber = 1001;
  const now = new Date();

  for (let day = 13; day >= 0; day--) {
    const isWeekend = [0, 6].includes(new Date(now.getTime() - day * 86400000).getDay());
    const ordersToday = Math.floor(8 + rand() * 8 + (isWeekend ? 7 : 0));

    for (let k = 0; k < ordersToday; k++) {
      const created = new Date(now);
      created.setDate(created.getDate() - day);
      created.setHours(10 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      if (created > now) continue;

      const lineCount = 1 + Math.floor(rand() * 4);
      const picked = new Map<number, { qty: number; mods: SelectedModifier[]; unit: number }>();
      for (let li = 0; li < lineCount; li++) {
        // Weight towards popular first items in each category
        const item = ITEMS[Math.floor(Math.pow(rand(), 1.4) * ITEMS.length)];
        const dbItem = itemRows[ITEMS.indexOf(item)];
        const mods: SelectedModifier[] = [];
        let unit = item.price;
        for (const g of item.modifiers ?? []) {
          if (g.required || rand() > 0.55) {
            const opt = g.options[Math.floor(rand() * g.options.length)];
            mods.push({ group: g.name, option: opt.name, price: opt.price });
            unit += opt.price;
          }
        }
        const key = dbItem.id;
        const prev = picked.get(key);
        picked.set(key, {
          qty: (prev?.qty ?? 0) + 1 + (rand() > 0.85 ? 1 : 0),
          mods: prev?.mods ?? mods,
          unit,
        });
      }

      let subtotal = 0;
      let itemCount = 0;
      for (const v of picked.values()) {
        subtotal += v.unit * v.qty;
        itemCount += v.qty;
      }
      subtotal = round2(subtotal);
      const tax = round2((subtotal * TAX_RATE) / 100);
      const total = round2(subtotal + tax);
      const cash = rand() > 0.4;
      const cashReceived = cash ? round2(Math.ceil(total / 5) * 5 + (rand() > 0.7 ? 5 : 0)) : null;

      const [order] = await db
        .insert(orders)
        .values({
          orderNumber: orderNumber++,
          status: "completed",
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: cash ? "cash" : "card",
          cashReceived: cashReceived?.toFixed(2),
          changeDue: cash ? round2((cashReceived ?? 0) - total).toFixed(2) : null,
          itemCount,
          userId: owner.id,
          cashierName: "Olivia Laurent",
          createdAt: created,
        })
        .returning({ id: orders.id });

      await db.insert(orderItems).values(
        [...picked.entries()].map(([menuItemId, v]) => {
          const def = ITEMS[itemRows.findIndex((r) => r.id === menuItemId)];
          return {
            orderId: order.id,
            menuItemId,
            name: def.name,
            unitPrice: v.unit.toFixed(2),
            qty: v.qty,
            modifiers: v.mods,
            lineTotal: round2(v.unit * v.qty).toFixed(2),
          };
        }),
      );
    }
  }

  // ---- A few restock movements --------------------------------------
  const restocks = [
    { idx: 16, delta: 40, days: 2, note: "Sysco delivery" },
    { idx: 5, delta: 24, days: 1, note: "Morning prep batch" },
    { idx: 14, delta: -3, days: 3, note: "Dough wastage" },
    { idx: 20, delta: 30, days: 4, note: "Supplier run" },
  ];
  for (const r of restocks) {
    const item = itemRows[r.idx];
    if (!item) continue;
    const when = new Date(now.getTime() - r.days * 86400000);
    await db.insert(stockMovements).values({
      itemId: item.id,
      delta: r.delta,
      reason: r.delta > 0 ? "restock" : "waste",
      note: r.note,
      createdAt: when,
    });
  }
}

export async function getOrCreateSettings() {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(settings).values({ id: 1 }).returning();
  return created;
}

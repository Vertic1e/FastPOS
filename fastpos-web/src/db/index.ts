import Dexie, { type EntityTable } from "dexie";
import type {
  Category,
  MenuItem,
  Order,
  OrderItem,
  Shift,
  CashMovement,
  StockMovement,
  HeldTicket,
  StoreSettings,
} from "@/types";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Bistro Lumen",
  address: "128 Ember Street, Riverside Plaza",
  phone: "+855 12 345 678",
  currency: "$",
  secondaryCurrency: "KHR",
  exchangeRate: 4000,
  enableDualCurrency: true,
  taxRate: 8.25,
  receiptHeader: "Thank you for dining with Bistro Lumen!",
  receiptFooter: "Follow us @bistrolumen • Free Wi-Fi: BistroGuest",
  merchantName: "BISTRO LUMEN CO., LTD.",
  khqrMerchantId: "bistro_lumen@aclb",
  soundEnabled: true,
  accentColor: "#f97316",
};

interface SettingRecord {
  id: string;
  data: StoreSettings;
}

export class FastPosDB extends Dexie {
  categories!: EntityTable<Category, "id">;
  menuItems!: EntityTable<MenuItem, "id">;
  orders!: EntityTable<Order, "id">;
  orderItems!: EntityTable<OrderItem, "id">;
  shifts!: EntityTable<Shift, "id">;
  cashMovements!: EntityTable<CashMovement, "id">;
  stockMovements!: EntityTable<StockMovement, "id">;
  heldTickets!: EntityTable<HeldTicket, "id">;
  settings!: EntityTable<SettingRecord, "id">;

  constructor() {
    super("FastPosDatabase");
    this.version(1).stores({
      categories: "++id, name, sortOrder, isActive",
      menuItems: "++id, categoryId, name, sku, price, stock, isActive, createdAt",
      orders: "++id, orderNumber, status, paymentMethod, shiftId, createdAt",
      orderItems: "++id, orderId, menuItemId",
      shifts: "++id, status, openedAt, closedAt",
      cashMovements: "++id, shiftId, type, createdAt",
      stockMovements: "++id, itemId, reason, createdAt",
      heldTickets: "++id, name, tableNumber, createdAt",
      settings: "id",
    });
  }
}

export const db = new FastPosDB();

// Auto-seed initial store data if database is empty
export async function seedInitialData(force = false) {
  const catCount = await db.categories.count();
  if (catCount > 0 && !force) {
    return;
  }

  if (force) {
    await db.categories.clear();
    await db.menuItems.clear();
    await db.orders.clear();
    await db.orderItems.clear();
    await db.shifts.clear();
    await db.cashMovements.clear();
    await db.stockMovements.clear();
    await db.heldTickets.clear();
    await db.settings.clear();
  }

  // 1. Settings
  await db.settings.put({ id: "config", data: DEFAULT_SETTINGS });

  // 2. Categories
  const catIds = (await db.categories.bulkAdd(
    [
      { name: "Signature Coffee", color: "#f97316", icon: "coffee", sortOrder: 1, isActive: true },
      { name: "Teas & Refreshers", color: "#10b981", icon: "cup-soda", sortOrder: 2, isActive: true },
      { name: "Artisan Pastries", color: "#eab308", icon: "croissant", sortOrder: 3, isActive: true },
      { name: "Gourmet Burgers", color: "#ef4444", icon: "sandwich", sortOrder: 4, isActive: true },
      { name: "Sides & Extras", color: "#8b5cf6", icon: "utensils", sortOrder: 5, isActive: true },
    ],
    { allKeys: true }
  )) as number[];

  const [coffeeId, teaId, pastryId, burgerId, sidesId] = catIds;

  // 3. Menu Items
  const standardCoffeeMods = [
    {
      name: "Size",
      required: true,
      options: [
        { name: "Regular (12oz)", price: 0 },
        { name: "Large (16oz)", price: 0.75 },
      ],
    },
    {
      name: "Milk Choice",
      required: false,
      options: [
        { name: "Oat Milk", price: 0.65 },
        { name: "Almond Milk", price: 0.65 },
        { name: "Soy Milk", price: 0.5 },
      ],
    },
    {
      name: "Sweetness",
      required: false,
      options: [
        { name: "100% Sugar", price: 0 },
        { name: "50% Sugar", price: 0 },
        { name: "25% Sugar", price: 0 },
        { name: "No Sugar", price: 0 },
      ],
    },
  ];

  const items: MenuItem[] = [
    // Coffee
    {
      categoryId: coffeeId,
      name: "Iced Spanish Latte",
      sku: "CF-01",
      price: 3.75,
      cost: 1.1,
      stock: 85,
      lowStockAt: 15,
      trackStock: true,
      color: "#f97316",
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: coffeeId,
      name: "Salted Caramel Cold Brew",
      sku: "CF-02",
      price: 4.25,
      cost: 1.3,
      stock: 45,
      lowStockAt: 10,
      trackStock: true,
      color: "#ea580c",
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: coffeeId,
      name: "Espresso Americano",
      sku: "CF-03",
      price: 2.75,
      cost: 0.6,
      stock: 120,
      lowStockAt: 20,
      trackStock: true,
      color: "#c2410c",
      modifiers: [
        {
          name: "Serving",
          required: true,
          options: [
            { name: "Hot", price: 0 },
            { name: "Iced", price: 0.25 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: coffeeId,
      name: "Velvet Flat White",
      sku: "CF-04",
      price: 3.5,
      cost: 0.95,
      stock: 60,
      lowStockAt: 12,
      trackStock: true,
      color: "#9a3412",
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },

    // Teas
    {
      categoryId: teaId,
      name: "Peach Jasmine Green Tea",
      sku: "TE-01",
      price: 3.25,
      cost: 0.8,
      stock: 50,
      lowStockAt: 10,
      trackStock: true,
      color: "#10b981",
      modifiers: [
        {
          name: "Sweetness",
          required: false,
          options: [
            { name: "100%", price: 0 },
            { name: "50%", price: 0 },
            { name: "No Sugar", price: 0 },
          ],
        },
        {
          name: "Toppings",
          required: false,
          options: [
            { name: "Aloe Vera Jelly", price: 0.5 },
            { name: "Chia Seeds", price: 0.5 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: teaId,
      name: "Kyoto Matcha Cream Latte",
      sku: "TE-02",
      price: 4.5,
      cost: 1.5,
      stock: 35,
      lowStockAt: 8,
      trackStock: true,
      color: "#059669",
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },

    // Pastries
    {
      categoryId: pastryId,
      name: "Almond Butter Croissant",
      sku: "BA-01",
      price: 3.2,
      cost: 1.0,
      stock: 22,
      lowStockAt: 5,
      trackStock: true,
      color: "#eab308",
      modifiers: [
        {
          name: "Preparation",
          required: false,
          options: [
            { name: "Warmed Up", price: 0 },
            { name: "Room Temperature", price: 0 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: pastryId,
      name: "Dark Chocolate Brownie",
      sku: "BA-02",
      price: 2.95,
      cost: 0.85,
      stock: 18,
      lowStockAt: 5,
      trackStock: true,
      color: "#ca8a04",
      modifiers: [
        {
          name: "Add-on",
          required: false,
          options: [{ name: "Vanilla Ice Cream Scoop", price: 1.25 }],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },

    // Burgers
    {
      categoryId: burgerId,
      name: "Truffle Angus Burger",
      sku: "BG-01",
      price: 8.5,
      cost: 3.8,
      stock: 30,
      lowStockAt: 6,
      trackStock: true,
      color: "#ef4444",
      modifiers: [
        {
          name: "Patty Doneness",
          required: true,
          options: [
            { name: "Medium Rare", price: 0 },
            { name: "Medium", price: 0 },
            { name: "Well Done", price: 0 },
          ],
        },
        {
          name: "Extras",
          required: false,
          options: [
            { name: "Crispy Bacon", price: 1.5 },
            { name: "Extra Cheddar", price: 1.0 },
            { name: "Fried Egg", price: 1.0 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: burgerId,
      name: "Spicy Crispy Chicken Burger",
      sku: "BG-02",
      price: 7.25,
      cost: 2.9,
      stock: 28,
      lowStockAt: 6,
      trackStock: true,
      color: "#dc2626",
      modifiers: [
        {
          name: "Spice Level",
          required: true,
          options: [
            { name: "Mild", price: 0 },
            { name: "Hot", price: 0 },
            { name: "Inferno 🔥", price: 0 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },

    // Sides
    {
      categoryId: sidesId,
      name: "Parmesan Truffle Fries",
      sku: "SD-01",
      price: 4.25,
      cost: 1.2,
      stock: 50,
      lowStockAt: 10,
      trackStock: true,
      color: "#8b5cf6",
      modifiers: [
        {
          name: "Dipping Sauce",
          required: false,
          options: [
            { name: "Truffle Mayo", price: 0 },
            { name: "Spicy Sriracha Dip", price: 0 },
            { name: "Garlic Aioli", price: 0 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      categoryId: sidesId,
      name: "Cajun Onion Rings",
      sku: "SD-02",
      price: 3.75,
      cost: 1.0,
      stock: 40,
      lowStockAt: 8,
      trackStock: true,
      color: "#7c3aed",
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },
  ];

  await db.menuItems.bulkAdd(items);

  // 4. Initial Open Shift
  const shiftId = await db.shifts.add({
    status: "open",
    openedAt: new Date(Date.now() - 3600 * 1000 * 4),
    openedBy: "Alex Rivers (Lead Cashier)",
    openingCashUsd: 100.0,
    openingCashKhr: 400000,
    expectedCashUsd: 100.0,
    expectedCashKhr: 400000,
    totalSalesUsd: 0,
    totalSalesKhr: 0,
    totalOrders: 0,
    cashSalesUsd: 0,
    cardSalesUsd: 0,
    qrSalesUsd: 0,
    refundsTotalUsd: 0,
  });

  // 5. Seed some sample historical orders today
  const order1Id = await db.orders.add({
    orderNumber: 1001,
    status: "completed",
    subtotal: 12.25,
    tax: 1.01,
    total: 13.26,
    totalKhr: 53040,
    paymentMethod: "khqr",
    cashierName: "Alex Rivers",
    tableNumber: "T-04",
    exchangeRate: 4000,
    itemCount: 3,
    shiftId: shiftId as number,
    createdAt: new Date(Date.now() - 3600 * 1000 * 2.5),
  });

  await db.orderItems.bulkAdd([
    {
      orderId: order1Id as number,
      name: "Truffle Angus Burger",
      unitPrice: 8.5,
      qty: 1,
      modifiers: [{ group: "Patty Doneness", option: "Medium", price: 0 }],
      lineTotal: 8.5,
    },
    {
      orderId: order1Id as number,
      name: "Iced Spanish Latte",
      unitPrice: 3.75,
      qty: 1,
      modifiers: [{ group: "Size", option: "Regular (12oz)", price: 0 }],
      lineTotal: 3.75,
    },
  ]);

  const order2Id = await db.orders.add({
    orderNumber: 1002,
    status: "completed",
    subtotal: 10.45,
    tax: 0.86,
    total: 11.31,
    totalKhr: 45240,
    paymentMethod: "cash",
    cashReceived: 20.0,
    changeDue: 8.69,
    cashReceivedKhr: 80000,
    changeDueKhr: 34760,
    cashierName: "Alex Rivers",
    tableNumber: "Takeout",
    exchangeRate: 4000,
    itemCount: 2,
    shiftId: shiftId as number,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1.2),
  });

  await db.orderItems.bulkAdd([
    {
      orderId: order2Id as number,
      name: "Kyoto Matcha Cream Latte",
      unitPrice: 4.5,
      qty: 1,
      modifiers: [],
      lineTotal: 4.5,
    },
    {
      orderId: order2Id as number,
      name: "Dark Chocolate Brownie",
      unitPrice: 4.2,
      qty: 1,
      modifiers: [{ group: "Add-on", option: "Vanilla Ice Cream Scoop", price: 1.25 }],
      lineTotal: 4.2,
    },
    {
      orderId: order2Id as number,
      name: "Almond Butter Croissant",
      unitPrice: 3.2,
      qty: 1,
      modifiers: [],
      lineTotal: 3.2,
    },
  ]);

  // Update shift figures
  await db.shifts.update(shiftId as number, {
    totalSalesUsd: 24.57,
    totalSalesKhr: 98280,
    totalOrders: 2,
    cashSalesUsd: 11.31,
    qrSalesUsd: 13.26,
    expectedCashUsd: 111.31,
  });

  // Seed 1 held ticket
  await db.heldTickets.add({
    name: "VIP Table 2",
    tableNumber: "T-02",
    itemCount: 2,
    subtotal: 12.75,
    lines: [
      {
        key: "demo-held-1",
        menuItemId: 1,
        name: "Iced Spanish Latte",
        color: "#f97316",
        basePrice: 3.75,
        qty: 2,
        modifiers: [
          { group: "Size", option: "Large (16oz)", price: 0.75 },
          { group: "Milk Choice", option: "Oat Milk", price: 0.65 },
        ],
        note: "Less ice please",
      },
      {
        key: "demo-held-2",
        menuItemId: 7,
        name: "Almond Butter Croissant",
        color: "#eab308",
        basePrice: 3.2,
        qty: 1,
        modifiers: [{ group: "Preparation", option: "Warmed Up", price: 0 }],
      },
    ],
    createdAt: new Date(),
  });
}

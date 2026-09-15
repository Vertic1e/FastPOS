import Dexie, { type EntityTable } from "dexie";
import type {
  Shop,
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
  ownerPin: "1234",
  currentRole: "owner",
  activeShopId: 1,
  accessibility: {
    gridCols: 2,
    fontSize: "normal",
  },
};

interface SettingRecord {
  id: string;
  data: StoreSettings;
}

export class FastPosDB extends Dexie {
  shops!: EntityTable<Shop, "id">;
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
    this.version(2).stores({
      shops: "++id, name, isDefault",
      categories: "++id, shopId, name, sortOrder, isActive",
      menuItems: "++id, shopId, categoryId, name, sku, price, stock, isActive, createdAt",
      orders: "++id, shopId, orderNumber, status, paymentMethod, shiftId, createdAt",
      orderItems: "++id, orderId, menuItemId",
      shifts: "++id, shopId, status, openedAt, closedAt",
      cashMovements: "++id, shiftId, type, createdAt",
      stockMovements: "++id, itemId, reason, createdAt",
      heldTickets: "++id, shopId, name, tableNumber, createdAt",
      settings: "id",
    });
  }
}

export const db = new FastPosDB();

// Auto-seed initial store data if database is empty
export async function seedInitialData(force = false) {
  const shopCount = await db.shops.count();
  if (shopCount > 0 && !force) {
    return;
  }

  if (force) {
    await db.shops.clear();
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

  // 1. Shops (Multi-shop linking)
  const shop1Id = (await db.shops.add({
    name: "Bistro Lumen — Main",
    address: "128 Ember Street, Riverside Plaza",
    phone: "+855 12 345 678",
    isDefault: true,
  })) as number;

  const shop2Id = (await db.shops.add({
    name: "Bistro Express — Downtown",
    address: "45 Central Blvd, Floor 1",
    phone: "+855 12 987 654",
    isDefault: false,
  })) as number;

  // 2. Settings
  const initialSettings: StoreSettings = {
    ...DEFAULT_SETTINGS,
    activeShopId: shop1Id,
  };
  await db.settings.put({ id: "config", data: initialSettings });

  // 3. Categories (Shop 1)
  const catIds = (await db.categories.bulkAdd(
    [
      { shopId: shop1Id, name: "Signature Coffee", color: "#f97316", icon: "coffee", sortOrder: 1, isActive: true },
      { shopId: shop1Id, name: "Teas & Refreshers", color: "#10b981", icon: "cup-soda", sortOrder: 2, isActive: true },
      { shopId: shop1Id, name: "Artisan Pastries", color: "#eab308", icon: "croissant", sortOrder: 3, isActive: true },
      { shopId: shop1Id, name: "Gourmet Burgers", color: "#ef4444", icon: "sandwich", sortOrder: 4, isActive: true },
      { shopId: shop1Id, name: "Sides & Extras", color: "#8b5cf6", icon: "utensils", sortOrder: 5, isActive: true },
    ],
    { allKeys: true }
  )) as number[];

  const [coffeeId, teaId, pastryId, burgerId, sidesId] = catIds;

  // Modifiers
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

  // 4. Menu Items with sample images (clean SVG data URLs)
  const latteSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23f97316"/><path d="M30 35h40v30a20 20 0 0 1-20 20h0a20 20 0 0 1-20-20V35z" fill="%23fff"/><path d="M70 42h8a8 8 0 0 1 0 16h-8" stroke="%23fff" stroke-width="6" fill="none"/><circle cx="50" cy="50" r="10" fill="%23fb923c"/></svg>`;
  const coldBrewSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23ea580c"/><rect x="35" y="25" width="30" height="55" rx="10" fill="%23fff"/><rect x="40" y="35" width="20" height="40" rx="5" fill="%239a3412"/><line x1="48" y1="15" x2="52" y2="45" stroke="%23f97316" stroke-width="4"/></svg>`;
  const burgerSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23ef4444"/><path d="M25 45a25 25 0 0 1 50 0H25z" fill="%23f59e0b"/><rect x="22" y="48" width="56" height="8" rx="4" fill="%2310b981"/><rect x="20" y="58" width="60" height="12" rx="6" fill="%2378350f"/><rect x="25" y="72" width="50" height="10" rx="5" fill="%23f59e0b"/></svg>`;
  const croissantSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23eab308"/><path d="M25 60 C 25 35, 75 35, 75 60 C 70 70, 30 70, 25 60 Z" fill="%23fff"/><circle cx="50" cy="52" r="8" fill="%23ca8a04"/></svg>`;

  const items: MenuItem[] = [
    {
      shopId: shop1Id,
      categoryId: coffeeId,
      name: "Iced Spanish Latte",
      sku: "CF-01",
      price: 3.75,
      cost: 1.1,
      stock: 85,
      lowStockAt: 15,
      trackStock: true,
      color: "#f97316",
      image: latteSvg,
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop1Id,
      categoryId: coffeeId,
      name: "Salted Caramel Cold Brew",
      sku: "CF-02",
      price: 4.25,
      cost: 1.3,
      stock: 45,
      lowStockAt: 10,
      trackStock: true,
      color: "#ea580c",
      image: coldBrewSvg,
      modifiers: standardCoffeeMods,
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop1Id,
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
      shopId: shop1Id,
      categoryId: teaId,
      name: "Peach Jasmine Green Tea",
      sku: "TE-01",
      price: 3.25,
      cost: 0.8,
      stock: 50,
      lowStockAt: 10,
      trackStock: true,
      color: "#10b981",
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop1Id,
      categoryId: pastryId,
      name: "Almond Butter Croissant",
      sku: "BA-01",
      price: 3.2,
      cost: 1.0,
      stock: 22,
      lowStockAt: 5,
      trackStock: true,
      color: "#eab308",
      image: croissantSvg,
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop1Id,
      categoryId: burgerId,
      name: "Truffle Angus Burger",
      sku: "BG-01",
      price: 8.5,
      cost: 3.8,
      stock: 30,
      lowStockAt: 6,
      trackStock: true,
      color: "#ef4444",
      image: burgerSvg,
      modifiers: [
        {
          name: "Patty Doneness",
          required: true,
          options: [
            { name: "Medium", price: 0 },
            { name: "Well Done", price: 0 },
          ],
        },
      ],
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop1Id,
      categoryId: sidesId,
      name: "Parmesan Truffle Fries",
      sku: "SD-01",
      price: 4.25,
      cost: 1.2,
      stock: 50,
      lowStockAt: 10,
      trackStock: true,
      color: "#8b5cf6",
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },

    // Categories & items for Shop 2 (Downtown Express)
    {
      shopId: shop2Id,
      categoryId: null,
      name: "Express Filter Coffee",
      sku: "EX-01",
      price: 2.0,
      cost: 0.5,
      stock: 100,
      lowStockAt: 15,
      trackStock: true,
      color: "#f97316",
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },
    {
      shopId: shop2Id,
      categoryId: null,
      name: "Grab & Go Egg Brioche",
      sku: "EX-02",
      price: 3.5,
      cost: 1.2,
      stock: 40,
      lowStockAt: 8,
      trackStock: true,
      color: "#eab308",
      modifiers: [],
      isActive: true,
      createdAt: new Date(),
    },
  ];

  await db.menuItems.bulkAdd(items);

  // 5. Initial Open Shift for Shop 1
  const shiftId = await db.shifts.add({
    shopId: shop1Id,
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

  // 6. Sample order for Shop 1
  const order1Id = await db.orders.add({
    shopId: shop1Id,
    orderNumber: 1001,
    status: "completed",
    subtotal: 12.25,
    tax: 1.01,
    total: 13.26,
    totalKhr: 53040,
    paymentMethod: "cash",
    cashReceived: 13.26,
    changeDue: 0,
    cashierName: "Alex Rivers",
    tableNumber: "T-04",
    exchangeRate: 4000,
    itemCount: 2,
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

  await db.shifts.update(shiftId as number, {
    totalSalesUsd: 13.26,
    totalSalesKhr: 53040,
    totalOrders: 1,
    cashSalesUsd: 13.26,
    expectedCashUsd: 113.26,
  });
}

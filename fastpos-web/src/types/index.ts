export type ModifierOption = {
  name: string;
  price: number;
};

export type ModifierGroup = {
  name: string;
  required: boolean;
  options: ModifierOption[];
};

export type SelectedModifier = {
  group: string;
  option: string;
  price: number;
};

export type Category = {
  id?: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export type MenuItem = {
  id?: number;
  categoryId: number | null;
  name: string;
  sku?: string;
  price: number;
  cost: number;
  stock: number;
  lowStockAt: number;
  trackStock: boolean;
  color: string;
  modifiers: ModifierGroup[];
  isActive: boolean;
  createdAt: Date;
};

export type CartLine = {
  key: string;
  menuItemId: number;
  name: string;
  color: string;
  basePrice: number;
  qty: number;
  modifiers: SelectedModifier[];
  note?: string;
};

export type PaymentMethod = "cash" | "card" | "khqr" | "split";

export type OrderStatus = "completed" | "refunded" | "cancelled";

export type Order = {
  id?: number;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  totalKhr: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeDue?: number;
  cashReceivedKhr?: number;
  changeDueKhr?: number;
  exchangeRate: number;
  itemCount: number;
  cashierName: string;
  customerName?: string;
  tableNumber?: string;
  shiftId?: number;
  refundedAt?: Date;
  refundNote?: string;
  createdAt: Date;
};

export type OrderItem = {
  id?: number;
  orderId: number;
  menuItemId?: number | null;
  name: string;
  unitPrice: number;
  qty: number;
  modifiers: SelectedModifier[];
  note?: string;
  lineTotal: number;
};

export type HeldTicket = {
  id?: number;
  name: string;
  tableNumber?: string;
  itemCount: number;
  subtotal: number;
  lines: CartLine[];
  createdAt: Date;
};

export type ShiftStatus = "open" | "closed";

export type Shift = {
  id?: number;
  status: ShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  openedBy: string;
  closedBy?: string;
  openingCashUsd: number;
  openingCashKhr: number;
  closingCashUsd?: number;
  closingCashKhr?: number;
  expectedCashUsd?: number;
  expectedCashKhr?: number;
  totalSalesUsd?: number;
  totalSalesKhr?: number;
  totalOrders?: number;
  cashSalesUsd?: number;
  cardSalesUsd?: number;
  qrSalesUsd?: number;
  refundsTotalUsd?: number;
  notes?: string;
};

export type CashMovementType = "in" | "out";

export type CashMovement = {
  id?: number;
  shiftId: number;
  type: CashMovementType;
  amountUsd: number;
  amountKhr: number;
  reason: string;
  note?: string;
  createdAt: Date;
};

export type StockMovement = {
  id?: number;
  itemId: number;
  delta: number;
  reason: "sale" | "restock" | "waste" | "adjustment" | "refund";
  note?: string;
  createdAt: Date;
};

export type StoreSettings = {
  storeName: string;
  address: string;
  phone: string;
  currency: string;
  secondaryCurrency: string;
  exchangeRate: number;
  enableDualCurrency: boolean;
  taxRate: number;
  receiptHeader: string;
  receiptFooter: string;
  merchantName: string;
  khqrMerchantId: string;
  soundEnabled: boolean;
  accentColor: string;
};

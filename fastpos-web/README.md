# FastPOS Web — Offline-First Restaurant & Retail Point of Sale

A web-based Point of Sale (POS), shift manager, inventory tracker, and sales analytics system engineered for daily operations. Runs 100% in the browser with local IndexedDB persistence, works completely offline, and can be hosted for **free on GitHub Pages** or **Vercel** with zero backend infrastructure or database maintenance.

---

## 🚀 Key Features for Daily Operations

- **⚡ Blazing Fast POS Register**:
  - Touch-friendly item grid with category tabs, live search, and SKU barcode scanning support.
  - Modifiers & customizations (Sizes, Sweetness, Milk choices, Temperature, Toppings, Kitchen notes).
  - Current Ticket drawer with quantity adjustments, custom/preset discounts, and ticket totals.
  - **Hold / Park Orders**: Park tickets with table/customer names (e.g. Table 2, Takeaway) and resume anytime.

- **💵 Dual-Currency Payment & Checkout**:
  - **USD ($) & Cambodian Riel (៛)**: Live exchange rate calculations (e.g. $1 = 4,000 KHR).
  - Cash payment with fast preset denomination buttons ($1, $5, $10, $20, $50, $100 & 5,000៛ - 100,000៛).
  - Real-time Change Due calculation in both USD and KHR simultaneously.
  - **Dynamic KHQR / Bakong Pay**: Generates payment QR codes for bank app scanning.
  - Card & Split payment modes.
  - Interactive celebration confetti & synthesized cash register sound effects.

- **🧾 80mm / 58mm Thermal Receipt Printing**:
  - Standard thermal receipt preview formatted for receipt printers.
  - Store info, order number, table, itemized lines with modifiers, and payment details.
  - Clean `@media print` layout that prints only the receipt without browser margins.

- **💼 Shift & Cash Register Management (End of Day Z-Report)**:
  - Open Shift: Record opening cash float in USD & KHR.
  - Active Shift Tracker: Tracks cash sales, card sales, QR sales, and expected cash in drawer.
  - Cash In / Payout: Log petty cash expenses (e.g., buying milk, ice, supplies).
  - Close Shift: Record physical counted drawer cash, calculate over/short variance, and print official **Z-Report**.

- **📦 Inventory & Menu Catalog**:
  - Add / edit menu items, selling prices, cost of goods, and low-stock alert thresholds.
  - Real-time stock decrement on sales with audit logs.
  - Manage categories, icon badges, and color swatches.
  - Quick +/- stock adjustments.
  - Export inventory to CSV.

- **📊 Sales & Business Analytics**:
  - Net Sales, Gross Profit, Total Orders, Average Order Value (AOV), Profit Margin %.
  - Timeframe filters: Today, Yesterday, 7 Days, 30 Days, All Time.
  - Hourly sales activity bar chart showing peak rush hours.
  - Top 5 best-selling products by volume and revenue.
  - Export order history to CSV.

- **💾 100% Offline & Data Portability**:
  - Powered by IndexedDB via Dexie: All data is stored safely in browser persistent storage.
  - **1-Click Backup**: Download timestamped JSON backup files (`fastpos-backup-YYYY-MM-DD.json`).
  - **Restore / Migrate**: Import JSON backup to transfer your store to any tablet, laptop, or phone.
  - PWA ready: Install as a standalone web app on iPad, Android POS tablet, or Windows desktop.

---

## 🌐 Deploy to GitHub Pages (Free Static Hosting)

FastPOS Web includes an automated GitHub Actions workflow at [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml).

### Steps:
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Add FastPOS Web version"
   git push origin main
   ```
2. Go to your repository on GitHub: **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. The workflow will automatically build `fastpos-web` and deploy your site to `https://<username>.github.io/<repo-name>/`.

---

## ▲ Deploy to Vercel

FastPOS Web is pre-configured with [`vercel.json`](./vercel.json) for instant deployment:

### Option 1: Vercel Dashboard (GitHub Import)
1. In Vercel, click **Add New Project** and select your GitHub repository.
2. Under **Root Directory**, click Edit and select `fastpos-web`.
3. Framework Preset will auto-detect as **Vite**.
4. Click **Deploy**!

### Option 2: Vercel CLI
```bash
cd fastpos-web
npx vercel
```

---

## 💻 Local Development

```bash
# Navigate to web app directory
cd fastpos-web

# Install dependencies
npm install

# Start local development server
npm run dev

# Build production static bundle (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

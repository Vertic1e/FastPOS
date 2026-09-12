# Bistro Lumen — Full-Stack Restaurant POS System

A modern, full-stack Point of Sale (POS), order management, and real-time inventory system for restaurants built with **Next.js 16**, **React 19**, **Drizzle ORM**, **PostgreSQL**, and **Tailwind CSS v4**.

---

## ⚡ Standalone Local Run (No External Server Needed)

FastPOS can run **100% independently on your local device** with embedded PostgreSQL and a self-contained Next.js production server:

### Option 1: One-Click Desktop Launcher (Windows)
Double-click [`start-pos.bat`](./start-pos.bat) in the project folder. It will:
1. Automatically start the embedded local PostgreSQL database
2. Launch the standalone FastPOS production server
3. Open `http://localhost:3000/pos` in your browser

### Option 2: Command Line (Windows, macOS, Linux)
```bash
# Build standalone bundle (if not yet built)
npm run build

# Start standalone engine (embedded DB + server)
npm run start:standalone
```

---

## 📲 Android POS Device Installation

The ready-to-install Android APK is located in [`release-apk/FastPOS.apk`](./release-apk/FastPOS.apk).

1. Install `FastPOS.apk` on your Android POS terminal, tablet, or phone.
2. Start FastPOS on your local PC or register using `start-pos.bat`.
3. Open the app on your device — it will automatically detect and connect to your local FastPOS server on the Wi-Fi network!
4. Supports native ESC/POS thermal printing via standard Android Print Service.

---

---

### 2. Configure Environment Variables

Create or review `.env.local` in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
```

> **Note**: Update the username, password, port, or database name if your PostgreSQL configuration differs.

---

### 3. Start PostgreSQL Database

#### Option A: Local Windows Service (PostgreSQL is installed on this machine)
Open PowerShell as Administrator (or check Services):
```powershell
Start-Service postgresql-x64-15
```

Create the `app_db` database if it doesn't exist yet:
```powershell
& "C:\Program Files\PostgreSQL\15\bin\createdb.exe" -U postgres app_db
```

#### Option B: Docker
```bash
docker run --name bistro-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15
```

#### Option C: Cloud Database
You can also use a free managed PostgreSQL database (e.g. Neon, Supabase, ElephantSQL, Render) and paste your connection string into `DATABASE_URL`.

---

### 4. Install Dependencies

```bash
npm install
```

---

### 5. Push Database Schema

Run Drizzle Kit to create the necessary tables in your database:

```bash
npm run db:push
```

---

### 6. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Demo Login & Auto-Seeding

On first launch, the app **automatically seeds realistic restaurant data**, including:
- Categories & menu items with modifiers
- 14 days of realistic order & checkout history
- Stock movements and restock events
- Default store settings

### Default Credentials:
- **Email**: `owner@bistrolumen.com`
- **Password**: `demo1234`

*(A one-click **"Use demo account"** button is also available on the login page).*

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server on `http://localhost:3000` |
| `npm run db:push` | Synchronize and push Drizzle schema directly to PostgreSQL |
| `npm run db:studio` | Launch Drizzle Studio visual database inspector |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint check |
| `npm run typecheck` | Run TypeScript type validation (`tsc --noEmit`) |

---

## 🛠 Features & Routes

- **/pos**: Real-time cashier interface with modifier customization, quick quantity adjustments, receipt printing, and cash change calculation.
- **/dashboard**: Real-time financial metrics, sales velocity, average check, hourly order spikes, and low-inventory alerts.
- **/orders**: Searchable and filterable history of all completed and pending orders with itemized breakdown.
- **/inventory**: Live stock tracking, restock logs, and low-stock indicators.
- **/receipt/[id]**: Clean thermal-receipt view formatted for receipt printers.
- **/settings**: Configurable restaurant profile, tax rate, theme accents, and POS layout grids.

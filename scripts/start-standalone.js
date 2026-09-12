/**
 * FastPOS Standalone Server
 * 
 * This script is bundled inside the Android APK via nodejs-mobile-android.
 * It starts the embedded PostgreSQL database and then launches the Next.js
 * production server on port 3000, all on-device with no network required.
 */

const { initAndStart } = require('./db');
const path = require('path');
const http = require('http');

// DATA_DIR is injected by Android MainActivity via environment variable
// It points to context.filesDir — the app's private internal storage
// This ensures the database persists across app restarts and updates.
const DATA_DIR = process.env.FASTPOS_DATA_DIR || path.resolve(__dirname, '../.pgdata');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = '127.0.0.1';

// Override pgdata path for embedded postgres
process.env.FASTPOS_DATA_DIR = DATA_DIR;
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/app_db';

async function waitForServer(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://${HOSTNAME}:${PORT}/api/health`, (res) => {
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`Status: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

async function main() {
  console.log('[FastPOS] Starting embedded database...');
  console.log('[FastPOS] Data directory:', DATA_DIR);

  try {
    await initAndStart(DATA_DIR);
  } catch (err) {
    console.error('[FastPOS] Database startup failed:', err);
    process.exit(1);
  }

  console.log('[FastPOS] Starting Next.js production server on port', PORT);

  // Load the standalone Next.js server
  // next build --standalone produces .next/standalone/server.js
  process.env.HOSTNAME = HOSTNAME;
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'production';

  const fs = require('fs');
  const serverPath = fs.existsSync(path.resolve(__dirname, './server.js'))
    ? path.resolve(__dirname, './server.js')
    : path.resolve(__dirname, '../.next/standalone/server.js');

  try {
    require(serverPath);
  } catch (err) {
    console.error('[FastPOS] Failed to start Next.js server:', err);
    process.exit(1);
  }

  console.log('[FastPOS] Waiting for server to be ready...');
  const ready = await waitForServer(90000);
  if (ready) {
    console.log('[FastPOS:READY]'); // Android app listens for this signal
  } else {
    console.error('[FastPOS] Server did not become ready in time.');
  }
}

main();

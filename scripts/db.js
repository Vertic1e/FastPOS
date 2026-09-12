const EmbeddedPostgres = require('embedded-postgres').default;
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const pgDataDir = path.resolve(__dirname, '../.pgdata');

async function getPgInstance() {
  const pg = new EmbeddedPostgres({
    port: 5432,
    databaseDir: pgDataDir,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
  });
  return pg;
}

async function isPortOpen(port = 5432) {
  const net = require('net');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function initAndStart() {
  const alreadyRunning = await isPortOpen(5432);
  if (alreadyRunning) {
    console.log('[FastPOS DB] PostgreSQL is already running on port 5432.');
    return;
  }

  const pg = await getPgInstance();
  if (!fs.existsSync(pgDataDir)) {
    console.log('[FastPOS DB] Initializing PostgreSQL cluster...');
    await pg.initialise();
  }

  console.log('[FastPOS DB] Starting PostgreSQL on port 5432...');
  await pg.start();

  // Check connection and ensure app_db and password
  const passwordsToTry = ['postgres', 'postgresPassword'];
  let connected = false;
  let client;

  for (const pw of passwordsToTry) {
    try {
      client = new Client({
        connectionString: `postgresql://postgres:${pw}@127.0.0.1:5432/postgres`
      });
      await client.connect();
      connected = true;
      if (pw !== 'postgres') {
        console.log('[FastPOS DB] Setting password for user postgres to "postgres"...');
        await client.query("ALTER USER postgres WITH PASSWORD 'postgres'");
      }
      break;
    } catch {
      // try next
    }
  }

  if (connected && client) {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'app_db'");
    if (res.rowCount === 0) {
      console.log('[FastPOS DB] Creating database app_db...');
      await client.query('CREATE DATABASE app_db');
    }
    await client.end();
  }

  console.log('[FastPOS DB] PostgreSQL is ready and listening on port 5432.');
}

if (require.main === module) {
  const command = process.argv[2] || 'start';
  if (command === 'start') {
    initAndStart().catch((err) => {
      console.error('[FastPOS DB] Error starting database:', err);
      process.exit(1);
    });
  }
}

module.exports = { initAndStart, isPortOpen };

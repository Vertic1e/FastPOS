const { spawn } = require('child_process');
const path = require('path');
const { initAndStart } = require('./db');

async function main() {
  try {
    await initAndStart();
  } catch (err) {
    console.error('[FastPOS] Failed to initialize database:', err);
    process.exit(1);
  }

  console.log('[FastPOS] Starting Next.js development server...');
  const nextBin = path.resolve(__dirname, '../node_modules/.bin/next' + (process.platform === 'win32' ? '.cmd' : ''));
  const nextProcess = spawn(nextBin, ['dev', '--webpack'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/app_db' },
  });

  nextProcess.on('error', (err) => {
    console.error('[FastPOS] Next.js process error:', err);
  });

  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  const cleanup = () => {
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill('SIGINT');
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();

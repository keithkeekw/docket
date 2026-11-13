import { spawn } from 'node:child_process';
import { applyUpdate, recoverInterruptedUpdate, REPO_ROOT } from './update.mjs';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const USE_SHELL = process.platform === 'win32';

let server = null;
let stopping = false;
let restartTimer = null;

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(NPM, ['run', 'build'], {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: 'inherit',
      shell: USE_SHELL,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run build exited with ${code ?? signal}`));
    });
  });
}

function scheduleRestart() {
  if (stopping || restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startServer();
  }, 1500);
}

function startServer() {
  if (stopping) return;

  server = spawn(NPM, ['-w', 'server', 'run', 'start'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DOCKET_SUPERVISED: '1',
    },
    stdio: 'inherit',
    shell: USE_SHELL,
  });

  server.on('error', (error) => {
    console.error(`Could not start Docket: ${error.message}`);
    scheduleRestart();
  });

  server.on('exit', (code, signal) => {
    server = null;
    if (stopping) {
      process.exit(0);
      return;
    }

    if (code === 75) {
      void applyUpdate().then((updated) => {
        if (!updated) console.error('Starting the previous version after the failed update.');
        startServer();
      });
      return;
    }

    if (code === 0) {
      process.exit(0);
      return;
    }

    console.error(`Docket stopped (${code ?? signal}). Restarting in a moment…`);
    scheduleRestart();
  });
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (server) server.kill(signal);
  else process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  recoverInterruptedUpdate();
  console.log('Building the web app…');
  try {
    await runBuild();
  } catch (error) {
    console.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('Starting Docket…');
  startServer();
}

void main();

export { REPO_ROOT };

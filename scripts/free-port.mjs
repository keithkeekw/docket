import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Stops whatever is still listening on the server's port (usually a server
 * left over from an earlier run) so the new one can bind. Works on macOS,
 * Linux and Windows, and never fails the start: if nothing is listening or the
 * lookup tool is missing, it does nothing.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function configuredPort() {
  if (process.env.PORT) return Number(process.env.PORT);
  try {
    const env = fs.readFileSync(path.join(REPO_ROOT, '.env'), 'utf8');
    const match = /^\s*PORT\s*=\s*["']?(\d+)/m.exec(env);
    if (match) return Number(match[1]);
  } catch {
    // No .env: the server uses its default port too.
  }
  return 9000;
}

function listeningPids(port) {
  try {
    if (process.platform === 'win32') {
      const output = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
      return output
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        .filter(
          ([proto, local, , state]) =>
            proto === 'TCP' && state === 'LISTENING' && local?.endsWith(`:${port}`),
        )
        .map((columns) => Number(columns[4]));
    }
    const output = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    });
    return output.split('\n').map(Number);
  } catch {
    // lsof exits 1 when nothing listens; a missing tool means there is nothing to do.
    return [];
  }
}

const port = configuredPort();
const pids = new Set(listeningPids(port).filter((pid) => pid > 0 && pid !== process.pid));

for (const pid of pids) {
  try {
    process.kill(pid, 'SIGKILL');
    console.log(`Stopped process ${pid} that was using port ${port}.`);
  } catch {
    // Already gone, or owned by another user.
  }
}

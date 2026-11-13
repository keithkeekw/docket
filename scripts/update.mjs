import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const USE_SHELL = process.platform === 'win32';
const TAG_PATTERN = /^v?\d+\.\d+\.\d+$/;

function dataDir() {
  return process.env.DOCKET_UPDATE_DATA_DIR
    ? path.resolve(process.env.DOCKET_UPDATE_DATA_DIR)
    : path.join(REPO_ROOT, 'data');
}

function stateFile() {
  return path.join(dataDir(), 'update-state.json');
}

function requestFile() {
  return path.join(dataDir(), 'update-request.json');
}

function databasePath() {
  const configured = process.env.DATABASE_PATH?.trim();
  return configured ? path.resolve(REPO_ROOT, configured) : path.join(dataDir(), 'app.db');
}

function writeState(state, tag, message = null, startedAt = null) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(
    stateFile(),
    `${JSON.stringify(
      {
        state,
        tag: tag ?? null,
        message,
        startedAt,
        finishedAt: state === 'done' || state === 'error' ? new Date().toISOString() : null,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function readRequest() {
  try {
    const parsed = JSON.parse(fs.readFileSync(requestFile(), 'utf8'));
    if (typeof parsed.tag !== 'string' || !TAG_PATTERN.test(parsed.tag)) return null;
    return {
      tag: parsed.tag,
      requestedAt: typeof parsed.requestedAt === 'string' ? parsed.requestedAt : null,
    };
  } catch {
    return null;
  }
}

function clearRequest() {
  try {
    fs.rmSync(requestFile(), { force: true });
  } catch {
    // The next request overwrites it.
  }
}

async function git(args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: REPO_ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(NPM, args, {
      cwd: REPO_ROOT,
      // The updater needs Vite, tsx and drizzle-kit even if the server itself
      // runs with NODE_ENV=production.
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'inherit',
      shell: USE_SHELL,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} exited with ${code ?? signal}`));
    });
  });
}

function backupDatabase() {
  const source = databasePath();
  if (!fs.existsSync(source)) return Promise.resolve(null);

  const targetDir = path.join(path.dirname(source), 'backups');
  fs.mkdirSync(targetDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(targetDir, `pre-update-${stamp}.db`);

  // Run the native SQLite backup in a child process. On Windows the .node
  // module stays locked for the lifetime of the process that loaded it, which
  // would make the following `npm ci` fail.
  const script = `
    import Database from 'better-sqlite3';
    const db = new Database(process.env.DOCKET_BACKUP_SOURCE, { readonly: true, fileMustExist: true });
    await db.backup(process.env.DOCKET_BACKUP_TARGET);
    db.close();
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DOCKET_BACKUP_SOURCE: source,
        DOCKET_BACKUP_TARGET: target,
      },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve(target);
      else reject(new Error(`Database backup exited with ${code ?? signal}`));
    });
  });
}

function restoreDatabase(backup) {
  if (!backup || !fs.existsSync(backup)) return;
  const target = databasePath();
  fs.copyFileSync(backup, target);
  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(`${target}${suffix}`, { force: true });
  }
}

/**
 * Applies a pending `data/update-request.json`. The supervisor calls this after
 * the server exits; the server is stopped, so no files or native modules are in
 * use while `npm ci` replaces node_modules.
 */
export async function applyUpdate() {
  const request = readRequest();
  if (!request) {
    console.error('Update requested, but data/update-request.json is missing or invalid.');
    return false;
  }

  const tag = request.tag;
  const startedAt = new Date().toISOString();
  writeState('updating', tag, null, startedAt);
  console.log(`\nUpdating Docket to ${tag}…`);

  let backup = null;
  let previousRef = null;
  let previousBranch = null;
  let checkoutStarted = false;

  try {
    const dirty = await git(['status', '--porcelain', '--untracked-files=no']);
    if (dirty) {
      const preview = dirty.split('\n').slice(0, 8).join('\n');
      throw new Error(`Local changes block the update. Commit or stash them first:\n${preview}`);
    }

    previousRef = await git(['rev-parse', 'HEAD']);
    previousBranch = await git(['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '');

    backup = await backupDatabase();
    if (backup) console.log(`Database backup: ${path.relative(REPO_ROOT, backup)}`);

    console.log('Fetching release tags…');
    await git(['fetch', '--tags', '--force', 'origin']);

    const resolved = await git(['rev-parse', '--verify', `refs/tags/${tag}`]).catch(() => '');
    if (!resolved) {
      await git(['fetch', 'origin', 'tag', tag]);
    }

    console.log(`Checking out ${tag}…`);
    checkoutStarted = true;
    await git(['checkout', '--detach', tag]);

    console.log('Installing dependencies…');
    await runNpm(['ci', '--include=dev']);

    console.log('Building the web app…');
    await runNpm(['run', 'build']);

    console.log('Applying database migrations…');
    await runNpm(['-w', 'server', 'run', 'db:migrate']);

    clearRequest();
    writeState('done', tag, null, startedAt);
    console.log(`Updated to ${tag}. Restarting…\n`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Update failed: ${message}`);

    if (checkoutStarted && previousRef) {
      try {
        console.log('Rolling back to the previous checkout…');
        await git(['checkout', previousBranch || previousRef]);
        await runNpm(['ci', '--include=dev']);
        await runNpm(['run', 'build']);
      } catch (rollbackError) {
        console.error(
          `Rollback could not rebuild the previous version: ${
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          }`,
        );
      }
    }

    restoreDatabase(backup);
    clearRequest();
    writeState('error', tag, message, startedAt);
    return false;
  }
}

/** A crashed/killed update should not leave the UI polling forever. */
export function recoverInterruptedUpdate() {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (parsed.state === 'requested' || parsed.state === 'updating') {
      writeState(
        'error',
        typeof parsed.tag === 'string' ? parsed.tag : null,
        'The previous update was interrupted before it finished. Check the app and try again.',
        typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
      );
      clearRequest();
    }
  } catch {
    // No state file yet.
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ok = await applyUpdate();
  process.exit(ok ? 0 : 1);
}

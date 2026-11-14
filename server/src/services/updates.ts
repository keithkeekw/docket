import fs from 'node:fs';
import path from 'node:path';
import { APP_NAME, type UpdateInfo, type UpdateStatus } from '@app/shared';
import { REPO_ROOT } from '../env';

/** A local app can check often, but GitHub's anonymous limit is 60 requests/hour. */
const CACHE_MS = 10 * 60_000;
const ERROR_CACHE_MS = 60_000;

type GitHubRelease = {
  tag_name?: unknown;
  name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  body?: unknown;
  draft?: unknown;
  prerelease?: unknown;
};

type CacheEntry = { at: number; info: UpdateInfo };

let cache: CacheEntry | null = null;

export function resetUpdateCache(): void {
  cache = null;
}

/** Tests override this; production uses `<repo>/data`. */
export function updateDataDir(): string {
  return process.env.DOCKET_UPDATE_DATA_DIR
    ? path.resolve(process.env.DOCKET_UPDATE_DATA_DIR)
    : path.join(REPO_ROOT, 'data');
}

/** Tests override the folder; production checks the app's own root. */
export function isGitCheckout(): boolean {
  const root = process.env.DOCKET_CHECKOUT_DIR
    ? path.resolve(process.env.DOCKET_CHECKOUT_DIR)
    : REPO_ROOT;
  return fs.existsSync(path.join(root, '.git'));
}

function stateFile(): string {
  return path.join(updateDataDir(), 'update-state.json');
}

function requestFile(): string {
  return path.join(updateDataDir(), 'update-request.json');
}

export function readCurrentVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      version?: unknown;
    };
    return typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version.trim() : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/** Numeric semver comparison; pre-release suffixes are ignored. */
export function compareVersions(left: string, right: string): number {
  const parts = (value: string) =>
    normalizeVersion(value)
      .split('-')[0]
      ?.split('.')
      .map((part) => Number.parseInt(part, 10) || 0) ?? [];

  const a = parts(left);
  const b = parts(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }

  return 0;
}

export function isUpdateTag(value: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(value);
}

export function githubRepo(): string {
  return process.env.DOCKET_GITHUB_REPO?.trim() || 'keithkeekw/docket';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function fetchLatestRelease(): Promise<UpdateInfo['latest']> {
  const repo = githubRepo();
  const token = process.env.GITHUB_TOKEN?.trim();

  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${APP_NAME}-updater`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

  const payload = (await response.json()) as GitHubRelease;
  const tag = asString(payload.tag_name).trim();
  if (!tag || payload.draft === true || payload.prerelease === true) return null;
  // Only tags the apply endpoint can check out and the updater can parse.
  if (!isUpdateTag(tag)) return null;

  return {
    tag,
    version: normalizeVersion(tag),
    name: asString(payload.name).trim() || tag,
    url: asString(payload.html_url),
    publishedAt: asString(payload.published_at),
    notes: asString(payload.body),
  };
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
  const now = Date.now();
  if (cache && now - cache.at < (cache.info.checkError ? ERROR_CACHE_MS : CACHE_MS)) {
    return { ...cache.info, gitCheckout: isGitCheckout() };
  }

  const currentVersion = readCurrentVersion();
  let latest: UpdateInfo['latest'] = null;
  let checkError: string | null = null;

  try {
    latest = await fetchLatestRelease();
  } catch (error) {
    checkError = error instanceof Error ? error.message : 'Could not check GitHub releases';
  }

  const info: UpdateInfo = {
    currentVersion,
    repository: githubRepo(),
    checkedAt: new Date().toISOString(),
    updateAvailable: latest ? compareVersions(latest.version, currentVersion) > 0 : false,
    latest,
    checkError,
    gitCheckout: isGitCheckout(),
  };

  cache = { at: now, info };
  return info;
}

const STATES: ReadonlyArray<UpdateStatus['state']> = [
  'idle',
  'requested',
  'updating',
  'done',
  'error',
];

export function readUpdateStatus(): UpdateStatus {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as Partial<UpdateStatus>;
    const state = STATES.includes(parsed.state as UpdateStatus['state'])
      ? (parsed.state as UpdateStatus['state'])
      : 'idle';

    return {
      state,
      tag: typeof parsed.tag === 'string' ? parsed.tag : null,
      message: typeof parsed.message === 'string' ? parsed.message : null,
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
      finishedAt: typeof parsed.finishedAt === 'string' ? parsed.finishedAt : null,
    };
  } catch {
    return { state: 'idle', tag: null, message: null, startedAt: null, finishedAt: null };
  }
}

export function writeUpdateStatus(status: UpdateStatus): void {
  fs.mkdirSync(updateDataDir(), { recursive: true });
  fs.writeFileSync(stateFile(), `${JSON.stringify(status, null, 2)}\n`, 'utf8');
}

export function writeUpdateRequest(tag: string): void {
  fs.mkdirSync(updateDataDir(), { recursive: true });
  fs.writeFileSync(
    requestFile(),
    `${JSON.stringify({ tag, requestedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
}

/** The supervisor sets this flag; only then can the server hand over an update. */
export function isSupervised(): boolean {
  return process.env.DOCKET_SUPERVISED === '1';
}

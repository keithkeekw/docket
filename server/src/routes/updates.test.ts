import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUpdateRoutes } from './updates';
import { resetUpdateCache } from '../services/updates';

const release = {
  tag_name: 'v99.0.0',
  name: 'Docket 99',
  html_url: 'https://github.com/keithkeekw/docket/releases/tag/v99.0.0',
  published_at: '2026-11-14T00:00:00Z',
  body: 'Release notes',
  draft: false,
  prerelease: false,
};

let dataDir: string;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docket-updates-'));
  process.env.DOCKET_UPDATE_DATA_DIR = dataDir;
  process.env.DOCKET_GITHUB_REPO = 'keithkeekw/docket';
  delete process.env.DOCKET_SUPERVISED;
  delete process.env.GITHUB_TOKEN;
  resetUpdateCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DOCKET_UPDATE_DATA_DIR;
  delete process.env.DOCKET_GITHUB_REPO;
  delete process.env.DOCKET_SUPERVISED;
  fs.rmSync(dataDir, { recursive: true, force: true });
  resetUpdateCache();
});

function app() {
  const instance = new Hono();
  registerUpdateRoutes(instance);
  return instance;
}

describe('GET /api/updates', () => {
  it('reports a newer GitHub release', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(release), { status: 200 })),
    );

    const response = await app().request('/api/updates');
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      latest: { tag: string };
      updateAvailable: boolean;
      currentVersion: string;
    };
    expect(body.latest.tag).toBe('v99.0.0');
    expect(body.updateAvailable).toBe(true);
    expect(body.currentVersion).not.toBe('99.0.0');
  });

  it('handles a repository without releases', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Not found', { status: 404 })),
    );

    const body = (await (await app().request('/api/updates')).json()) as {
      latest: null;
      updateAvailable: boolean;
      checkError: string | null;
    };
    expect(body.latest).toBeNull();
    expect(body.updateAvailable).toBe(false);
    expect(body.checkError).toBeNull();
  });

  it('bypasses the server cache for an explicit check', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(release), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await app().request('/api/updates');
    await app().request('/api/updates');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await app().request('/api/updates?refresh=1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the app usable when GitHub is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    const body = (await (await app().request('/api/updates')).json()) as {
      latest: null;
      checkError: string | null;
    };
    expect(body.latest).toBeNull();
    expect(body.checkError).toBe('offline');
  });
});

describe('POST /api/updates/apply', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(release), { status: 200 })),
    );
  });

  it('rejects an unknown tag', async () => {
    const response = await app().request('/api/updates/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: 'v1.2.3' }),
    });

    expect(response.status).toBe(409);
  });

  it('rejects malformed tags', async () => {
    const response = await app().request('/api/updates/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: 'master' }),
    });

    expect(response.status).toBe(400);
  });

  it('requires the supervised start script', async () => {
    const response = await app().request('/api/updates/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: 'v99.0.0' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('npm start'),
    });
  });

  it('refuses to update a copy that is not a git clone', async () => {
    process.env.DOCKET_SUPERVISED = '1';
    process.env.DOCKET_CHECKOUT_DIR = dataDir;
    try {
      const response = await app().request('/api/updates/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tag: 'v99.0.0' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: expect.stringContaining('git clone'),
      });
      expect(fs.existsSync(path.join(dataDir, 'update-request.json'))).toBe(false);
    } finally {
      delete process.env.DOCKET_CHECKOUT_DIR;
    }
  });
});

describe('git checkout detection', () => {
  it('reports whether the app folder is a git clone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(release), { status: 200 })),
    );
    process.env.DOCKET_CHECKOUT_DIR = dataDir;
    try {
      const plain = (await (await app().request('/api/updates')).json()) as {
        gitCheckout: boolean;
      };
      expect(plain.gitCheckout).toBe(false);

      fs.mkdirSync(path.join(dataDir, '.git'));
      const cloned = (await (await app().request('/api/updates')).json()) as {
        gitCheckout: boolean;
      };
      expect(cloned.gitCheckout).toBe(true);
    } finally {
      delete process.env.DOCKET_CHECKOUT_DIR;
    }
  });
});

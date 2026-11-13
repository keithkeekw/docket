import {
  backupListSchema,
  restoreResponseSchema,
  taskListSchema,
} from '@app/shared';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let app: ReturnType<typeof createApp>;
let dir: string;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-backups-'));
  app = createApp(db, { backupsDir: dir });
});

afterEach(() => {
  sqlite.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const json = { 'content-type': 'application/json' };

async function createTask(title: string) {
  await app.request('/api/tasks', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ title }),
  });
}

async function backup() {
  const response = await app.request('/api/backup', { method: 'POST' });
  expect(response.status).toBe(201);
  return (await response.json()) as any;
}

async function list() {
  return backupListSchema.parse(await (await app.request('/api/backups')).json()).backups;
}

async function titles() {
  const body = taskListSchema.parse(await (await app.request('/api/tasks')).json());
  return body.tasks.map((task) => task.title).sort();
}

describe('POST /api/backup', () => {
  it('writes a timestamped copy into the backup directory and lists it', async () => {
    const { backup: entry } = await backup();

    expect(entry.file).toMatch(/^app-.+\.db$/);
    expect(entry.sizeBytes).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(dir, entry.file))).toBe(true);

    const backups = await list();
    expect(backups.map((row) => row.file)).toEqual([entry.file]);
  });

  it('lists newest first', async () => {
    const first = (await backup()).backup;
    await new Promise((resolve) => setTimeout(resolve, 15));
    const second = (await backup()).backup;

    const backups = await list();
    expect(backups.map((row) => row.file)).toEqual([second.file, first.file]);
  });
});

describe('POST /api/restore', () => {
  it('brings back the exact data from the backup', async () => {
    await createTask('Keep me');
    const snapshot = (await backup()).backup;

    await createTask('Remove me');
    expect(await titles()).toEqual(['Keep me', 'Remove me']);

    const response = await app.request('/api/restore', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ file: snapshot.file }),
    });

    expect(response.status).toBe(200);
    expect(restoreResponseSchema.parse(await response.json()).restored).toBe(snapshot.file);
    expect(await titles()).toEqual(['Keep me']);
  });

  it('keeps every table in step, not just tasks', async () => {
    await app.request('/api/projects', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ name: 'Before' }),
    });
    const snapshot = (await backup()).backup;

    await app.request('/api/projects', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ name: 'After' }),
    });

    await app.request('/api/restore', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ file: snapshot.file }),
    });

    const projects = (await (await app.request('/api/projects')).json()) as any;
    expect(projects.projects.map((project: { name: string }) => project.name)).toEqual(['Before']);
    expect((await (await app.request('/api/statuses')).json()) as any).toMatchObject({
      statuses: expect.any(Array),
    });
    expect(((await (await app.request('/api/statuses')).json()) as any).statuses).toHaveLength(5);
  });

  it('takes a safety snapshot before replacing anything', async () => {
    await createTask('Keep me');
    const snapshot = (await backup()).backup;

    await app.request('/api/restore', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ file: snapshot.file }),
    });

    const backups = await list();
    expect(backups).toHaveLength(2);
    expect(backups.some((row) => row.file.startsWith('pre-restore-'))).toBe(true);
  });

  it('rejects a path instead of a backup name', async () => {
    const traversal = await app.request('/api/restore', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ file: '../app.db' }),
    });
    expect(traversal.status).toBe(400);

    const missing = await app.request('/api/restore', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ file: 'app-nope.db' }),
    });
    expect(missing.status).toBe(404);
  });
});

describe('GET /api/backups/:file', () => {
  it('serves the backup as a download', async () => {
    const entry = (await backup()).backup;

    const response = await app.request(`/api/backups/${entry.file}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain(entry.file);

    const body = new Uint8Array(await response.arrayBuffer());
    expect(body.byteLength).toBe(entry.sizeBytes);
  });

  it('refuses anything that is not a backup', async () => {
    const response = await app.request('/api/backups/..%2Fapp.db');
    expect([400, 404]).toContain(response.status);
  });
});

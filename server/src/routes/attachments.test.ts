import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  taskAttachmentResponseSchema,
  taskDetailResponseSchema,
  type TaskAttachment,
} from '@app/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let uploadsDir: string;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docket-attachments-'));
  app = createApp(db, { uploadsDir });
});

afterEach(() => {
  sqlite.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

async function createTask(): Promise<string> {
  const response = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Upload target' }),
  });

  expect(response.status).toBe(201);
  const body = (await response.json()) as { task: { id: string } };
  return body.task.id;
}

function upload(taskId: string, name: string, contents: string, type: string) {
  const form = new FormData();
  form.set('file', new File([contents], name, { type }));
  return app.request(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: form });
}

async function detail(taskId: string) {
  const response = await app.request(`/api/tasks/${taskId}`);
  expect(response.status).toBe(200);
  return taskDetailResponseSchema.parse(await response.json()).task;
}

describe('task attachments (FR-31)', () => {
  it('saves an upload on disk and returns it with the task detail', async () => {
    const taskId = await createTask();

    const response = await upload(taskId, 'notes.txt', 'hello world', 'text/plain');
    expect(response.status).toBe(201);

    const attachment = taskAttachmentResponseSchema.parse(await response.json()).attachment;
    expect(attachment).toMatchObject({
      taskId,
      filename: 'notes.txt',
      mimeType: 'text/plain',
      sizeBytes: 11,
    });

    expect((await detail(taskId)).attachments).toEqual([attachment]);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(1);
  });

  it('downloads the saved bytes with a content disposition', async () => {
    const taskId = await createTask();
    const created = taskAttachmentResponseSchema.parse(
      await (await upload(taskId, 'notes.txt', 'hello world', 'text/plain')).json(),
    ).attachment;

    const response = await app.request(`/api/attachments/${created.id}/download`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('content-disposition')).toContain('notes.txt');
    expect(await response.text()).toBe('hello world');
  });

  it('removes the row and the file', async () => {
    const taskId = await createTask();
    const attachment: TaskAttachment = taskAttachmentResponseSchema.parse(
      await (await upload(taskId, 'notes.txt', 'hello', 'text/plain')).json(),
    ).attachment;

    const response = await app.request(`/api/attachments/${attachment.id}`, { method: 'DELETE' });

    expect(response.status).toBe(204);
    expect((await detail(taskId)).attachments).toEqual([]);
    expect(fs.readdirSync(uploadsDir)).toHaveLength(0);
    await expect(
      app.request(`/api/attachments/${attachment.id}/download`),
    ).resolves.toMatchObject({ status: 404 });
  });

  it('supports several files on one task, in upload order', async () => {
    const taskId = await createTask();

    await upload(taskId, 'first.txt', 'one', 'text/plain');
    await upload(taskId, 'second.txt', 'two', 'text/plain');

    expect((await detail(taskId)).attachments.map((entry) => entry.filename)).toEqual([
      'first.txt',
      'second.txt',
    ]);
  });

  it('rejects an empty file, a missing part and an unknown task', async () => {
    const taskId = await createTask();

    expect((await upload(taskId, 'empty.txt', '', 'text/plain')).status).toBe(400);

    const missing = await app.request(`/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: new FormData(),
    });
    expect(missing.status).toBe(400);

    expect((await upload('missing-task', 'notes.txt', 'x', 'text/plain')).status).toBe(404);
  });

  it('strips directory components from the original filename', async () => {
    const taskId = await createTask();

    const attachment = taskAttachmentResponseSchema.parse(
      await (await upload(taskId, '../../etc/passwd', 'x', 'text/plain')).json(),
    ).attachment;

    expect(attachment.filename).toBe('passwd');
  });
});

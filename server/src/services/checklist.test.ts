import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taskAttachments, statuses, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { createTestDb } from '../test/helpers';
import { extractAttachmentText } from './attachment-text';
import { addChecklistItem, generateChecklist } from './checklist';

vi.mock('word-extractor', () => ({
  default: class {
    async extract() {
      return { getBody: () => 'DOCX body: replace the old vendor form.' };
    }
  },
}));

let sqlite: ReturnType<typeof createTestDb>['sqlite'];
let db: Db;
let uploadsDir: string;

beforeEach(() => {
  ({ sqlite, db } = createTestDb());
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docket-checklist-'));
});

afterEach(() => {
  sqlite.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

function createTask(title: string, notes: string | null = null) {
  const status = db.select().from(statuses).get();
  if (!status) throw new Error('Statuses are not seeded');

  return db
    .insert(tasks)
    .values({ title, notes, statusId: status.id })
    .returning()
    .get();
}

function attach(taskId: string, filename: string, mimeType: string, contents: string) {
  const storageName = `${randomUUID()}${path.extname(filename)}`;
  fs.writeFileSync(path.join(uploadsDir, storageName), contents);
  db.insert(taskAttachments)
    .values({
      taskId,
      filename,
      storageName,
      mimeType,
      sizeBytes: Buffer.byteLength(contents),
    })
    .run();
}

describe('attachment text for checklist context', () => {
  it('reads text files and reports unsupported ones without failing', async () => {
    const task = createTask('Prepare the vendor form');
    attach(task.id, 'quote.txt', 'text/plain', 'Vendor quote: 3 units at RM 40.');
    attach(task.id, 'scan.pdf', 'application/pdf', 'not really a pdf');

    const result = await extractAttachmentText(db, task.id, uploadsDir);

    expect(result.text).toContain('Vendor quote: 3 units at RM 40.');
    expect(result.text).toContain('--- quote.txt ---');
    expect(result.skipped).toContain('scan.pdf (unsupported file type)');
  });

  it('routes .doc and .docx through the Word extractor', async () => {
    const task = createTask('Update the form');
    attach(task.id, 'old-form.doc', 'application/msword', 'legacy bytes');
    attach(task.id, 'new-form.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'zip bytes');

    const result = await extractAttachmentText(db, task.id, uploadsDir);

    expect(result.text).toContain('DOCX body: replace the old vendor form.');
    expect(result.text).toContain('--- old-form.doc ---');
    expect(result.text).toContain('--- new-form.docx ---');
  });

  it('includes notes and attachment text in the checklist prompt', async () => {
    const task = createTask('Prepare the vendor form', 'Use the attached quote.');
    attach(task.id, 'quote.txt', 'text/plain', 'Vendor quote: 3 units at RM 40.');

    let capturedUser = '';
    const items = await generateChecklist(db, task.id, uploadsDir, {
      complete: async ({ user }) => {
        capturedUser = user;
        return { text: '{"items":["Read the quote","Draft the vendor form"]}', model: 'stub' };
      },
    });

    expect(items.items).toEqual(['Read the quote', 'Draft the vendor form']);
    expect(capturedUser).toContain('Task: Prepare the vendor form');
    expect(capturedUser).toContain('Notes: Use the attached quote.');
    expect(capturedUser).toContain('Vendor quote: 3 units at RM 40.');
    expect(capturedUser).toContain('--- quote.txt ---');
    expect(capturedUser).toContain('reference only');
  });

  it('sends existing items and drops suggestions that repeat them', async () => {
    const task = createTask('Prepare the vendor form');
    addChecklistItem(db, task.id, { title: 'Read the quote' });

    let capturedUser = '';
    const items = await generateChecklist(db, task.id, uploadsDir, {
      complete: async ({ user }) => {
        capturedUser = user;
        return {
          text: '{"items":["read the quote.","Draft the vendor form","Draft the vendor form"]}',
          model: 'stub',
        };
      },
    });

    expect(capturedUser).toContain('Existing checklist items:\n- Read the quote');
    expect(items.items).toEqual(['Draft the vendor form']);
  });

  it('caps a generated checklist at 12 items', async () => {
    const task = createTask('Plan the offsite');
    const many = Array.from({ length: 20 }, (_, index) => `Step ${index + 1}`);

    const items = await generateChecklist(db, task.id, uploadsDir, {
      complete: async () => ({ text: JSON.stringify({ items: many }), model: 'stub' }),
    });

    expect(items.items).toHaveLength(12);
  });
});

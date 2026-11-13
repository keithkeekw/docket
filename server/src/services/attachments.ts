import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MAX_ATTACHMENT_BYTES, type TaskAttachment } from '@app/shared';
import { asc, eq, sql } from 'drizzle-orm';
import { taskAttachments, tasks } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

const attachmentSelection = {
  id: taskAttachments.id,
  taskId: taskAttachments.taskId,
  filename: taskAttachments.filename,
  mimeType: taskAttachments.mimeType,
  sizeBytes: taskAttachments.sizeBytes,
  createdAt: taskAttachments.createdAt,
};

export type AttachmentUpload = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

/** Strip directory parts and control characters; keep a readable, bounded name. */
function safeFilename(name: string): string {
  const base = Array.from(path.basename(name))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
  return (base || 'file').slice(0, 200);
}

/** Random on-disk name so two uploads called "notes.txt" never collide. */
function storageNameFor(filename: string): string {
  const extension = path.extname(filename).replace(/[^.\w-]/g, '').slice(0, 20);
  return `${randomUUID()}${extension}`;
}

export function listAttachments(db: Db, taskId: string): TaskAttachment[] {
  return db
    .select(attachmentSelection)
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    // Uploads within the same millisecond keep insertion order (SQLite rowid).
    .orderBy(asc(taskAttachments.createdAt), sql`rowid`)
    .all();
}

/** `POST /api/tasks/:id/attachments` — bytes on disk, metadata in SQLite. */
export function addAttachment(
  db: Db,
  taskId: string,
  upload: AttachmentUpload,
  uploadsDir: string,
): TaskAttachment {
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new ServiceError('Task not found', 404);

  if (upload.data.byteLength === 0) {
    throw new ServiceError('The file is empty.', 400);
  }
  if (upload.data.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new ServiceError('Files must be 10 MB or smaller.', 400);
  }

  const filename = safeFilename(upload.filename);
  const storageName = storageNameFor(filename);
  const filePath = path.join(uploadsDir, storageName);

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(filePath, upload.data);

  try {
    return db
      .insert(taskAttachments)
      .values({
        taskId,
        filename,
        storageName,
        mimeType: upload.mimeType || 'application/octet-stream',
        sizeBytes: upload.data.byteLength,
      })
      .returning(attachmentSelection)
      .get();
  } catch (error) {
    fs.rmSync(filePath, { force: true });
    throw error;
  }
}

export function getAttachmentFile(
  db: Db,
  id: string,
  uploadsDir: string,
): { attachment: TaskAttachment; filePath: string } {
  const row = db
    .select({ ...attachmentSelection, storageName: taskAttachments.storageName })
    .from(taskAttachments)
    .where(eq(taskAttachments.id, id))
    .get();

  if (!row) throw new ServiceError('Attachment not found', 404);

  const { storageName, ...attachment } = row;
  const filePath = path.join(uploadsDir, path.basename(storageName));
  if (!fs.existsSync(filePath)) {
    throw new ServiceError('Attachment file is missing from disk', 404);
  }

  return { attachment, filePath };
}

export function deleteAttachment(db: Db, id: string, uploadsDir: string): void {
  const row = db
    .select({ storageName: taskAttachments.storageName })
    .from(taskAttachments)
    .where(eq(taskAttachments.id, id))
    .get();

  if (!row) throw new ServiceError('Attachment not found', 404);

  db.delete(taskAttachments).where(eq(taskAttachments.id, id)).run();
  fs.rmSync(path.join(uploadsDir, path.basename(row.storageName)), { force: true });
}

/**
 * Delete files that no row references. Called at startup so a crash between
 * deleting a task and its rows (or a backup restore) cannot leak bytes forever.
 */
export function pruneOrphanAttachmentFiles(db: Db, uploadsDir: string): void {
  if (!fs.existsSync(uploadsDir)) return;

  const kept = new Set(
    db
      .select({ storageName: taskAttachments.storageName })
      .from(taskAttachments)
      .all()
      .map((row) => row.storageName),
  );

  for (const entry of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
    if (!entry.isFile() || kept.has(entry.name)) continue;
    fs.rmSync(path.join(uploadsDir, entry.name), { force: true });
  }
}

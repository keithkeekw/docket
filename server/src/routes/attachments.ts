import fs from 'node:fs';
import type { Hono } from 'hono';
import type { Db } from '../db/types';
import { addAttachment, deleteAttachment, getAttachmentFile } from '../services/attachments';

type UploadedFile = {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function asUpload(value: unknown): UploadedFile | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as { name?: unknown; type?: unknown; arrayBuffer?: unknown };
  if (typeof candidate.name !== 'string' || typeof candidate.arrayBuffer !== 'function') {
    return null;
  }

  return candidate as UploadedFile;
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function registerAttachmentRoutes(app: Hono, db: Db, uploadsDir: string): void {
  // multipart/form-data with one `file` part; the bytes go to disk, the row
  // keeps the original name, type and size (FR-31).
  app.post('/api/tasks/:id/attachments', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json({ error: 'Expected a multipart file upload.' }, 400);
    }

    const raw = body.file ?? body.files;
    const file = asUpload(Array.isArray(raw) ? raw[0] : raw);
    if (!file) return c.json({ error: 'Choose a file to upload.' }, 400);

    const data = Buffer.from(await file.arrayBuffer());
    const attachment = addAttachment(
      db,
      c.req.param('id'),
      {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        data,
      },
      uploadsDir,
    );

    return c.json({ attachment }, 201);
  });

  app.get('/api/attachments/:id/download', (c) => {
    const { attachment, filePath } = getAttachmentFile(db, c.req.param('id'), uploadsDir);
    const data = fs.readFileSync(filePath);

    return c.body(new Uint8Array(data), 200, {
      'Content-Type': attachment.mimeType,
      'Content-Length': String(data.byteLength),
      'Content-Disposition': contentDisposition(attachment.filename),
    });
  });

  app.delete('/api/attachments/:id', (c) => {
    deleteAttachment(db, c.req.param('id'), uploadsDir);
    return c.body(null, 204);
  });
}

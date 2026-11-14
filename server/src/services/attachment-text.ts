import fs from 'node:fs';
import path from 'node:path';
import WordExtractor from 'word-extractor';
import { asc, eq } from 'drizzle-orm';
import { taskAttachments } from '../db/schema';
import type { Db } from '../db/types';

const MAX_FILES = 6;
const MAX_CHARS_PER_FILE = 6_000;
const MAX_TOTAL_CHARS = 18_000;

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.text',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.json',
  '.log',
  '.yaml',
  '.yml',
  '.xml',
]);

const WORD_EXTENSIONS = new Set(['.doc', '.docx']);

function cleanText(value: string): string {
  const printable = Array.from(value.replace(/\r\n?/g, '\n'))
    .filter((character) => {
      if (character === '\n' || character === '\t') return true;
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

  return printable.replace(/\n{3,}/g, '\n\n').trim();
}

export type AttachmentText = {
  /** Readable file text, already labelled and capped. */
  text: string;
  /** Filenames that were present but not sent, with a short reason. */
  skipped: string[];
};

/**
 * Reads the task's text-like attachments (txt/md/csv/json/… and Word
 * .doc/.docx) for the AI checklist prompt. Files are capped so a large upload
 * cannot blow up the request; unreadable files are reported, not fatal.
 */
export async function extractAttachmentText(
  db: Db,
  taskId: string,
  uploadsDir: string,
): Promise<AttachmentText> {
  const rows = db
    .select({
      filename: taskAttachments.filename,
      storageName: taskAttachments.storageName,
      mimeType: taskAttachments.mimeType,
      createdAt: taskAttachments.createdAt,
    })
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.createdAt), asc(taskAttachments.id))
    .all();

  const chunks: string[] = [];
  const skipped: string[] = [];
  let total = 0;
  const extractor = new WordExtractor();

  for (const [index, attachment] of rows.entries()) {
    if (index >= MAX_FILES) {
      skipped.push(`${attachment.filename} (over the file limit)`);
      continue;
    }
    if (total >= MAX_TOTAL_CHARS) {
      skipped.push(`${attachment.filename} (context limit reached)`);
      continue;
    }

    const extension = path.extname(attachment.filename).toLowerCase();
    const mime = attachment.mimeType.toLowerCase();
    const isText =
      TEXT_EXTENSIONS.has(extension) || mime.startsWith('text/') || mime === 'application/json';
    const isWord =
      WORD_EXTENSIONS.has(extension) ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isText && !isWord) {
      skipped.push(`${attachment.filename} (unsupported file type)`);
      continue;
    }

    const filePath = path.join(uploadsDir, path.basename(attachment.storageName));

    try {
      let raw: string;

      if (isWord) {
        const document = await extractor.extract(filePath);
        raw = document.getBody();
      } else {
        raw = await fs.promises.readFile(filePath, 'utf8');
      }

      const text = cleanText(raw);
      if (!text) {
        skipped.push(`${attachment.filename} (no readable text)`);
        continue;
      }

      const remaining = MAX_TOTAL_CHARS - total;
      const take = text.slice(0, Math.min(MAX_CHARS_PER_FILE, remaining));
      const truncated = take.length < text.length;
      chunks.push(
        `--- ${attachment.filename} ---\n${take}${truncated ? '\n[Content truncated]' : ''}`,
      );
      total += take.length;
    } catch {
      skipped.push(`${attachment.filename} (could not be read)`);
    }
  }

  return { text: chunks.join('\n\n'), skipped };
}

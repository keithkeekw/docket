import type { PromptEntry } from '@app/shared';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { appSettings } from '../db/schema';
import type { Db } from '../db/types';
import { ServiceError } from '../lib/errors';

const cache = new Map<string, string>();

/** Every prompt the app can send, in the order Settings lists them. */
const PROMPT_CATALOG: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'capture', label: 'Capture' },
  { id: 'breakdown', label: 'Project Breakdown' },
  { id: 'project-summary', label: 'Project Summary' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'review', label: 'Review' },
  { id: 'chat', label: 'Chat' },
];

const promptKey = (id: string) => `prompt:${id}`;

/** Prompts are Markdown files beside the code so they can be tuned without touching TypeScript. */
function loadDefaultPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const file = fileURLToPath(new URL(`./prompts/${name}.md`, import.meta.url));
  const text = fs.readFileSync(file, 'utf8');
  cache.set(name, text);

  return text;
}

function overrideFor(db: Db, id: string): string | null {
  const row = db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, promptKey(id)))
    .get();

  return row?.value ?? null;
}

function promptEntry(db: Db, id: string, label: string): PromptEntry {
  const defaultContent = loadDefaultPrompt(id);
  const override = overrideFor(db, id);

  return {
    id,
    label,
    content: override ?? defaultContent,
    defaultContent,
    customized: override !== null,
  };
}

/** The prompt in use: a Settings override when present, otherwise the built-in file. */
export function loadPrompt(db: Db, name: string): string {
  return overrideFor(db, name) ?? loadDefaultPrompt(name);
}

export function listPrompts(db: Db): PromptEntry[] {
  return PROMPT_CATALOG.map(({ id, label }) => promptEntry(db, id, label));
}

export function savePrompt(db: Db, id: string, content: string): PromptEntry {
  const prompt = PROMPT_CATALOG.find((entry) => entry.id === id);
  if (!prompt) throw new ServiceError('Prompt not found', 404);

  db.insert(appSettings)
    .values({ key: promptKey(id), value: content })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: content } })
    .run();

  return promptEntry(db, id, prompt.label);
}

/** Drop the override so the built-in prompt is used again. */
export function resetPrompt(db: Db, id: string): PromptEntry {
  const prompt = PROMPT_CATALOG.find((entry) => entry.id === id);
  if (!prompt) throw new ServiceError('Prompt not found', 404);

  db.delete(appSettings)
    .where(eq(appSettings.key, promptKey(id)))
    .run();
  return promptEntry(db, id, prompt.label);
}

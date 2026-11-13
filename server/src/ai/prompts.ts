import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const cache = new Map<string, string>();

/**
 * Prompts are Markdown files beside the code so they can be tuned without
 * touching TypeScript (TECHSTACK §6.5). Read once, then cached.
 */
export function loadPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const file = fileURLToPath(new URL(`./prompts/${name}.md`, import.meta.url));
  const text = fs.readFileSync(file, 'utf8');
  cache.set(name, text);

  return text;
}

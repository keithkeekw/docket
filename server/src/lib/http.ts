import type { Context } from 'hono';
import type { z } from 'zod';

/** Body parsing shared by every route: missing or malformed JSON is `undefined`. */
export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export function invalidBody(c: Context, error: z.ZodError) {
  return c.json({ error: 'Invalid request body', issues: error.issues }, 400);
}

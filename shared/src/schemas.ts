import { z } from 'zod';

/**
 * Shapes shared by the API and the web app. Zod is the single source of truth:
 * the server validates with these schemas and the client parses responses with
 * the same objects, so a shape change breaks type-checking in both places.
 */

/** Counts shown beside the sidebar navigation items. Open work only. */
export const navCountsSchema = z.object({
  inbox: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  all: z.number().int().nonnegative(),
});

/** One entry in the sidebar's project list. */
export const navProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/** `GET /api/nav` — everything the app shell needs to render. */
export const navSummarySchema = z.object({
  counts: navCountsSchema,
  projects: z.array(navProjectSchema),
});

export type NavCounts = z.infer<typeof navCountsSchema>;
export type NavProject = z.infer<typeof navProjectSchema>;
export type NavSummary = z.infer<typeof navSummarySchema>;

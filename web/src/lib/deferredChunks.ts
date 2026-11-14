/**
 * Code kept out of the startup bundle. Each loader is shared by its lazy
 * consumer and the idle preload, so the browser fetches every chunk once.
 */
export const loadGuideRoute = () => import('../routes/GuideRoute');
export const loadSettingsRoute = () => import('../routes/SettingsRoute');
export const loadAboutRoute = () => import('../routes/AboutRoute');
export const loadReviewsRoute = () => import('../routes/ReviewsRoute');
export const loadArchivedProjectsRoute = () => import('../routes/ArchivedProjectsRoute');
export const loadMarkdownEditor = () => import('../components/MarkdownEditor');
export const loadReactMarkdown = () => import('react-markdown');

const DEFERRED = [
  loadMarkdownEditor,
  loadReactMarkdown,
  loadSettingsRoute,
  loadReviewsRoute,
  loadGuideRoute,
  loadAboutRoute,
  loadArchivedProjectsRoute,
];

/** Fetch the deferred chunks once the first screen has settled, so first use never waits. */
export function preloadDeferredChunks(): void {
  const run = () => {
    for (const load of DEFERRED) void load().catch(() => undefined);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

type PrelineWindow = Window & {
  $hsDatepickerCollection?: unknown[];
  $hsSelectCollection?: unknown[];
  $hsTooltipCollection?: unknown[];
};

/**
 * Preline's standalone bundles name their classes during minification, so
 * their `createCollection` helper cannot derive the global collection name.
 * `destroy()` still assumes that array exists, so seed the collections before
 * constructing a plugin.
 */
export function ensurePrelineCollections(): void {
  const target = window as PrelineWindow;
  if (!Array.isArray(target.$hsDatepickerCollection)) target.$hsDatepickerCollection = [];
  if (!Array.isArray(target.$hsSelectCollection)) target.$hsSelectCollection = [];
  if (!Array.isArray(target.$hsTooltipCollection)) target.$hsTooltipCollection = [];
}

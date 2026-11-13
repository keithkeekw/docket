/**
 * Label for the `mod` modifier in shortcut hints: ⌘ on Apple platforms,
 * Ctrl elsewhere. DESIGN §5.4 writes it as "Ctrl K (or ⌘K)".
 */
export function modKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';
}

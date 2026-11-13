/**
 * Label for the `mod` modifier in shortcut hints: ⌘ on Apple platforms,
 * Ctrl elsewhere. DESIGN §5.4 writes it as "Ctrl K (or ⌘K)".
 */
export function modKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * Check whether a KeyboardEvent matches a react-hotkeys-hook style binding
 * string such as "mod+enter" or "mod+k". Supports: mod, ctrl, alt, shift,
 * meta, and any single key name (lowercase).
 */
export function matchesBinding(e: KeyboardEvent | React.KeyboardEvent, binding: string): boolean {
  const parts = binding.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const needsMod = parts.includes('mod');
  const needsCtrl = parts.includes('ctrl');
  const needsAlt = parts.includes('alt');
  const needsShift = parts.includes('shift');
  const needsMeta = parts.includes('meta');

  const modPressed = isMac() ? e.metaKey : e.ctrlKey;
  if (needsMod && !modPressed) return false;
  if (needsCtrl && !e.ctrlKey) return false;
  if (needsAlt && !e.altKey) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsMeta && !e.metaKey) return false;

  return e.key.toLowerCase() === key;
}

/** Human-readable label for a binding string, e.g. "mod+k" → "⌘K" or "Ctrl K". */
export function bindingLabel(binding: string): string {
  return binding
    .split('+')
    .map((part) => {
      if (part === 'mod') return modKeyLabel();
      if (part === 'enter') return '↵';
      if (part === 'escape') return 'Esc';
      if (part === 'space') return 'Space';
      if (part === 'backspace') return '⌫';
      if (part === 'arrowup') return '↑';
      if (part === 'arrowdown') return '↓';
      if (part === 'arrowleft') return '←';
      if (part === 'arrowright') return '→';
      if (part === 'ctrl') return 'Ctrl';
      if (part === 'alt') return isMac() ? '⌥' : 'Alt';
      if (part === 'shift') return '⇧';
      if (part === 'meta') return '⌘';
      return part.toUpperCase();
    })
    .join(' ');
}

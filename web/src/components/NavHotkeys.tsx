import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router';
import { NAV_SHORTCUTS, type NavShortcut } from '../lib/navShortcuts';
import { useKeybindingsStore } from '../store/keybindings';

function NavHotkey({ shortcut }: { shortcut: NavShortcut }) {
  const binding = useKeybindingsStore((state) => state.bindings[shortcut.id] ?? shortcut.binding);
  const navigate = useNavigate();

  // Form fields are exempt, so typing "i" in a note never opens the Inbox.
  useHotkeys(
    binding,
    () => {
      navigate(shortcut.to);
    },
    { preventDefault: true },
  );

  return null;
}

/** Global D/I/T/A/R/L/S navigation, one hook per configurable binding. */
export function NavHotkeys() {
  return (
    <>
      {NAV_SHORTCUTS.map((shortcut) => (
        <NavHotkey key={shortcut.id} shortcut={shortcut} />
      ))}
    </>
  );
}

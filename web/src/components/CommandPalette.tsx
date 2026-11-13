import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router';
import { useNavSummary } from '../api/nav';
import { cx } from '../lib/cx';
import { useKeybindingsStore } from '../store/keybindings';
import { useUiStore } from '../store/ui';
import { Kbd } from './Kbd';

type Command = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
};

/**
 * Cmd/Ctrl + P: a searchable overlay over every destination in the app —
 * primary pages, the project list and a few creation actions. Arrow keys move
 * the highlight, Enter opens, Esc dismisses (native <dialog>).
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const nav = useNavSummary();
  const openCapture = useUiStore((state) => state.openCapture);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const openChat = useUiStore((state) => state.openChat);
  const paletteKey = useKeybindingsStore((s) => s.bindings.commandPalette ?? 'mod+p');

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useHotkeys(
    paletteKey,
    () => { setIsOpen((open) => !open); },
    { preventDefault: true, enableOnFormTags: true },
  );

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => { void navigate(to); };

    return [
      { id: 'page:dashboard', label: 'Dashboard', group: 'Pages', run: go('/') },
      { id: 'page:inbox', label: 'Inbox', group: 'Pages', run: go('/inbox') },
      { id: 'page:today', label: 'Today', group: 'Pages', run: go('/today') },
      { id: 'page:tasks', label: 'All Tasks', group: 'Pages', run: go('/tasks') },
      { id: 'page:reviews', label: 'Reviews', group: 'Pages', run: go('/reviews') },
      { id: 'page:archived', label: 'Archived Projects', group: 'Pages', run: go('/projects/archived') },
      { id: 'page:settings', label: 'Settings', group: 'Pages', run: go('/settings') },
      {
        id: 'action:new-task',
        label: 'New Task',
        group: 'Actions',
        keywords: 'capture add create',
        run: () => { openCapture(); },
      },
      {
        id: 'action:new-project',
        label: 'New Project',
        group: 'Actions',
        keywords: 'create add',
        run: () => { openProjectDialog({ mode: 'create' }); },
      },
      {
        id: 'action:assistant',
        label: 'Ask Assistant',
        group: 'Actions',
        keywords: 'chat ai help',
        run: () => { openChat(); },
      },
      ...(nav.data?.projects ?? []).map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        group: 'Projects',
        keywords: 'project',
        run: go(`/projects/${project.id}`),
      })),
    ];
  }, [navigate, nav.data?.projects, openCapture, openProjectDialog, openChat]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase().includes(term),
    );
  }, [commands, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setQuery('');
      setActive(0);
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Keep the highlight in range as the query narrows the list.
  useEffect(() => {
    if (active > filtered.length - 1) setActive(Math.max(filtered.length - 1, 0));
  }, [active, filtered.length]);

  function runCommand(command: Command | undefined) {
    if (!command) return;
    setIsOpen(false);
    command.run();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (filtered.length ? (index + 1) % filtered.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) =>
        filtered.length ? (index - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(filtered[active]);
    }
  }

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) setIsOpen(false);
  }

  let lastGroup = '';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="command-palette-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        setIsOpen(false);
      }}
      onClose={() => {
        if (isOpen) setIsOpen(false);
      }}
    >
      <h2 id="command-palette-title" className="sr-only">
        Command Palette
      </h2>

      <div className="flex items-center gap-2 border-b border-zinc-200 px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 3.356 9.86l3.142 3.14a.75.75 0 1 0 1.06-1.06l-3.14-3.142A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search Pages, Projects and Actions…"
          aria-label="Search Commands"
          className="min-h-12 w-full border-0 bg-transparent px-0 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
        />
        <Kbd>Esc</Kbd>
      </div>

      <ul className="max-h-[min(56vh,420px)] overflow-y-auto p-2">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches.</li>
        )}

        {filtered.map((command, index) => {
          const showGroup = command.group !== lastGroup;
          lastGroup = command.group;
          const isActive = index === active;

          return (
            <li key={command.id}>
              {showGroup && (
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                  {command.group}
                </p>
              )}
              <button
                type="button"
                onClick={() => { runCommand(command); }}
                onMouseEnter={() => { setActive(index); }}
                className={cx(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left',
                  isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                )}
              >
                <span className="truncate text-sm text-zinc-900">{command.label}</span>
                <span className="shrink-0 text-xs text-zinc-400">{command.group}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> to navigate · <Kbd>↵</Kbd> to open · <Kbd>Esc</Kbd> to close
      </div>
    </dialog>
  );
}

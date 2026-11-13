import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router';
import { useNavSummary } from '../api/nav';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { useKeybindingsStore } from '../store/keybindings';
import { useThemeStore } from '../store/theme';
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
  const t = useT();
  const navigate = useNavigate();
  const nav = useNavSummary();
  const openCapture = useUiStore((state) => state.openCapture);
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const openChat = useUiStore((state) => state.openChat);
  const setThemeMode = useThemeStore((state) => state.setMode);
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
      { id: 'page:dashboard', label: t('Dashboard'), group: t('Pages'), run: go('/') },
      { id: 'page:inbox', label: t('Inbox'), group: t('Pages'), run: go('/inbox') },
      { id: 'page:today', label: t('Today'), group: t('Pages'), run: go('/today') },
      { id: 'page:tasks', label: t('All Tasks'), group: t('Pages'), run: go('/tasks') },
      { id: 'page:reviews', label: t('Reviews'), group: t('Pages'), run: go('/reviews') },
      { id: 'page:logbook', label: t('Logbook'), group: t('Pages'), run: go('/logbook') },
      { id: 'page:guide', label: t('User Guide'), group: t('Pages'), run: go('/guide') },
      { id: 'page:archived', label: t('Archived Projects'), group: t('Pages'), run: go('/projects/archived') },
      { id: 'page:settings', label: t('Settings'), group: t('Pages'), run: go('/settings') },
      {
        id: 'action:new-task',
        label: t('New Task'),
        group: t('Actions'),
        keywords: 'capture add create',
        run: () => { openCapture(); },
      },
      {
        id: 'action:new-project',
        label: t('New Project'),
        group: t('Actions'),
        keywords: 'create add',
        run: () => { openProjectDialog({ mode: 'create' }); },
      },
      {
        id: 'action:assistant',
        label: t('Ask Assistant'),
        group: t('Actions'),
        keywords: 'chat ai help',
        run: () => { openChat(); },
      },
      {
        id: 'theme:light',
        label: t('Light Theme'),
        group: t('Appearance'),
        keywords: 'theme light appearance mode',
        run: () => { setThemeMode('light'); },
      },
      {
        id: 'theme:dark',
        label: t('Dark Theme'),
        group: t('Appearance'),
        keywords: 'theme dark appearance mode',
        run: () => { setThemeMode('dark'); },
      },
      {
        id: 'theme:system',
        label: t('Automatic Theme'),
        group: t('Appearance'),
        keywords: 'theme automatic system appearance mode machine',
        run: () => { setThemeMode('system'); },
      },
      ...(nav.data?.projects ?? []).map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        group: t('Projects'),
        keywords: 'project',
        run: go(`/projects/${project.id}`),
      })),
    ];
  }, [navigate, nav.data?.projects, openCapture, openProjectDialog, openChat, setThemeMode, t]);

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
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Wait for the dialog to be in the top layer before moving the caret in;
  // showModal() and the query reset both happen on the same frame.
  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
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
        {t('Command Palette')}
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
          placeholder={t('Search Pages, Projects and Actions…')}
          aria-label={t('Search Commands')}
          className="min-h-12 w-full border-0 bg-transparent px-0 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
        />
        <Kbd>Esc</Kbd>
      </div>

      <ul className="max-h-[min(56vh,420px)] overflow-y-auto overscroll-contain p-2">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-zinc-500">{t('No matches.')}</li>
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
        <Kbd>↓</Kbd> {t('to navigate')} · <Kbd>↵</Kbd> {t('to open')} · <Kbd>Esc</Kbd>{' '}
        {t('to close')}
      </div>
    </dialog>
  );
}

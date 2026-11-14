import { useEffect, useRef, type MouseEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { useNavSummary } from '../api/nav';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { useUiStore } from '../store/ui';
import { NewProjectIcon } from './NavIcons';

/** Phone-only bottom sheet with the sidebar's Projects section. */
export function MobileProjectsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const nav = useNavSummary();
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const projects = nav.data?.projects ?? [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="mobile-projects-title"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[75dvh] w-full max-w-none rounded-t-2xl border-0 border-t border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
        <h2 id="mobile-projects-title" className="text-[15px] font-semibold text-zinc-900">
          {t('Projects')}
        </h2>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
          onClick={onClose}
          aria-label={t('Close')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="max-h-[calc(75dvh-3.5rem)] overflow-y-auto overscroll-contain px-3 py-3">
        {projects.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {projects.map((project) => (
              <li key={project.id}>
                <NavLink
                  to={`/projects/${project.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx(
                      'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm',
                      isActive
                        ? 'bg-zinc-100 font-medium text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                    )
                  }
                >
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <span className="truncate">{project.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-zinc-500">{t('No active projects.')}</p>
        )}

        <button
          type="button"
          className="mt-2 flex min-h-11 w-full items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          onClick={() => {
            onClose();
            openProjectDialog({ mode: 'create' });
          }}
        >
          <NewProjectIcon className="size-4" />
          {t('New Project')}
        </button>
        <Link
          to="/projects/archived"
          onClick={onClose}
          className="mt-1 flex min-h-11 w-full items-center rounded-xl px-3 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
        >
          {t('Archived Projects')}
        </Link>
      </div>
    </dialog>
  );
}

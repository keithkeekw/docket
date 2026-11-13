import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useArchivedProjects, useRestoreProject } from '../api/projects';
import { Button } from '../components/Button';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';

export function ArchivedProjectsRoute() {
  const projects = useArchivedProjects();
  const restore = useRestoreProject();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = projects.data?.projects ?? [];

  function handleRestore(id: string) {
    restore.mutate({ id }, {
      onSuccess: () => {
        setConfirmId(null);
        void navigate(`/projects/${id}`);
      },
    });
  }

  return (
    <>
      <PageHeader title="Archived projects" />

      {projects.isLoading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}
      {projects.error && <InlineError message={projects.error.message} />}

      {!projects.isLoading && list.length === 0 && (
        <p className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">
          No archived projects.
        </p>
      )}

      {list.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {list.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{project.name}</p>
                {project.description && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{project.description}</p>
                )}
                <p className="mt-0.5 text-xs text-zinc-400">
                  {project.progress.total} task{project.progress.total !== 1 ? 's' : ''} · {project.progress.percent}% done
                </p>
              </div>

              {confirmId === project.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Restore this project?</span>
                  <Button
                    onClick={() => { handleRestore(project.id); }}
                    disabled={restore.isPending}
                  >
                    Restore
                  </Button>
                  <Button onClick={() => { setConfirmId(null); }}>Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => { setConfirmId(project.id); }}>
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

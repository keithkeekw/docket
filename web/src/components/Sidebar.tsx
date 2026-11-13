import { APP_NAME } from '@app/shared';
import { Link } from 'react-router';
import { useNavSummary } from '../api/nav';
import { NavItem } from './NavItem';

/**
 * DESIGN §3 app shell sidebar. 232 px on desktop with Settings pinned to the
 * bottom; below 900 px it stacks above the content (no hamburger for v1).
 *
 * Reviews is hidden until M3 (PROGRESS D10). Counts and the project list come
 * from `GET /api/nav`; when that request fails the sidebar still renders, just
 * without counts, so navigation never depends on the API being up.
 */
export function Sidebar() {
  const nav = useNavSummary();
  const counts = nav.data?.counts;
  const projects = nav.data?.projects ?? [];

  return (
    <aside className="border-b border-zinc-200 bg-white px-3 py-5 min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen min-[900px]:w-[232px] min-[900px]:shrink-0 min-[900px]:flex-col min-[900px]:overflow-y-auto min-[900px]:border-b-0 min-[900px]:border-r">
      <Link
        to="/"
        className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 pb-4 text-zinc-900"
      >
        <span aria-hidden="true" className="size-[22px] rounded-md bg-zinc-900" />
        <span className="truncate text-sm font-semibold">{APP_NAME}</span>
      </Link>

      <nav aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          <li>
            <NavItem to="/" end label="Dashboard" />
          </li>
          <li>
            <NavItem to="/inbox" label="Inbox" count={counts?.inbox} />
          </li>
          <li>
            <NavItem to="/today" label="Today" count={counts?.today} />
          </li>
          <li>
            <NavItem to="/tasks" label="All tasks" count={counts?.all} />
          </li>
        </ul>
      </nav>

      <div className="mt-5">
        <p className="px-3 pb-1 text-xs font-medium text-zinc-500">Projects</p>
        {projects.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">No projects yet</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {projects.map((project) => (
              <li key={project.id}>
                <NavItem to={`/projects/${project.id}`} label={project.name} dot />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 min-[900px]:mt-auto min-[900px]:pt-4">
        <NavItem to="/settings" label="Settings" />
      </div>
    </aside>
  );
}

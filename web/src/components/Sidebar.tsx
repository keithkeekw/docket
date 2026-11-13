import { APP_NAME } from '@app/shared';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useNavSummary } from '../api/nav';
import { useUiStore } from '../store/ui';
import { NavItem } from './NavItem';

const icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  ),
  inbox: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v11.75A2.75 2.75 0 0 0 16.75 18h-12A2.75 2.75 0 0 1 2 15.25V3.5Zm3.75 7a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM5 5.75A.75.75 0 0 1 5.75 5h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 5 5.75Z" clipRule="evenodd" />
      <path d="M16.75 16.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
    </svg>
  ),
  today: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  ),
  tasks: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1H3a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1ZM1.99 10a1 1 0 0 1 1-1H3a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1ZM1.99 15.25a1 1 0 0 1 1-1H3a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Z" clipRule="evenodd" />
    </svg>
  ),
  reviews: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  ),
};

/**
 * Desktop/tablet sidebar. Hidden on mobile (AppShell renders MobileTabBar there).
 * - lg+ (≥1024px): full 232 px, manually collapsible
 * - sm–lg (640–1023px): auto-collapsed icon-rail (56 px)
 */
export function Sidebar() {
  const nav = useNavSummary();
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const counts = nav.data?.counts;
  const projects = nav.data?.projects ?? [];

  // Auto-collapse on tablet; restore on desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      useUiStore.setState({ sidebarCollapsed: !e.matches });
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    /* Floating card: margin creates the rounded-corner gap from the viewport edge */
    <aside className={`
      sticky top-0 flex h-screen flex-col overflow-y-auto
      m-3 rounded-2xl border border-zinc-200 bg-white shadow-sm
      transition-all duration-200
      ${collapsed ? 'w-14' : 'w-[220px]'}
    `}>
      <div className="flex flex-1 flex-col px-2 py-4">

        {/* Logo + toggle */}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-1' : 'justify-between'} mb-3`}>
          <Link
            to="/"
            title={APP_NAME}
            className="flex min-h-9 items-center gap-2 rounded-xl px-2 text-zinc-900"
          >
            <img src="/docket-mark.svg" alt="" aria-hidden="true" className="size-[20px] shrink-0 rounded-md" />
            {!collapsed && <span className="truncate text-sm font-semibold">{APP_NAME}</span>}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="flex size-7 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
              {collapsed ? (
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 0-.75-.75H5.612l4.158-3.96a.75.75 0 1 0-1.04-1.08l-5.5 5.25a.75.75 0 0 0 0 1.08l5.5 5.25a.75.75 0 1 0 1.04-1.08L5.612 10.75H16.25A.75.75 0 0 0 17 10Z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Primary nav */}
        <nav aria-label="Primary">
          <ul className="flex flex-col gap-0.5">
            <li><NavItem to="/" end label="Dashboard" collapsed={collapsed} icon={icons.dashboard} /></li>
            <li><NavItem to="/inbox" label="Inbox" count={counts?.inbox} collapsed={collapsed} icon={icons.inbox} /></li>
            <li><NavItem to="/today" label="Today" count={counts?.today} collapsed={collapsed} icon={icons.today} /></li>
            <li><NavItem to="/tasks" label="All Tasks" count={counts?.all} collapsed={collapsed} icon={icons.tasks} /></li>
            <li><NavItem to="/reviews" label="Reviews" collapsed={collapsed} icon={icons.reviews} /></li>
          </ul>
        </nav>

        {/* Projects section */}
        {!collapsed ? (
          <div className="mt-5">
            <p className="px-3 pb-1 text-xs font-medium text-zinc-400">Projects</p>
            {projects.length === 0 ? (
              <p className="px-3 py-1 text-xs text-zinc-400">No projects yet</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {projects.map((project) => (
                  <li key={project.id}>
                    <NavItem to={`/projects/${project.id}`} label={project.name} dot collapsed={false} />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600"
              onClick={() => { openProjectDialog({ mode: 'create' }); }}
            >
              <span aria-hidden="true" className="text-base leading-none">+</span>
              New Project
            </button>
            <Link
              to="/projects/archived"
              className="mt-1 flex w-full items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
            >
              Archived Projects
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              title="New Project"
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 py-2 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600"
              onClick={() => { openProjectDialog({ mode: 'create' }); }}
            >
              <span aria-hidden="true" className="text-sm leading-none">+</span>
            </button>
          </div>
        )}

        {/* Settings pinned to bottom */}
        <div className="mt-auto pt-4">
          <NavItem to="/settings" label="Settings" collapsed={collapsed} icon={icons.settings} />
        </div>
      </div>
    </aside>
  );
}

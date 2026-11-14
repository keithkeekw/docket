import { APP_NAME } from '@app/shared';
import { useEffect } from 'react';
import { Link, NavLink } from 'react-router';
import { useNavSummary } from '../api/nav';
import { useUpdateInfo } from '../api/updates';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { bindingLabel } from '../lib/platform';
import { useKeybindingsStore } from '../store/keybindings';
import { useSidebarSectionsStore } from '../store/sidebarSections';
import { useUiStore } from '../store/ui';
import { Kbd } from './Kbd';
import { UpdateBadge } from './UpdateBadge';
import {
  AboutIcon,
  DashboardIcon,
  GuideIcon,
  InboxIcon,
  LogbookIcon,
  NewProjectIcon,
  ReviewsIcon,
  SettingsIcon,
  SidebarToggleIcon,
  TasksIcon,
  TodayIcon,
} from './NavIcons';
import { NavItem } from './NavItem';
import { PrelineTooltip } from './PrelineTooltip';

const icons = {
  dashboard: <DashboardIcon />,
  inbox: <InboxIcon />,
  today: <TodayIcon />,
  tasks: <TasksIcon />,
  reviews: <ReviewsIcon />,
  logbook: <LogbookIcon />,
  settings: <SettingsIcon />,
};

/**
 * Desktop/tablet sidebar. Hidden on mobile (AppShell renders MobileTabBar there).
 * - lg+ (≥1024px): full 232 px, manually collapsible
 * - sm–lg (640–1023px): auto-collapsed icon-rail (56 px)
 */
export function Sidebar() {
  const t = useT();
  const nav = useNavSummary();
  const openProjectDialog = useUiStore((state) => state.openProjectDialog);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const projectsCollapsed = useSidebarSectionsStore((state) => state.projectsCollapsed);
  const toggleProjects = useSidebarSectionsStore((state) => state.toggleProjects);
  const paletteKey = useKeybindingsStore((s) => s.bindings.commandPalette ?? 'mod+p');
  const shortcutsKey = useKeybindingsStore((s) => s.bindings.shortcutHelp ?? 'shift+space');
  const counts = nav.data?.counts;
  const projects = nav.data?.projects ?? [];
  const updateInfo = useUpdateInfo();
  const latestRelease = updateInfo.data?.updateAvailable ? updateInfo.data.latest : null;

  const aboutLabel = latestRelease
    ? `${t('About')} · ${t('Update available: {version}', { version: latestRelease.tag })}`
    : t('About');
  const aboutLink = (
    <PrelineTooltip label={aboutLabel} className={collapsed ? 'w-full' : undefined}>
      <NavLink
        to="/about"
        aria-label={aboutLabel}
        className={({ isActive }) =>
          cx(
            'relative flex items-center justify-center rounded-lg transition-colors',
            collapsed ? 'mb-0.5 min-h-10 w-full' : 'size-10',
            isActive
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
          )
        }
      >
        <AboutIcon />
        {latestRelease && <UpdateBadge />}
      </NavLink>
    </PrelineTooltip>
  );
  const guideLink = (
    <PrelineTooltip label={t('User Guide')} className={collapsed ? 'w-full' : undefined}>
      <NavLink
        to="/guide"
        aria-label={t('User Guide')}
        className={({ isActive }) =>
          cx(
            'flex items-center justify-center rounded-lg transition-colors',
            collapsed ? 'mb-0.5 min-h-10 w-full' : 'size-10',
            isActive
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
          )
        }
      >
        <GuideIcon />
      </NavLink>
    </PrelineTooltip>
  );

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
    <aside
      className={`
      sticky top-3 flex h-[calc(100dvh_-_1.5rem)] flex-col overflow-y-auto overscroll-contain
      m-3 rounded-2xl border border-zinc-200 bg-white shadow-sm
      transition-[width,background-color] duration-200 ease-out transition-discrete
      motion-reduce:transition-none
      ${collapsed ? 'w-14' : 'w-[220px]'}
    `}
    >
      <div className="flex flex-1 flex-col px-2 py-4">
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'mb-3 justify-center' : ''}`}>
          <Link
            to="/"
            title={APP_NAME}
            className="flex min-h-9 items-center gap-2 rounded-xl px-2 text-zinc-900"
          >
            <img
              src="/docket-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-[20px] shrink-0 rounded-md"
            />
            {!collapsed && <span className="truncate text-sm font-semibold">{APP_NAME}</span>}
          </Link>
        </div>

        {!collapsed && (
          <p className="mb-3 px-2 text-[11px] leading-snug text-zinc-400">
            {t('Your to-do list, minus the guilt.')}
          </p>
        )}

        {/* Primary nav */}
        <nav aria-label={t('Primary')}>
          <ul className="flex flex-col gap-0.5">
            <li>
              <NavItem
                to="/"
                end
                label={t('Dashboard')}
                collapsed={collapsed}
                icon={icons.dashboard}
              />
            </li>
            <li>
              <NavItem
                to="/inbox"
                label={t('Inbox')}
                count={counts?.inbox}
                collapsed={collapsed}
                icon={icons.inbox}
              />
            </li>
            <li>
              <NavItem
                to="/today"
                label={t('Today')}
                count={counts?.today}
                collapsed={collapsed}
                icon={icons.today}
              />
            </li>
            <li>
              <NavItem
                to="/tasks"
                label={t('All Tasks')}
                count={counts?.all}
                collapsed={collapsed}
                icon={icons.tasks}
              />
            </li>
            <li>
              <NavItem
                to="/reviews"
                label={t('Reviews')}
                collapsed={collapsed}
                icon={icons.reviews}
              />
            </li>
            <li>
              <NavItem
                to="/logbook"
                label={t('Logbook')}
                collapsed={collapsed}
                icon={icons.logbook}
              />
            </li>
          </ul>
        </nav>

        {/* Projects section */}
        {!collapsed ? (
          <div className="mt-5">
            <button
              type="button"
              aria-expanded={!projectsCollapsed}
              aria-controls="sidebar-projects"
              title={projectsCollapsed ? t('Show Projects') : t('Hide Projects')}
              className="group flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              onClick={toggleProjects}
            >
              <span className="flex-1">{t('Projects')}</span>
              {projectsCollapsed && projects.length > 0 && (
                <span className="tabular-nums">{projects.length}</span>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className={cx(
                  'size-4 shrink-0 text-zinc-400 transition-transform duration-150 motion-reduce:transition-none',
                  projectsCollapsed && '-rotate-90',
                )}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                />
              </svg>
            </button>
            <div id="sidebar-projects" hidden={projectsCollapsed}>
              {projects.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <NavItem
                        to={`/projects/${project.id}`}
                        label={project.name}
                        dot
                        collapsed={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600"
                onClick={() => {
                  openProjectDialog({ mode: 'create' });
                }}
              >
                <NewProjectIcon className="size-3.5" />
                {t('New Project')}
              </button>
              <Link
                to="/projects/archived"
                className="mt-1 flex w-full items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
              >
                {t('Archived Projects')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <PrelineTooltip label={t('New Project')} className="w-full">
              <button
                type="button"
                aria-label={t('New Project')}
                className="flex min-h-10 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600"
                onClick={() => {
                  openProjectDialog({ mode: 'create' });
                }}
              >
                <NewProjectIcon />
              </button>
            </PrelineTooltip>
          </div>
        )}

        {/* Shortcut legend + Settings pinned to bottom */}
        <div className="mt-auto pt-4">
          {!collapsed && (
            <div className="mb-2 flex items-center justify-center px-3">
              <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                v{__APP_VERSION__}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="mb-2 rounded-xl border border-zinc-100 bg-zinc-50 px-2.5 py-2">
              <p className="px-0.5 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                {t('Shortcuts')}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                <li className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span className="truncate">{t('Command Palette')}</span>
                  <Kbd>{bindingLabel(paletteKey)}</Kbd>
                </li>
                <li className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span className="truncate">{t('Keyboard Shortcuts')}</span>
                  <Kbd>{bindingLabel(shortcutsKey)}</Kbd>
                </li>
              </ul>
            </div>
          )}
          {collapsed ? (
            <PrelineTooltip label={t('Expand Sidebar')} className="w-full">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t('Expand Sidebar')}
                className="mb-0.5 flex min-h-10 w-full items-center justify-center rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <SidebarToggleIcon collapsed />
              </button>
            </PrelineTooltip>
          ) : null}
          {collapsed && aboutLink}
          {collapsed && guideLink}
          {collapsed ? (
            <NavItem to="/settings" label={t('Settings')} collapsed icon={icons.settings} />
          ) : (
            <div className="flex items-center gap-1">
              <PrelineTooltip label={t('Settings')}>
                <NavLink
                  to="/settings"
                  aria-label={t('Settings')}
                  className={({ isActive }) =>
                    cx(
                      'flex size-10 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                    )
                  }
                >
                  <SettingsIcon />
                </NavLink>
              </PrelineTooltip>
              {aboutLink}
              {guideLink}
              <PrelineTooltip label={t('Collapse Sidebar')}>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={t('Collapse Sidebar')}
                  className="flex size-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <SidebarToggleIcon collapsed={false} />
                </button>
              </PrelineTooltip>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useNavSummary } from '../api/nav';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { MobileProjectsSheet } from './MobileProjectsSheet';
import {
  DashboardIcon,
  InboxIcon,
  LogbookIcon,
  ProjectsIcon,
  SettingsIcon,
  TasksIcon,
  TodayIcon,
} from './NavIcons';

const tabs = [
  { to: '/', end: true, label: 'Dashboard', icon: <DashboardIcon className="size-5" /> },
  { to: '/inbox', end: false, label: 'Inbox', icon: <InboxIcon className="size-5" /> },
  { to: '/today', end: false, label: 'Today', icon: <TodayIcon className="size-5" /> },
  { to: '/tasks', end: false, label: 'All Tasks', icon: <TasksIcon className="size-5" /> },
  { to: '/logbook', end: false, label: 'Logbook', icon: <LogbookIcon className="size-5" /> },
  { to: '/settings', end: false, label: 'Settings', icon: <SettingsIcon className="size-5" /> },
];

const TAB =
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px]';

/** Bottom tab bar shown only on mobile (hidden from sm up). */
export function MobileTabBar() {
  const t = useT();
  const nav = useNavSummary();
  const { pathname } = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const counts = nav.data?.counts;
  const onProject = pathname.startsWith('/projects/');

  const countFor = (to: string) => {
    if (to === '/inbox') return counts?.inbox;
    if (to === '/today') return counts?.today;
    if (to === '/tasks') return counts?.all;
    return undefined;
  };

  const renderTab = (tab: (typeof tabs)[number]) => {
    const count = countFor(tab.to);
    return (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.end}
        className={({ isActive }) => cx(TAB, isActive ? 'text-zinc-900' : 'text-zinc-400')}
      >
        {tab.icon}
        <span className="max-w-full truncate tracking-tight">
          {t(tab.label === 'All Tasks' ? 'Tasks' : tab.label)}
        </span>
        {count !== undefined && count > 0 && (
          <span className="absolute top-1.5 right-[calc(50%-14px)] flex size-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      <nav
        aria-label={t('Mobile Navigation')}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur sm:hidden"
      >
        {tabs.slice(0, 4).map(renderTab)}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={projectsOpen}
          aria-current={onProject ? 'page' : undefined}
          className={cx(TAB, onProject || projectsOpen ? 'text-zinc-900' : 'text-zinc-400')}
          onClick={() => {
            setProjectsOpen(true);
          }}
        >
          <ProjectsIcon className="size-5" />
          <span className="max-w-full truncate tracking-tight">{t('Projects')}</span>
        </button>
        {tabs.slice(4).map(renderTab)}
      </nav>
      <MobileProjectsSheet
        open={projectsOpen}
        onClose={() => {
          setProjectsOpen(false);
        }}
      />
    </>
  );
}

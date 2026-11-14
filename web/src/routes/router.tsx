import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/AppShell';
import {
  loadAboutRoute,
  loadArchivedProjectsRoute,
  loadGuideRoute,
  loadReviewsRoute,
  loadSettingsRoute,
} from '../lib/deferredChunks';
import { AllTasksRoute } from './AllTasksRoute';
import { DashboardRoute } from './DashboardRoute';
import { InboxRoute } from './InboxRoute';
import { LogbookRoute } from './LogbookRoute';
import { NotFoundRoute } from './NotFoundRoute';
import { ProjectRoute } from './ProjectRoute';
import { RouteError } from './RouteError';
import { TodayRoute } from './TodayRoute';

/**
 * Routes from TECHSTACK §2. `/reviews` returns with M3 (D10).
 * The router is created once, outside React, per the React Router data-router
 * contract. Everyday screens ship in the startup bundle; the rest load lazily.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardRoute /> },
      { path: 'inbox', element: <InboxRoute /> },
      { path: 'today', element: <TodayRoute /> },
      { path: 'tasks', element: <AllTasksRoute /> },
      { path: 'logbook', element: <LogbookRoute /> },
      { path: 'projects/:id', element: <ProjectRoute /> },
      {
        path: 'guide',
        lazy: async () => ({ Component: (await loadGuideRoute()).GuideRoute }),
      },
      {
        path: 'projects/archived',
        lazy: async () => ({
          Component: (await loadArchivedProjectsRoute()).ArchivedProjectsRoute,
        }),
      },
      {
        path: 'reviews',
        lazy: async () => ({ Component: (await loadReviewsRoute()).ReviewsRoute }),
      },
      {
        path: 'settings',
        lazy: async () => ({ Component: (await loadSettingsRoute()).SettingsRoute }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await loadAboutRoute()).AboutRoute }),
      },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);

import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/AppShell';
import { AllTasksRoute } from './AllTasksRoute';
import { DashboardRoute } from './DashboardRoute';
import { InboxRoute } from './InboxRoute';
import { NotFoundRoute } from './NotFoundRoute';
import { ProjectRoute } from './ProjectRoute';
import { ReviewsRoute } from './ReviewsRoute';
import { RouteError } from './RouteError';
import { SettingsRoute } from './SettingsRoute';
import { TodayRoute } from './TodayRoute';

/**
 * Routes from TECHSTACK §2. `/reviews` returns with M3 (D10).
 * The router is created once, outside React, per the React Router data-router
 * contract.
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
      { path: 'projects/:id', element: <ProjectRoute /> },
      { path: 'reviews', element: <ReviewsRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);

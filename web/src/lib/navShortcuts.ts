/**
 * Single-letter navigation shortcuts. The first letter of each sidebar module
 * is the default, and every one can be rebound in Settings.
 */
export type NavShortcut = {
  id: string;
  to: string;
  label: string;
  description: string;
  binding: string;
};

export const NAV_SHORTCUTS: readonly NavShortcut[] = [
  {
    id: 'navDashboard',
    to: '/',
    label: 'Go to Dashboard',
    description: 'Open the Dashboard',
    binding: 'd',
  },
  {
    id: 'navInbox',
    to: '/inbox',
    label: 'Go to Inbox',
    description: 'Open the Inbox',
    binding: 'i',
  },
  {
    id: 'navToday',
    to: '/today',
    label: 'Go to Today',
    description: 'Open Today',
    binding: 't',
  },
  {
    id: 'navAllTasks',
    to: '/tasks',
    label: 'Go to All Tasks',
    description: 'Open the All Tasks list',
    binding: 'a',
  },
  {
    id: 'navReviews',
    to: '/reviews',
    label: 'Go to Reviews',
    description: 'Open Reviews',
    binding: 'r',
  },
  {
    id: 'navLogbook',
    to: '/logbook',
    label: 'Go to Logbook',
    description: 'Open the Logbook',
    binding: 'l',
  },
  {
    id: 'navSettings',
    to: '/settings',
    label: 'Go to Settings',
    description: 'Open Settings',
    binding: 's',
  },
];

import { common } from './zh/common';
import { dashboard } from './zh/dashboard';
import { dialogs } from './zh/dialogs';
import { guide } from './zh/guide';
import { misc } from './zh/misc';
import { settings } from './zh/settings';
import { tasks } from './zh/tasks';

/** Every Chinese string, keyed by its English source. */
export const zhMessages: Record<string, string> = {
  ...common,
  ...misc,
  ...dashboard,
  ...tasks,
  ...dialogs,
  ...settings,
  ...guide,
};

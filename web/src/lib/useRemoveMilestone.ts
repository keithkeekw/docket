import type { Milestone } from '@app/shared';
import { useDeleteMilestone } from '../api/projects';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';
import { useT } from './i18n';

/**
 * Confirm, delete, offer Undo, and tell the user when the milestone's tasks
 * moved to the Inbox. Resolves to true once the milestone is gone.
 */
export function useRemoveMilestone(projectId: string) {
  const t = useT();
  const deleteMilestone = useDeleteMilestone(projectId);
  const showUndo = useUiStore((state) => state.showUndo);
  const showNotice = useUiStore((state) => state.showNotice);

  async function remove(milestone: Milestone): Promise<boolean> {
    const message =
      milestone.total === 0
        ? t('“{name}” will be deleted. It has no tasks.', { name: milestone.name })
        : t(
            milestone.total === 1
              ? '“{name}” will be deleted. Its {count} task will move to the Inbox.'
              : '“{name}” will be deleted. Its {count} tasks will move to the Inbox.',
            { name: milestone.name, count: milestone.total },
          );

    const confirmed = await confirmAction({
      title: t('Delete Milestone'),
      message,
      confirmLabel: t('Delete Milestone'),
    });
    if (!confirmed) return false;

    const { movedToInbox } = await deleteMilestone.mutateAsync({ id: milestone.id });
    showUndo(t('Milestone “{name}” deleted', { name: milestone.name }));

    if (movedToInbox > 0) {
      showNotice({
        title: t('Tasks Moved to Inbox'),
        message: t(
          movedToInbox === 1
            ? '{count} task from “{name}” is now in the Inbox.'
            : '{count} tasks from “{name}” are now in the Inbox.',
          { count: movedToInbox, name: milestone.name },
        ),
      });
    }

    return true;
  }

  return { remove, isPending: deleteMilestone.isPending };
}

import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function AllTasksRoute() {
  return (
    <>
      <PageHeader title="All tasks" />
      <EmptyState message="No tasks yet. List, Table and Kanban views arrive in M1-S7." />
    </>
  );
}

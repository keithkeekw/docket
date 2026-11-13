import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function TodayRoute() {
  return (
    <>
      <PageHeader title="Today" />
      <EmptyState message="Nothing due today. The Today list arrives in M1-S5." />
    </>
  );
}

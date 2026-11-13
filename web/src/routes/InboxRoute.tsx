import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function InboxRoute() {
  return (
    <>
      <PageHeader title="Inbox" />
      <EmptyState message="Inbox is empty. Quick capture arrives in M1-S5." />
    </>
  );
}

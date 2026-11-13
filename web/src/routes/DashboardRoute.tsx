import { format } from 'date-fns';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

/** DESIGN §5.1: the date is the page title. Content lands in M1-S9. */
export function DashboardRoute() {
  return (
    <>
      <PageHeader title={format(new Date(), 'EEEE, d MMMM')} />
      <EmptyState message="The dashboard arrives in M1-S9." />
    </>
  );
}

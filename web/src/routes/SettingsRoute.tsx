import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function SettingsRoute() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState message="Settings arrive in M1-S8." />
    </>
  );
}

import { useParams } from 'react-router';
import { useNavSummary } from '../api/nav';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

/**
 * Project detail arrives in M1-S6/S7. The title already reads from the sidebar
 * data so a bookmarked project URL shows its real name.
 */
export function ProjectRoute() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavSummary();
  const project = nav.data?.projects.find((entry) => entry.id === id);

  return (
    <>
      <PageHeader title={project?.name ?? 'Project'} />
      <EmptyState message="Project detail arrives in M1-S6." />
    </>
  );
}

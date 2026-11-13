import { Link } from 'react-router';
import { buttonClassName } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function NotFoundRoute() {
  return (
    <>
      <PageHeader title="Not found" />
      <EmptyState
        message="That page does not exist."
        action={
          <Link to="/" className={buttonClassName('secondary')}>
            Go to dashboard
          </Link>
        }
      />
    </>
  );
}

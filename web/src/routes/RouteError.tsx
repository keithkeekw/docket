import { Link } from 'react-router';
import { buttonClassName } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

/**
 * Router error boundary. Rendered outside the shell, so it keeps its own page
 * frame and offers one way back (DESIGN §6: no disappearing toasts).
 */
export function RouteError() {
  return (
    <main className="mx-auto max-w-[720px] px-8 pt-6 pb-12">
      <PageHeader title="Something went wrong" />
      <EmptyState
        message="This screen failed to render. Go back to the dashboard and try again."
        action={
          <Link to="/" className={buttonClassName('secondary')}>
            Go to dashboard
          </Link>
        }
      />
    </main>
  );
}

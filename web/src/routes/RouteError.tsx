import { Link } from 'react-router';
import { buttonClassName } from '../lib/button';
import { useT } from '../lib/i18n';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

/**
 * Router error boundary. Rendered outside the shell, so it keeps its own page
 * frame and offers one way back (DESIGN §6: no disappearing toasts).
 */
export function RouteError() {
  const t = useT();

  return (
    <main className="mx-auto max-w-[720px] px-8 pt-6 pb-12">
      <PageHeader title={t('Well, That Wasn’t on the To-Do List')} />
      <EmptyState
        message={t(
          'This screen procrastinated so hard it never showed up. Your tasks are safe — head back to the Dashboard and try again. We’ll count this as a short break.',
        )}
        action={
          <Link to="/" className={buttonClassName('secondary')}>
            {t('Go to Dashboard')}
          </Link>
        }
      />
    </main>
  );
}

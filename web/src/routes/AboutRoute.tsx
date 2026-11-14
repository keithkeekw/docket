import { APP_NAME } from '@app/shared';
import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { UpdatesSection } from '../components/UpdatesSection';
import { useT } from '../lib/i18n';

/** What this copy of the app is, and where newer versions come from. */
export function AboutRoute() {
  const t = useT();

  return (
    <>
      <PageHeader
        title={t('About')}
        description={t('The version you are running and how to update it.')}
      />

      <div className="mt-6 max-w-[720px]">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4">
          <img
            src="/docket-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-zinc-900">
              {APP_NAME}
              <span className="font-mono text-xs font-normal tabular-nums text-zinc-500">
                v{__APP_VERSION__}
              </span>
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">{t('Your to-do list, minus the guilt.')}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {t('A local task manager: everything stays on this machine.')}{' '}
              <Link to="/guide" className="underline underline-offset-2 hover:text-zinc-900">
                {t('Read the User Guide')}
              </Link>
            </p>
          </div>
        </div>

        <UpdatesSection />
      </div>
    </>
  );
}

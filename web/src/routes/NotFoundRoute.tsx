import { Link } from 'react-router';
import { Badge } from '../components/Badge';
import { Kbd } from '../components/Kbd';
import { PriorityLabel } from '../components/PriorityLabel';
import { buttonClassName } from '../lib/button';
import { useT } from '../lib/i18n';
import { modKeyLabel } from '../lib/platform';

/**
 * 404 as a lost task: the page never made it out of triage. Styled with the
 * same cards, status chips and metadata as a real task row.
 */
export function NotFoundRoute() {
  const t = useT();

  return (
    <div className="mx-auto mt-10 max-w-[720px] text-center">
      <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
        {t('404 · Page Not Found')}
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        {t('This page is still in the backlog.')}
      </h1>
      <p className="mx-auto mt-3 max-w-[560px] text-sm leading-relaxed text-zinc-600">
        {t('We checked every project, milestone, tag and archived corner. This URL never made it out of triage. The good news: your overdue count is unchanged.')}
      </p>

      <div className="relative mt-7 overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-left shadow-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-7 -right-2 text-[104px] leading-none font-bold text-zinc-100 select-none"
        >
          404
        </span>

        <div className="relative flex items-start gap-3">
          <input
            type="checkbox"
            disabled
            aria-label={t('This page is not done')}
            className="mt-0.5 size-4 shrink-0 accent-blue-600"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">{t('Track down this page')}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t('Inbox · No project · Blocked by reality')}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Badge variant="outline">{t('Waiting')}</Badge>
              <PriorityLabel priority={3} />
              <span>{t('Due: someday')}</span>
              <span>{t('Repeat: never')}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
          <Kbd>0/0</Kbd> {t('checklist items done')}
          <span className="ml-auto">#404</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link to="/" className={buttonClassName('primary')}>
          {t('Back to Dashboard')}
        </Link>
        <Link to="/tasks" className={buttonClassName('secondary')}>
          {t('Open All Tasks')}
        </Link>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        {t('Tip: press')} <Kbd>{modKeyLabel()} P</Kbd> {t('to search every page instead.')}
      </p>
    </div>
  );
}

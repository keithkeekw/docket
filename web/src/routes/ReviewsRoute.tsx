import type { Review } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useGenerateReview, useReview, useReviews } from '../api/reviews';
import { Button } from '../components/Button';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { cx } from '../lib/cx';
import { useDateLocale, useLocale, useT } from '../lib/i18n';

const KIND_LABEL: Record<Review['kind'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  manual: 'Manual',
};

/**
 * DESIGN §5.5 Reviews: past reviews on the left (date + type), the selected
 * review on the right, "Generate now" as the single primary action (FR-21).
 */
export function ReviewsRoute() {
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
  const list = useReviews();
  const generate = useGenerateReview();

  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviews = list.data?.reviews ?? [];
  const activeId = selected ?? reviews[0]?.id ?? null;
  const active = useReview(activeId);

  async function generateNow() {
    try {
      const review = await generate.mutateAsync({ kind: 'manual' });
      setSelected(review.id);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate a review');
    }
  }

  return (
    <>
      <PageHeader
        title={t('Reviews')}
        description={t('What moved, what stalled, and what is next.')}
        actions={
          <Button variant="primary" onClick={generateNow} disabled={generate.isPending}>
            {generate.isPending ? t('Generating…') : t('Generate Now')}
          </Button>
        }
      />

      {error && <InlineError message={t(error)} />}

      <div className="mt-6 grid gap-6 min-[900px]:grid-cols-[240px_1fr]">
        <aside aria-label={t('Past Reviews')}>
          {list.isLoading && <p className="text-sm text-zinc-500">{t('Loading…')}</p>}

          {!list.isLoading && reviews.length === 0 && (
            <p className="text-sm text-zinc-500">
              {t('No reviews yet. Generate one now, or let the schedule write them.')}
            </p>
          )}

          {reviews.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {reviews.map((review) => {
                const isActive = review.id === activeId;

                return (
                  <li key={review.id}>
                    <button
                      type="button"
                      aria-current={isActive ? 'true' : undefined}
                      className={cx(
                        'w-full rounded-lg px-3 py-2 text-left',
                        isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                      )}
                      onClick={() => {
                        setSelected(review.id);
                      }}
                    >
                      <span className="block text-[13px] text-zinc-900">
                        {format(parseISO(review.createdAt), locale === 'zh' ? 'yyyy年M月d日' : 'd MMM yyyy', { locale: dateLocale })}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {t(KIND_LABEL[review.kind])} ·{' '}
                        {format(
                          parseISO(review.periodStart),
                          locale === 'zh' ? 'yyyy年M月d日' : 'd MMM yyyy',
                          { locale: dateLocale },
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section aria-label={t('Review')}>
          {active.isLoading && <p className="text-sm text-zinc-500">{t('Loading…')}</p>}

          {active.error && (
            <InlineError
              message={active.error.message}
              onRetry={() => {
                void active.refetch();
              }}
            />
          )}

          {active.data && (
            <article className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 pb-3">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  {t('{kind} Review', { kind: t(KIND_LABEL[active.data.kind]) })}
                </h2>
                <p className="text-xs text-zinc-500">
                  {active.data.periodStart === active.data.periodEnd
                    ? format(parseISO(active.data.periodStart), locale === 'zh' ? 'M月d日 EEEE' : 'EEEE, d MMMM', { locale: dateLocale })
                    : `${format(parseISO(active.data.periodStart), locale === 'zh' ? 'M月d日' : 'd MMM', { locale: dateLocale })} – ${format(
                        parseISO(active.data.periodEnd),
                        locale === 'zh' ? 'M月d日' : 'd MMM',
                        { locale: dateLocale },
                      )}`}{' '}
                  · {active.data.model}
                </p>
              </header>

              <div className="mt-3 space-y-2 text-sm leading-normal text-zinc-700 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-zinc-900 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_li]:my-1 [&_strong]:font-medium [&_strong]:text-zinc-900 [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown>{active.data.contentMd}</ReactMarkdown>
              </div>
            </article>
          )}
        </section>
      </div>
    </>
  );
}

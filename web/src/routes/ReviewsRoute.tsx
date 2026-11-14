import type { Review } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useGenerateReview, useReview, useReviews } from '../api/reviews';
import { InlineError } from '../components/InlineError';
import { PageHeader } from '../components/PageHeader';
import { PrelineTooltip } from '../components/PrelineTooltip';
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
        description={t('Proof you did more than move tasks to tomorrow.')}
        actions={
          <PrelineTooltip label={generate.isPending ? t('Generating…') : t('Generate Now')}>
            <button
              type="button"
              onClick={generateNow}
              disabled={generate.isPending}
              aria-label={generate.isPending ? t('Generating…') : t('Generate Now')}
              className="inline-flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={cx('size-4', generate.isPending && 'animate-pulse motion-reduce:animate-none')}
                aria-hidden="true"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633l-.683-2.051ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </svg>
            </button>
          </PrelineTooltip>
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

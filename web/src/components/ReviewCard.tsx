import type { Review } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router';
import { cx } from '../lib/cx';
import { PrelineTooltip } from './PrelineTooltip';
import { useDateLocale, useLocale, useT } from '../lib/i18n';

/** The first few bullets of the Markdown, which is what DESIGN §4 asks the card to show. */
function insights(markdown: string): string[] {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').replace(/\*\*/g, ''))
    .slice(0, 4);
}

/**
 * DESIGN §4 ReviewCard: title, "Generated … · model", Regenerate + Open review,
 * then 2–4 bullet insights. Only rendered when a review exists (D10).
 */
export function ReviewCard({
  review,
  onRegenerate,
  regenerating,
}: {
  review: Review;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const t = useT();
  const dateLocale = useDateLocale();
  const locale = useLocale();
  const bullets = insights(review.contentMd);
  const kindLabel: Record<Review['kind'], string> = {
    daily: t('Daily Review'),
    weekly: t('Weekly Review'),
    manual: t('Review'),
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-900">{kindLabel[review.kind]}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t('Generated {when} · {model}', {
              when: format(parseISO(review.createdAt), locale === 'zh' ? 'M月d日 HH:mm' : 'd MMM, HH:mm', { locale: dateLocale }),
              model: review.model,
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PrelineTooltip label={regenerating ? t('Regenerating Review') : t('Regenerate Review')}>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              aria-label={regenerating ? t('Regenerating Review') : t('Regenerate Review')}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={cx('size-4', regenerating && 'animate-spin motion-reduce:animate-none')}
              aria-hidden="true"
            >
              <path d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" />
            </svg>
            </button>
          </PrelineTooltip>

          <PrelineTooltip label={t('Open Review')}>
            <Link
              to="/reviews"
              aria-label={t('Open Review')}
              className="inline-flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800"
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L12.94 3.94a1.5 1.5 0 0 0-1.06-.44H4.5ZM7 8.75A.75.75 0 0 1 7.75 8h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 7 8.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
            </Link>
          </PrelineTooltip>
        </div>
      </div>

      {bullets.length > 0 ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-700">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-700">
          {review.contentMd.replace(/^#+\s*/gm, '').slice(0, 320)}
        </p>
      )}
    </section>
  );
}

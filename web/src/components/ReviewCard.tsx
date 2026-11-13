import type { Review } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router';
import { buttonClassName } from '../lib/button';
import { Button } from './Button';

const KIND_LABEL: Record<Review['kind'], string> = {
  daily: 'Daily Review',
  weekly: 'Weekly Review',
  manual: 'Review',
};

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
  const bullets = insights(review.contentMd);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-900">{KIND_LABEL[review.kind]}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Generated {format(parseISO(review.createdAt), 'd MMM, HH:mm')} · {review.model}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? 'Generating…' : 'Regenerate'}
          </Button>
          <Link to="/reviews" className={buttonClassName('primary')}>
            Open Review
          </Link>
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

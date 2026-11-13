import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';

/**
 * The current year as a slim, animated progress bar. The width is the fraction
 * of the year elapsed, and a slow gradient sweep gives it the moving colour
 * feel of progressbar.js without pulling in a canvas runtime.
 */
export function YearProgress() {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    const frame = requestAnimationFrame(() => {
      setDrawn(true);
    });

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, []);

  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const percent = Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
  const daysLeft = Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
  const rounded = Math.round(percent);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
        <span>{t('{year} Progress', { year })}</span>
        <span>
          {t(daysLeft === 1 ? '{percent}% · {count} day left' : '{percent}% · {count} days left', {
            percent: rounded,
            count: daysLeft,
          })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t('{year} progress', { year })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={t('{percent}% of {year}', { percent: rounded, year })}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 sm:h-2"
      >
        <div
          className="h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.35)] transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none motion-reduce:animate-none bg-[linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899,#f59e0b,#3b82f6)] bg-[length:200%_100%] animate-[year-progress-colors_7s_linear_infinite]"
          style={{ width: drawn ? `${percent}%` : '0%' }}
        />
      </div>
    </div>
  );
}

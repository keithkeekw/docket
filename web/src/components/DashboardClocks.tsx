import { formatClockDay, formatClockOffset, formatClockTime, timeZoneLabel } from '../lib/clocks';
import { cx } from '../lib/cx';
import { useLocale } from '../lib/i18n';
import { useNow } from '../lib/useNow';
import { useClocksStore } from '../store/clocks';

const COLUMNS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

/** At most three world clocks, only rendered once Settings has added some. */
export function DashboardClocks() {
  const zones = useClocksStore((state) => state.zones);
  const now = useNow();
  const intlLocale = useLocale() === 'zh' ? 'zh-CN' : 'en';

  if (zones.length === 0) return null;

  return (
    <div
      className={cx(
        'mt-3 grid gap-2 sm:flex sm:flex-wrap',
        COLUMNS[Math.min(zones.length, COLUMNS.length) - 1],
      )}
    >
      {zones.map((zone) => (
        <div
          key={zone}
          className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl border border-zinc-200 bg-white px-2 py-2 text-center sm:flex-row sm:items-baseline sm:gap-2 sm:px-3 sm:text-left"
        >
          <span className="max-w-full truncate text-[11px] font-medium text-zinc-500">
            {timeZoneLabel(zone)}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
            {formatClockTime(zone, now, intlLocale)}
          </span>
          <span className="max-w-full truncate text-[10px] text-zinc-400">
            {formatClockDay(zone, now, intlLocale)} · {formatClockOffset(zone, now, intlLocale)}
          </span>
        </div>
      ))}
    </div>
  );
}

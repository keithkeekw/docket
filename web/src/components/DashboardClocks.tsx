import { formatClockDay, formatClockOffset, formatClockTime, timeZoneLabel } from '../lib/clocks';
import { useLocale } from '../lib/i18n';
import { useNow } from '../lib/useNow';
import { useClocksStore } from '../store/clocks';

/** At most three world clocks, only rendered once Settings has added some. */
export function DashboardClocks() {
  const zones = useClocksStore((state) => state.zones);
  const now = useNow();
  const intlLocale = useLocale() === 'zh' ? 'zh-CN' : 'en';

  if (zones.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {zones.map((zone) => (
        <div
          key={zone}
          className="flex items-baseline gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2"
        >
          <span className="text-[11px] font-medium text-zinc-500">{timeZoneLabel(zone)}</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
            {formatClockTime(zone, now, intlLocale)}
          </span>
          <span className="text-[10px] text-zinc-400">
            {formatClockDay(zone, now, intlLocale)} · {formatClockOffset(zone, now, intlLocale)}
          </span>
        </div>
      ))}
    </div>
  );
}

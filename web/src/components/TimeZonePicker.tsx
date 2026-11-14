import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../lib/cx';
import { formatClockTime, timeZoneLabel } from '../lib/clocks';
import { useT } from '../lib/i18n';
import { controlClassName } from './Field';

const MAX_RESULTS = 50;

const ALL_ZONES: ReadonlyArray<string> = (() => {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    return supported ?? [];
  } catch {
    return [];
  }
})();

type ZoneRow = {
  zone: string;
  city: string;
  region: string;
  offset: string;
  time: string;
  haystack: string;
};

function utcOffset(zone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    timeZoneName: 'shortOffset',
  }).formatToParts(now);
  const value = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  return value === 'GMT' ? 'GMT+0' : value;
}

function buildRows(now: Date, locale: string): ZoneRow[] {
  return ALL_ZONES.map((zone) => {
    const city = timeZoneLabel(zone);
    const region = zone.split('/').slice(0, -1).join(' / ').replace(/_/g, ' ');
    const offset = utcOffset(zone, now);
    return {
      zone,
      city,
      region,
      offset,
      time: formatClockTime(zone, now, locale),
      haystack: `${zone.replace(/_/g, ' ')} ${offset}`.toLowerCase(),
    };
  });
}

function search(rows: ZoneRow[], query: string): ZoneRow[] {
  const terms = query.trim().toLowerCase().replace(/_/g, ' ').split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;

  const first = terms[0] ?? '';
  return rows
    .filter((row) => terms.every((term) => row.haystack.includes(term)))
    .sort(
      (a, b) =>
        Number(b.city.toLowerCase().startsWith(first)) -
        Number(a.city.toLowerCase().startsWith(first)),
    );
}

/**
 * Searchable time zone combobox. Matches city, region, IANA name or offset
 * ("tokyo", "europe", "gmt+8") and shows each zone's local time, which the
 * native datalist cannot style.
 */
export function TimeZonePicker({
  id,
  value,
  onChange,
  onPick,
  added,
  now,
  locale,
  disabled = false,
}: {
  /** Pair with a `<label htmlFor>`; wrapping the list in a label would refocus on every click. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (zone: string) => void;
  /** Zones already on the list, shown but not selectable. */
  added: readonly string[];
  now: Date;
  locale: string;
  disabled?: boolean;
}) {
  const t = useT();
  const listId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Times only change by the minute, so rebuild the rows once per minute.
  const minute = Math.floor(now.getTime() / 60_000);
  const rows = useMemo(() => buildRows(new Date(minute * 60_000), locale), [minute, locale]);

  const matches = useMemo(() => search(rows, value), [rows, value]);
  const shown = matches.slice(0, MAX_RESULTS);
  const activeRow = open ? shown[active] : undefined;

  function moveActive(next: number) {
    if (shown.length === 0) return;
    const index = (next + shown.length) % shown.length;
    setActive(index);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  function pick(row: ZoneRow) {
    if (added.includes(row.zone)) return;
    onPick(row.zone);
    setOpen(false);
    setActive(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (open) moveActive(active - 1);
    } else if (event.key === 'Enter' && activeRow && !added.includes(activeRow.zone)) {
      event.preventDefault();
      pick(activeRow);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
          clipRule="evenodd"
        />
      </svg>

      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeRow ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        className={cx(controlClassName, 'min-h-10 pl-9')}
        placeholder={t('Search a city, region or offset')}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(0);
          listRef.current?.scrollTo({ top: 0 });
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onClick={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        onKeyDown={handleKeyDown}
      />

      {open && !disabled && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-[10px] border border-zinc-200 bg-white shadow-xl">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t('Time zones')}
            className="max-h-72 overflow-y-auto overscroll-contain p-1"
          >
            {shown.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-zinc-500">
                {t('No time zones match “{query}”.', { query: value.trim() })}
              </li>
            )}

            {shown.map((row, index) => {
              const isAdded = added.includes(row.zone);
              return (
                <li
                  key={row.zone}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  aria-disabled={isAdded || undefined}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2',
                    isAdded ? 'cursor-default opacity-50' : 'cursor-pointer',
                    index === active && !isAdded && 'bg-zinc-100',
                  )}
                  onMouseDown={(event) => {
                    // Keep focus in the input so blur does not close the list first.
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    setActive(index);
                  }}
                  onClick={() => {
                    pick(row);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-zinc-900">
                      {row.city}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">
                      {row.region || row.zone}
                    </span>
                  </span>

                  {isAdded ? (
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                      {t('Added')}
                    </span>
                  ) : (
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-zinc-900">
                        {row.time}
                      </span>
                      <span className="text-[10px] text-zinc-500 tabular-nums">{row.offset}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {matches.length > MAX_RESULTS && (
            <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-500">
              {t('Showing {shown} of {total}. Keep typing to narrow it down.', {
                shown: MAX_RESULTS,
                total: matches.length,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

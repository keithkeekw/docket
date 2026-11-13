import { cx } from '../lib/cx';
import { buttonClassName } from '../lib/button';
import { useT } from '../lib/i18n';

export type FilterOption = { value: string; label: string };

/**
 * DESIGN §4 FilterChip: secondary-button look, label "Field: value", opens a
 * dropdown. A native `<details>` gives keyboard toggling and screen-reader
 * semantics without loading Preline's dropdown JS (PROGRESS D26/D32).
 */
export function FilterChip({
  label,
  options,
  selected,
  onChange,
  multiple = true,
  emptyLabel = 'Any',
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  emptyLabel?: string;
}) {
  const t = useT();
  const chosen = options.filter((option) => selected.includes(option.value));
  const summary =
    chosen.length === 0
      ? t(emptyLabel)
      : chosen.length <= 2
        ? chosen.map((option) => option.label).join(', ')
        : t('{count} selected', { count: chosen.length });

  function toggle(value: string) {
    if (!multiple) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }

    onChange(
      selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value],
    );
  }

  return (
    <details className="relative">
      <summary
        className={cx(
          buttonClassName('secondary', 'cursor-pointer list-none select-none gap-1.5'),
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span>{label}:</span>
        <span className={chosen.length === 0 ? 'text-zinc-500' : 'text-zinc-900'}>{summary}</span>
      </summary>

      <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-xl border border-zinc-200 bg-white p-1 shadow-2xl">
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-zinc-500">{t('No options')}</p>
        )}

        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] text-zinc-900"
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={multiple ? undefined : `filter-${label}`}
              className="size-4 shrink-0 accent-blue-600"
              checked={selected.includes(option.value)}
              onChange={() => {
                toggle(option.value);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </details>
  );
}

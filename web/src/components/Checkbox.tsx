/**
 * DESIGN §4: 16 px, accent-blue-600. A real checkbox keeps keyboard and AT support.
 * `round` marks selection (bulk mode) so it never reads as "mark done".
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  round = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  round?: boolean;
}) {
  if (!round) {
    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="size-4 shrink-0 accent-blue-600"
      />
    );
  }

  return (
    <span className="relative inline-flex size-4 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="peer size-4 cursor-pointer appearance-none rounded-full border border-zinc-400 bg-white transition-colors checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute inset-0 hidden size-4 text-white peer-checked:block"
        aria-hidden="true"
      >
        <path d="m4.75 8.25 2.25 2.25 4.25-4.5" />
      </svg>
    </span>
  );
}

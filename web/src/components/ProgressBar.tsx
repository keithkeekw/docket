/** DESIGN §4: 6 px track, blue-600 fill, accessible progress semantics. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** DESIGN §4: 16 px, accent-blue-600. A real checkbox keeps keyboard and AT support. */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
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

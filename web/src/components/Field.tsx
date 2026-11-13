import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '../lib/cx';

/**
 * DESIGN §2.3 / §2.4 form control: 10 px radius, 40 px minimum height, 13 px
 * text. Placeholders use zinc-500 because zinc-400 fails contrast on white
 * (DESIGN §2.1).
 */
const CONTROL =
  'w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Caption + control. A wrapping `<label>` gives every control an accessible
 * name without generating ids, so callers cannot forget one.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] text-zinc-500">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, 'min-h-10', className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cx(CONTROL, 'py-2 leading-normal', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(CONTROL, 'min-h-10', className)} {...props} />;
}

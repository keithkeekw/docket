import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

type ButtonVariant = 'primary' | 'secondary';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg min-h-10 px-3.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white',
  secondary: 'bg-white border border-zinc-200 text-zinc-900',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/** DESIGN §4: one dark primary button per panel; everything else secondary. */
export function Button({ variant = 'secondary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cx(BASE, VARIANTS[variant], className)} {...props} />;
}

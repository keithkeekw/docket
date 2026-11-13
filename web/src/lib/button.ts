import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg min-h-10 px-3.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white',
  secondary: 'bg-white border border-zinc-200 text-zinc-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

/**
 * Shared button styling, kept out of the component module so React Fast Refresh
 * still works (ESLint's only-export-components rule). Exported so a router
 * `<Link>` can look like a button without nesting an anchor in a `<button>`
 * (DESIGN §7).
 */
export function buttonClassName(variant: ButtonVariant = 'secondary', className?: string): string {
  return cx(BASE, VARIANTS[variant], className);
}

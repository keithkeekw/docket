import type { ComponentPropsWithRef } from 'react';
import { buttonClassName, type ButtonVariant } from '../lib/button';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
};

/** DESIGN §4: one dark primary button per panel; everything else secondary. */
export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

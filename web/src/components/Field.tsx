import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Children, isValidElement, useEffect, useMemo, useRef } from 'react';
import HSSelect from 'preline/plugins/select-non-auto';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { ensurePrelineCollections } from '../lib/preline';

/**
 * DESIGN §2.3 / §2.4 form control: 10 px radius, 40 px minimum height, 13 px
 * text. Placeholders use zinc-500 because zinc-400 fails contrast on white
 * (DESIGN §2.1).
 */
export const controlClassName =
  'w-full rounded-[10px] border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50';

const CONTROL = controlClassName;

const SELECT_OPTIONS = {
  // Keep the empty <option> selectable so "Inbox", "None" and
  // "Does Not Repeat" can clear a field.
  optionAllowEmptyOption: true,
  toggleTag:
    '<button type="button"><span data-title class="truncate"></span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="order-1 size-4 shrink-0 text-zinc-400" aria-hidden="true"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg></button>',
  toggleClasses:
    'flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-zinc-200 bg-white px-3 text-left text-[13px] text-zinc-900 hs-select-disabled:cursor-not-allowed hs-select-disabled:opacity-50',
  wrapperClasses: 'relative w-full',
  dropdownClasses:
    'absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[10px] border border-zinc-200 bg-white p-1 shadow-xl',
  optionClasses:
    'flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-[13px] text-zinc-700 hs-selected:bg-zinc-100 hs-selected:text-zinc-900',
};

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
    <div className="flex flex-col gap-1.5">
      {/* The hint sits outside the label so it is not read as part of the name. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-zinc-500">{label}</span>
        {children}
      </label>
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, 'min-h-10', className)} {...props} />;
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={rows} className={cx(CONTROL, 'py-2 leading-normal', className)} {...props} />
  );
}

/**
 * A native select enhanced by Preline's Advanced Select. Native options stay
 * the source of truth for React, while Preline renders the styled dropdown and
 * dispatches the usual `change` event.
 */
export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  const ref = useRef<HTMLSelectElement | null>(null);
  const instanceRef = useRef<{ setValue: (value: string | string[]) => void } | null>(null);
  const t = useT();
  const emptyOption = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      String((child.props as { value?: unknown }).value ?? '') === '',
  );
  const emptyLabel =
    emptyOption && isValidElement(emptyOption)
      ? String((emptyOption.props as { children?: ReactNode }).children ?? '')
      : '';
  const placeholder = emptyLabel || t('Select...');

  const optionsKey = useMemo(
    () =>
      Children.toArray(children)
        .map((child) => {
          if (!isValidElement(child)) return String(child);
          const childProps = child.props as { value?: string | number; children?: ReactNode };
          return `${String(childProps.value)}:${String(childProps.children)}`;
        })
        .join('|'),
    [children],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Preline assumes the current value has a matching <option>. Async option
    // lists (milestones, projects) can arrive after the first render.
    if (!Array.from(el.options).some((option) => option.value === el.value)) return;

    el.setAttribute(
      'data-hs-select',
      JSON.stringify({ ...SELECT_OPTIONS, wrapperClasses: 'relative w-full', placeholder }),
    );
    ensurePrelineCollections();
    const instance = new HSSelect(el);
    instanceRef.current = instance as unknown as { setValue: (value: string | string[]) => void };

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [optionsKey, placeholder]);

  useEffect(() => {
    const el = ref.current;
    const next = String(props.value ?? '');
    if (!el || !Array.from(el.options).some((option) => option.value === next)) return;
    instanceRef.current?.setValue(next);
  }, [props.value, optionsKey]);

  return (
    <div className={wrapperClassName ?? 'w-full'}>
      <select
        ref={ref}
        className={cx(CONTROL, 'min-h-10', className)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

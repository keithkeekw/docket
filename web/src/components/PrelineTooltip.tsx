import HSTooltip from 'preline/plugins/tooltip-non-auto';
import { cloneElement, useEffect, useRef, type ReactElement } from 'react';
import { cx } from '../lib/cx';
import { ensurePrelineCollections } from '../lib/preline';

type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/** NavLink takes a className function, so the toggle class is added to its result. */
type TooltipChildProps = {
  className?: string | ((state: never) => string | undefined);
};

const PLACEMENT_CLASS: Record<Placement, string> = {
  auto: '[--placement:auto]',
  top: '[--placement:top]',
  bottom: '[--placement:bottom]',
  left: '[--placement:left]',
  right: '[--placement:right]',
};

function withToggleClass(
  className: TooltipChildProps['className'],
): TooltipChildProps['className'] {
  if (typeof className === 'function') {
    return (state: never) => cx(className(state), 'hs-tooltip-toggle');
  }
  return cx(className, 'hs-tooltip-toggle');
}

/**
 * Preline tooltip wrapper. The trigger element becomes `hs-tooltip-toggle`;
 * Preline's plugin owns positioning and open/close state, while the stylesheet
 * adds a delay so hover tooltips do not flash.
 */
export function PrelineTooltip({
  label,
  children,
  placement = 'top',
  className,
}: {
  label: string;
  children: ReactElement<TooltipChildProps>;
  placement?: Placement;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    ensurePrelineCollections();
    const tooltip = new HSTooltip(element);
    return () => {
      tooltip.destroy();
    };
  }, []);

  return (
    <span ref={ref} className={cx('hs-tooltip inline-flex', PLACEMENT_CLASS[placement], className)}>
      {cloneElement(children, { className: withToggleClass(children.props.className) })}
      <span
        role="tooltip"
        className="hs-tooltip-content pointer-events-none fixed z-[100] max-w-[280px] rounded-lg bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] leading-snug font-medium whitespace-normal text-white opacity-0 shadow-lg transition-opacity duration-150 hs-tooltip-shown:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

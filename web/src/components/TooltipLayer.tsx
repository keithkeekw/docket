import { useEffect, useRef, useState } from 'react';

/** How long the pointer rests on a control before its tooltip appears. */
const TOOLTIP_DELAY_MS = 700;

type TooltipState = {
  text: string;
  x: number;
  y: number;
  below: boolean;
};

function tooltipText(element: Element): string | null {
  const value = element.getAttribute('data-tooltip');
  const text = value?.trim();
  return text ? text : null;
}

/**
 * One tooltip layer for the whole app. Native `title` attributes cannot be
 * delayed, so they are moved to `data-tooltip` and this layer renders a themed
 * tooltip after `TOOLTIP_DELAY_MS` of hover or keyboard focus.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const timer = useRef<number | null>(null);
  const activeElement = useRef<Element | null>(null);
  const canHover = useRef(true);

  // Move every title into data-tooltip, including ones React adds later.
  useEffect(() => {
    const adopt = (element: Element) => {
      const title = element.getAttribute('title');
      if (title && title.trim()) element.setAttribute('data-tooltip', title);
      element.removeAttribute('title');
    };

    document.querySelectorAll('[title]').forEach(adopt);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'title' &&
          mutation.target instanceof Element
        ) {
          adopt(mutation.target);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    canHover.current = window.matchMedia('(hover: hover)').matches;

    const clearTimer = () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const hide = () => {
      clearTimer();
      activeElement.current = null;
      setTip(null);
    };

    const show = (element: Element) => {
      const text = tooltipText(element);
      if (!text) return;

      const rect = element.getBoundingClientRect();
      const below = rect.top < 52;
      const edge = Math.min(140, window.innerWidth / 2);

      setTip({
        text,
        x: Math.min(Math.max(rect.left + rect.width / 2, edge), window.innerWidth - edge),
        y: below ? rect.bottom + 8 : rect.top - 8,
        below,
      });
    };

    const schedule = (element: Element) => {
      if (activeElement.current === element) return;
      clearTimer();
      setTip(null);
      activeElement.current = element;

      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (!element.isConnected) return;
        show(element);
      }, TOOLTIP_DELAY_MS);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (!canHover.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest('[data-tooltip]');
      if (element) schedule(element);
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!canHover.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest('[data-tooltip]');
      if (!element) return;
      if (element.contains(event.relatedTarget as Node | null)) return;
      if (activeElement.current === element) hide();
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Element) {
        const element = target.closest('[data-tooltip]');
        if (element) schedule(element);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const element = target.closest('[data-tooltip]');
      if (element && activeElement.current === element) hide();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    window.addEventListener('pointerover', onPointerOver, true);
    window.addEventListener('pointerout', onPointerOut, true);
    window.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimer();
      window.removeEventListener('pointerover', onPointerOver, true);
      window.removeEventListener('pointerout', onPointerOut, true);
      window.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!tip) return null;

  return (
    <div
      role="tooltip"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
      }}
      className="pointer-events-none fixed z-[100] max-w-[280px] rounded-lg bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] leading-snug font-medium whitespace-normal text-white shadow-lg"
    >
      {tip.text}
    </div>
  );
}

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { PrelineTooltip } from './PrelineTooltip';
import { useT } from '../lib/i18n';
import { moveItem } from '../lib/moveItem';

export type DashboardCard = {
  id: string;
  title: string;
  node: ReactNode;
  /** Full-width cards break out of the two-column grid. */
  fullWidth?: boolean;
};

const STORAGE_KEY = 'docket:dashboard:cards';

function readStoredOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Reorderable Dashboard cards. The order is stored on this device; the
 * "Rearrange" toggle in the dashboard header turns the drag handles on.
 */
export function DashboardLayout({ cards, editing }: { cards: DashboardCard[]; editing: boolean }) {
  const [storedOrder, setStoredOrder] = useState<string[]>(readStoredOrder);

  const ids = cards.map((card) => card.id);
  const order = [
    ...storedOrder.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !storedOrder.includes(id)),
  ];
  const ordered = order
    .map((id) => cards.find((card) => card.id === id))
    .filter((card): card is DashboardCard => card !== undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    const oldIndex = order.indexOf(activeId);
    const newIndex = order.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = moveItem(order, oldIndex, newIndex);
    setStoredOrder(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A blocked localStorage should not break rearranging this session.
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-2">
        {ordered.map((card) => (
          <SortableCard key={card.id} card={card} editing={editing} />
        ))}
      </div>
    </DndContext>
  );
}

function SortableCard({ card, editing }: { card: DashboardCard; editing: boolean }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !editing,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: card.id, disabled: !editing });

  function setRef(node: HTMLDivElement | null) {
    setNodeRef(node);
    setDropRef(node);
  }

  return (
    <div
      ref={setRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cx(
        'relative min-w-0',
        card.fullWidth && 'min-[900px]:col-span-2',
        editing && 'rounded-xl pt-10 outline-2 outline-dashed outline-blue-300 outline-offset-2',
        isDragging && 'z-20',
      )}
    >
      <div className={editing ? 'pointer-events-none select-none' : undefined}>{card.node}</div>

      {editing && (
        <PrelineTooltip label={t('Drag to Reorder')} className="contents!">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t('Move {title}', { title: card.title })}
            className="absolute inset-x-0 top-0 flex h-9 cursor-grab items-center gap-2 rounded-xl bg-blue-50 px-3 text-left text-xs font-medium text-blue-700 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5"
            aria-hidden="true"
          >
            <circle cx="6" cy="4" r="1" />
            <circle cx="10" cy="4" r="1" />
            <circle cx="6" cy="8" r="1" />
            <circle cx="10" cy="8" r="1" />
            <circle cx="6" cy="12" r="1" />
            <circle cx="10" cy="12" r="1" />
          </svg>
          <span>{card.title}</span>
          <span className="ml-auto text-[11px] font-normal text-blue-500">
            {t('Drag to Reorder')}
          </span>
          </button>
        </PrelineTooltip>
      )}
    </div>
  );
}

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { PrelineTooltip } from './PrelineTooltip';
import { useT } from '../lib/i18n';

type Column = 'left' | 'right';

export type DashboardCard = {
  id: string;
  title: string;
  node: ReactNode;
  /** Full-width cards sit above the two columns and reorder among themselves. */
  fullWidth?: boolean;
  /** Where the card starts before it has ever been moved. */
  defaultColumn?: Column;
};

type Layout = { full: string[]; left: string[]; right: string[] };

type Drop = { id: string; side: 'before' | 'after' } | { column: Column };

const STORAGE_KEY = 'docket:dashboard:layout:v2';
const COLUMN_DROP_ID = { left: 'column:left', right: 'column:right' } as const;

function readStoredLayout(): Layout {
  const empty: Layout = { full: [], left: [], right: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Record<keyof Layout, unknown>>;
    const list = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
    return { full: list(parsed.full), left: list(parsed.left), right: list(parsed.right) };
  } catch {
    return empty;
  }
}

/** Stored placement, minus cards that no longer exist, plus new cards in their default spot. */
function resolveLayout(stored: Layout, cards: DashboardCard[]): Layout {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const keep = (ids: string[], full: boolean) =>
    ids.filter((id) => byId.has(id) && Boolean(byId.get(id)?.fullWidth) === full);

  const layout: Layout = {
    full: keep(stored.full, true),
    left: keep(stored.left, false),
    right: keep(stored.right, false),
  };
  const placed = new Set([...layout.full, ...layout.left, ...layout.right]);

  for (const card of cards) {
    if (placed.has(card.id)) continue;
    if (card.fullWidth) layout.full.push(card.id);
    else if (card.defaultColumn) layout[card.defaultColumn].push(card.id);
    else (layout.left.length <= layout.right.length ? layout.left : layout.right).push(card.id);
  }

  return layout;
}

function applyDrop(layout: Layout, activeId: string, drop: Drop): Layout {
  const lists: Array<keyof Layout> = ['full', 'left', 'right'];
  const source = lists.find((key) => layout[key].includes(activeId));
  if (!source) return layout;

  const next: Layout = {
    full: layout.full.filter((id) => id !== activeId),
    left: layout.left.filter((id) => id !== activeId),
    right: layout.right.filter((id) => id !== activeId),
  };

  if ('column' in drop) {
    next[drop.column].push(activeId);
    return next;
  }

  const target = lists.find((key) => next[key].includes(drop.id));
  if (!target) return layout;
  const index = next[target].indexOf(drop.id) + (drop.side === 'after' ? 1 : 0);
  next[target].splice(index, 0, activeId);
  return next;
}

/**
 * Full-width cards only swap with each other; column cards land on a card
 * (above or below it) or, in the empty space of a column, at its end.
 */
const collision: CollisionDetection = (args) => {
  const activeFull = args.active.data.current?.fullWidth === true;
  const allowed = args.droppableContainers.filter((container) => {
    const data = container.data.current;
    if (activeFull) return data?.kind === 'card' && data.fullWidth === true;
    return data?.kind === 'column' || (data?.kind === 'card' && data.fullWidth !== true);
  });

  const hits = pointerWithin({ ...args, droppableContainers: allowed });
  const cardHit = hits.find(
    (hit) => args.droppableContainers.find((c) => c.id === hit.id)?.data.current?.kind === 'card',
  );
  if (cardHit) return [cardHit];
  if (hits.length > 0) return hits;
  return closestCenter({ ...args, droppableContainers: allowed });
};

function dropFor(event: DragOverEvent | DragEndEvent): Drop | null {
  const { over, active } = event;
  if (!over || over.id === active.id) return null;

  const data = over.data.current;
  if (data?.kind === 'column') return { column: data.column as Column };

  const dragged = active.rect.current.translated;
  const middle = over.rect.top + over.rect.height / 2;
  const center = dragged ? dragged.top + dragged.height / 2 : middle;
  return { id: String(over.id), side: center < middle ? 'before' : 'after' };
}

/**
 * Reorderable Dashboard cards in two independent columns. Placement is stored
 * on this device; the "Rearrange" toggle in the dashboard header turns the
 * drag handles on.
 */
export function DashboardLayout({ cards, editing }: { cards: DashboardCard[]; editing: boolean }) {
  const [stored, setStored] = useState<Layout>(readStoredLayout);
  const [drop, setDrop] = useState<Drop | null>(null);

  const layout = resolveLayout(stored, cards);
  const byId = new Map(cards.map((card) => [card.id, card]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    setDrop(null);
    const target = dropFor(event);
    if (!target) return;

    const next = applyDrop(layout, String(event.active.id), target);
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A blocked localStorage should not break rearranging this session.
    }
  }

  const renderCards = (ids: string[]) =>
    ids.map((id) => {
      const card = byId.get(id);
      if (!card) return null;
      const marker = drop && 'id' in drop && drop.id === id ? drop.side : null;
      return <SortableCard key={id} card={card} editing={editing} dropMarker={marker} />;
    });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragOver={(event) => {
        setDrop(dropFor(event));
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDrop(null);
      }}
    >
      {layout.full.length > 0 && (
        <div className="mt-6 flex flex-col gap-6">{renderCards(layout.full)}</div>
      )}
      <div className="mt-6 grid grid-cols-1 gap-6 min-[900px]:grid-cols-2">
        {(['left', 'right'] as const).map((column) => (
          <ColumnDrop
            key={column}
            column={column}
            editing={editing}
            highlighted={drop !== null && 'column' in drop && drop.column === column}
          >
            {renderCards(layout[column])}
          </ColumnDrop>
        ))}
      </div>
    </DndContext>
  );
}

function ColumnDrop({
  column,
  editing,
  highlighted,
  children,
}: {
  column: Column;
  editing: boolean;
  highlighted: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const { setNodeRef } = useDroppable({
    id: COLUMN_DROP_ID[column],
    disabled: !editing,
    data: { kind: 'column', column },
  });

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex min-w-0 flex-col gap-6',
        editing && 'min-h-24 rounded-xl pb-12',
        highlighted && 'bg-blue-50/60',
      )}
    >
      {children}
      {editing && highlighted && (
        <p className="rounded-xl border-2 border-dashed border-blue-300 py-3 text-center text-xs text-blue-600">
          {t('Drop here')}
        </p>
      )}
    </div>
  );
}

function SortableCard({
  card,
  editing,
  dropMarker,
}: {
  card: DashboardCard;
  editing: boolean;
  dropMarker: 'before' | 'after' | null;
}) {
  const t = useT();
  const data = { kind: 'card', fullWidth: card.fullWidth === true };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !editing,
    data,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: card.id, disabled: !editing, data });

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
        editing && 'rounded-xl pt-10 outline-2 outline-dashed outline-blue-300 outline-offset-2',
        isDragging && 'z-20 opacity-80',
      )}
    >
      {dropMarker && (
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-x-0 z-10 h-1 rounded-full bg-blue-500',
            dropMarker === 'before' ? '-top-4' : '-bottom-4',
          )}
        />
      )}

      <div className={editing ? 'pointer-events-none select-none' : undefined}>{card.node}</div>

      {editing && (
        <PrelineTooltip label={t('Drag to Reorder')} className="contents!">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t('Move {title}', { title: card.title })}
            className="absolute inset-x-0 top-0 flex h-9 cursor-grab items-center gap-2 rounded-xl bg-blue-50 px-3 text-left text-xs font-medium text-blue-700 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
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

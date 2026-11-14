import type { Milestone } from '@app/shared';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { moveItem } from '../lib/moveItem';
import { MilestonePill } from './MilestonePill';

type Drop = { id: string; side: 'before' | 'after' };

function dropFor(event: DragOverEvent | DragEndEvent): Drop | null {
  const { over, active } = event;
  if (!over || over.id === active.id) return null;

  const dragged = active.rect.current.translated;
  const middle = over.rect.left + over.rect.width / 2;
  const center = dragged ? dragged.left + dragged.width / 2 : middle;
  return { id: String(over.id), side: center < middle ? 'before' : 'after' };
}

/**
 * Milestone pills in project order. Drag a pill onto the left or right half of
 * another to place it before or after; a click without movement still selects.
 */
export function MilestoneBar({
  milestones,
  currentId,
  selectedId,
  renamingId,
  onSelect,
  onRename,
  onRenameCancel,
  onStartRename,
  onReorder,
  children,
}: {
  milestones: Milestone[];
  currentId: string | null;
  selectedId: string | null;
  renamingId: string | null;
  onSelect: (id: string) => void;
  onRename: (milestone: Milestone, name: string) => void;
  onRenameCancel: () => void;
  onStartRename: (id: string) => void;
  onReorder: (ids: string[]) => void;
  children?: ReactNode;
}) {
  const [drop, setDrop] = useState<Drop | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    setDrop(null);
    const target = dropFor(event);
    if (!target) return;

    const ids = milestones.map((milestone) => milestone.id);
    const from = ids.indexOf(String(event.active.id));
    const without = ids.filter((id) => id !== event.active.id);
    const to = without.indexOf(target.id) + (target.side === 'after' ? 1 : 0);
    if (from < 0 || to < 0) return;

    const next = moveItem(ids, from, to);
    if (next.some((id, index) => id !== ids[index])) onReorder(next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={(event) => {
        setDrop(dropFor(event));
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDrop(null);
      }}
    >
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {milestones.map((milestone) =>
          renamingId === milestone.id ? (
            <RenameField
              key={milestone.id}
              milestone={milestone}
              onSave={(name) => {
                onRename(milestone, name);
              }}
              onCancel={onRenameCancel}
            />
          ) : (
            <DraggablePill
              key={milestone.id}
              milestone={milestone}
              current={currentId === milestone.id}
              selected={selectedId === milestone.id}
              dropMarker={drop?.id === milestone.id ? drop.side : null}
              onSelect={() => {
                onSelect(milestone.id);
              }}
              onStartRename={() => {
                onStartRename(milestone.id);
              }}
            />
          ),
        )}
        {children}
      </div>
    </DndContext>
  );
}

function DraggablePill({
  milestone,
  current,
  selected,
  dropMarker,
  onSelect,
  onStartRename,
}: {
  milestone: Milestone;
  current: boolean;
  selected: boolean;
  dropMarker: 'before' | 'after' | null;
  onSelect: () => void;
  onStartRename: () => void;
}) {
  const t = useT();
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({ id: milestone.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: milestone.id });

  function setRef(node: HTMLDivElement | null) {
    setNodeRef(node);
    setDropRef(node);
  }

  return (
    <div
      ref={setRef}
      {...listeners}
      title={t('Drag to reorder. Double-click to rename.')}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cx('relative touch-none', isDragging && 'z-20 opacity-80')}
      onDoubleClick={onStartRename}
    >
      {dropMarker && (
        <span
          aria-hidden="true"
          className={cx(
            'absolute inset-y-1 z-10 w-1 rounded-full bg-blue-500',
            dropMarker === 'before' ? '-left-1.5' : '-right-1.5',
          )}
        />
      )}
      <MilestonePill
        milestone={milestone}
        current={current}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}

function RenameField({
  milestone,
  onSave,
  onCancel,
}: {
  milestone: Milestone;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(milestone.name);

  function commit() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== milestone.name) onSave(trimmed);
    else onCancel();
  }

  return (
    <input
      autoFocus
      aria-label={t('Rename {name}', { name: milestone.name })}
      maxLength={200}
      value={name}
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onChange={(event) => {
        setName(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
      onBlur={commit}
      className="min-h-10 w-48 rounded-full border border-blue-300 bg-white px-3.5 text-[13px] font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-blue-600/30"
    />
  );
}

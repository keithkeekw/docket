import type { ProposalItem } from '@app/shared';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useApplyProposal, useDiscardProposal } from '../api/proposals';
import { cx } from '../lib/cx';
import { useUiStore } from '../store/ui';
import { Badge, LinkBadge } from './Badge';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { InlineError } from './InlineError';

const OP_LABEL: Record<ProposalItem['op'], string> = {
  create_task: 'New task',
  update_task: 'Update',
  move_task: 'Move',
  delete_task: 'Delete',
  create_milestone: 'New milestone',
};

type Draft = { item: ProposalItem; included: boolean; title: string };

/**
 * DESIGN §4 ProposalModal: the single preview-and-confirm surface for every AI
 * write (FR-23). Items start ticked; the title can be edited; unticked items are
 * simply not sent. Apply is one transaction on the server (NFR-6).
 */
export function ProposalModal() {
  const proposal = useUiStore((state) => state.proposal);
  const close = useUiStore((state) => state.closeProposal);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useApplyProposal();
  const discard = useDiscardProposal();

  const isOpen = proposal !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!proposal) return;

    setDrafts(
      proposal.items.map((item) => ({
        item,
        included: item.op !== 'delete_task',
        title: item.fields.title ?? '',
      })),
    );
    setError(null);
  }, [proposal]);

  if (!proposal) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby="proposal-title"
        className="m-auto w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
        onClose={() => {
          if (isOpen) close();
        }}
      />
    );
  }

  const included = drafts.filter((draft) => draft.included);
  const count = included.length;

  async function handleApply() {
    if (!proposal) return;

    try {
      await apply.mutateAsync({
        id: proposal.id,
        items: included.map((draft) => ({
          ...draft.item,
          fields: { ...draft.item.fields, title: draft.title.trim() },
        })),
      });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add those tasks');
    }
  }

  async function handleDiscard() {
    if (!proposal) return;

    try {
      await discard.mutateAsync({ id: proposal.id });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not discard the proposal');
    }
  }

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="proposal-title"
      className="m-auto w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (isOpen) close();
      }}
    >
      <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="proposal-title" className="text-[15px] font-semibold text-zinc-900">
            Proposed tasks
          </h2>
          <p className="text-xs text-zinc-500">
            Parsed by: {proposal.feature === 'capture' ? 'Capture' : proposal.feature} model ·{' '}
            <Link to="/settings" className="text-blue-600 hover:underline">
              Change in Settings
            </Link>
          </p>
        </header>

        <p className="mt-1 text-xs text-zinc-500">
          {count} of {drafts.length} {drafts.length === 1 ? 'task' : 'tasks'} will be added.
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {drafts.map((draft, index) => (
            <li
              key={draft.item.id}
              className={cx(
                'rounded-xl border border-zinc-200 px-4 py-3.5',
                draft.included ? 'bg-white' : 'bg-zinc-50',
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 items-center">
                  <Checkbox
                    checked={draft.included}
                    label={`Include "${draft.title || 'untitled'}"`}
                    onChange={(checked) => {
                      setDrafts((current) =>
                        current.map((entry, position) =>
                          position === index ? { ...entry, included: checked } : entry,
                        ),
                      );
                    }}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      autoFocus={index === 0}
                      aria-label={`Title for proposed task ${index + 1}`}
                      className="min-h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 text-sm text-zinc-900 placeholder:text-zinc-500"
                      value={draft.title}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDrafts((current) =>
                          current.map((entry, position) =>
                            position === index ? { ...entry, title: value } : entry,
                          ),
                        );
                      }}
                    />
                    <Badge>{OP_LABEL[draft.item.op]}</Badge>
                  </div>

                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                    <Field label="Project" value={draft.item.display.projectName ?? 'Inbox'} />
                    <Field label="Milestone" value={draft.item.display.milestoneName ?? '—'} />
                    <Field label="Status" value={draft.item.display.statusName ?? 'To do'} />
                    <Field
                      label="Priority"
                      value={draft.item.fields.priority ? `P${draft.item.fields.priority}` : '—'}
                    />
                    <Field label="Due" value={draft.item.fields.dueDate ?? '—'} />
                    <Field
                      label="Estimate"
                      value={
                        draft.item.fields.estimateMinutes
                          ? `${draft.item.fields.estimateMinutes}m`
                          : '—'
                      }
                    />
                    <Field label="Tags" value={draft.item.fields.tags?.join(', ') ?? '—'} />
                    <Field
                      label="Link"
                      value={
                        draft.item.fields.link ? (
                          <LinkBadge href={draft.item.fields.link.url}>
                            {draft.item.fields.link.label ?? draft.item.fields.link.url}
                          </LinkBadge>
                        ) : (
                          '—'
                        )
                      }
                    />
                  </dl>

                  {draft.item.aiNote && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700">
                      {draft.item.aiNote}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {error && <InlineError message={error} />}

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-500">
            Enter to add · Esc to cancel · nothing is saved until you confirm
          </p>

          <div className="flex items-center gap-2">
            <Button onClick={handleDiscard} disabled={discard.isPending || apply.isPending}>
              {discard.isPending ? 'Discarding…' : 'Discard'}
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={count === 0 || apply.isPending}
            >
              {apply.isPending
                ? 'Adding…'
                : `Add ${count} ${count === 1 ? 'task' : 'tasks'}`}
            </Button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className="truncate text-[13px] text-zinc-900">{value}</dd>
    </div>
  );
}

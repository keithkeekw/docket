import type { ProposalItem } from '@app/shared';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useApplyProposal, useDiscardProposal } from '../api/proposals';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { confirmAction } from '../store/confirm';
import { useUiStore } from '../store/ui';
import { Badge, LinkBadge } from './Badge';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { InlineError } from './InlineError';

const FEATURE_LABELS = { capture: 'Capture', breakdown: 'Breakdown', chat: 'Chat' } as const;

const OP_LABEL: Record<ProposalItem['op'], string> = {
  create_task: 'New Task',
  update_task: 'Update',
  move_task: 'Move',
  delete_task: 'Delete',
  create_project: 'New Project',
  create_milestone: 'New Milestone',
};

const TASK_OPS = new Set<ProposalItem['op']>(['create_task', 'update_task', 'move_task', 'delete_task']);

type Draft = { item: ProposalItem; included: boolean; title: string };

/**
 * DESIGN §4 ProposalModal: the single preview-and-confirm surface for every AI
 * write (FR-23). Items start ticked; the title can be edited; unticked items are
 * simply not sent. Apply is one transaction on the server (NFR-6).
 */
export function ProposalModal() {
  const t = useT();
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
        className="m-auto max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
        onClose={() => {
          if (isOpen) close();
        }}
      />
    );
  }

  const included = drafts.filter((draft) => draft.included);
  const count = included.length;
  const isPlan = drafts.some((draft) => !TASK_OPS.has(draft.item.op));
  const noun = isPlan ? 'item' : 'task';
  const countNoun = count === 1 ? noun : `${noun}s`;
  const totalNoun = drafts.length === 1 ? noun : `${noun}s`;

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
      setError(cause instanceof Error ? cause.message : t('Could not add those tasks'));
    }
  }

  async function handleDiscard() {
    if (!proposal) return;

    const confirmed = await confirmAction({
      title: t('Discard Proposal'),
      message: t('This proposal will be discarded and nothing will be added.'),
      confirmLabel: t('Discard Proposal'),
    });
    if (!confirmed) return;

    try {
      await discard.mutateAsync({ id: proposal.id });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('Could not discard the proposal'));
    }
  }

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="proposal-title"
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/50"
      onClick={handleBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (isOpen) close();
      }}
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-2">
          <h2 id="proposal-title" className="text-[15px] font-semibold text-zinc-900">
            {proposal.feature === 'breakdown' || isPlan ? t('Proposed Plan') : t('Proposed Tasks')}
          </h2>
          <p className="text-xs text-zinc-500">
            {t('Parsed by: {feature} model', {
              feature: t(FEATURE_LABELS[proposal.feature]),
            })}
            {' · '}
            <Link to="/settings" className="text-blue-600 hover:underline">
              {t('Change in Settings')}
            </Link>
          </p>
        </header>

        <p className="px-5 text-xs text-zinc-500">
          {t(`{count} of {total} ${totalNoun} will be added.`, {
            count,
            total: drafts.length,
          })}
        </p>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 flex flex-col gap-2">
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
                    label={t('Include "{title}"', { title: draft.title || t('untitled') })}
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
                      aria-label={t('Title for proposed task {index}', { index: index + 1 })}
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
                    <Badge>{t(OP_LABEL[draft.item.op])}</Badge>
                  </div>

                  {draft.item.op === 'create_project' ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                      <div className="col-span-2 min-w-0 sm:col-span-3">
                        <dt className="text-[11px] text-zinc-500">{t('Description')}</dt>
                        <dd className="text-[13px] whitespace-pre-line text-zinc-900">
                          {draft.item.fields.description || '—'}
                        </dd>
                      </div>
                      <Field label={t('Target Date')} value={draft.item.fields.targetDate ?? '—'} />
                    </dl>
                  ) : draft.item.op === 'create_milestone' ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                      <Field
                        label={t('Project')}
                        value={draft.item.display.projectName ?? t('Inbox')}
                      />
                    </dl>
                  ) : (
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                    <Field
                      label={t('Project')}
                      value={draft.item.display.projectName ?? t('Inbox')}
                    />
                    <Field label={t('Milestone')} value={draft.item.display.milestoneName ?? '—'} />
                    <Field
                      label={t('Status')}
                      value={draft.item.display.statusName ?? t('To do')}
                    />
                    <Field
                      label={t('Priority')}
                      value={draft.item.fields.priority ? `P${draft.item.fields.priority}` : '—'}
                    />
                    <Field label={t('Due')} value={draft.item.fields.dueDate ?? '—'} />
                    <Field
                      label={t('Estimate')}
                      value={
                        draft.item.fields.estimateMinutes
                          ? `${draft.item.fields.estimateMinutes}m`
                          : '—'
                      }
                    />
                    <Field label={t('Tags')} value={draft.item.fields.tags?.join(', ') ?? '—'} />
                    <Field
                      label={t('Link')}
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
                  )}

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

        {error && (
          <div className="px-5 pb-2">
            <InlineError message={error} />
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
          <p className="text-xs text-zinc-500">
            {t('Enter to add · Esc to cancel · nothing is saved until you confirm')}
          </p>

          <div className="flex items-center gap-2">
            <Button onClick={handleDiscard} disabled={discard.isPending || apply.isPending}>
              {discard.isPending ? t('Discarding…') : t('Discard')}
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={count === 0 || apply.isPending}
            >
              {apply.isPending ? t('Adding…') : t(`Add {count} ${countNoun}`, { count })}
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

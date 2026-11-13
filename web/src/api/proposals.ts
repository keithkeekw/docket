import {
  proposalResponseSchema,
  type Proposal,
  type ProposalItem,
} from '@app/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMutate } from './client';

/**
 * AI capture (FR-3): returns a **pending** proposal. Nothing is written until
 * the modal's apply step, which is the only path that touches tasks (FR-23).
 */
export function useCaptureWithAi() {
  return useMutation<Proposal, Error, { text: string }>({
    mutationFn: async ({ text }) =>
      (await apiMutate('/api/ai/capture', 'POST', { text }, proposalResponseSchema)).proposal,
  });
}

/**
 * AI project breakdown (FR-18): milestones first, then tasks, as one pending
 * proposal. Shares the preview/apply path with capture.
 */
export function useBreakdown() {
  return useMutation<Proposal, Error, { projectId: string }>({
    mutationFn: async ({ projectId }) =>
      (await apiMutate('/api/ai/breakdown', 'POST', { projectId }, proposalResponseSchema)).proposal,
  });
}

function useInvalidateAfterApply() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['task'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
    void queryClient.invalidateQueries({ queryKey: ['milestones'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['nav'] });
    void queryClient.invalidateQueries({ queryKey: ['tags'] });
  };
}

export function useApplyProposal() {
  const invalidate = useInvalidateAfterApply();

  return useMutation<Proposal, Error, { id: string; items: ProposalItem[] }>({
    mutationFn: async ({ id, items }) =>
      (
        await apiMutate(`/api/proposals/${id}/apply`, 'POST', { items }, proposalResponseSchema)
      ).proposal,
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDiscardProposal() {
  return useMutation<Proposal, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      (await apiMutate(`/api/proposals/${id}/discard`, 'POST', {}, proposalResponseSchema))
        .proposal,
  });
}

import {
  reviewListSchema,
  reviewResponseSchema,
  type Review,
  type ReviewKind,
  type ReviewList,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const reviewsQueryKey = ['reviews'] as const;
export const reviewQueryKey = (id: string) => ['reviews', id] as const;

export function useReviews() {
  return useQuery<ReviewList>({
    queryKey: reviewsQueryKey,
    queryFn: ({ signal }) => apiGet('/api/reviews', reviewListSchema, signal),
  });
}

/** GET marks the review opened on the server (the "days started from a review" metric). */
export function useReview(id: string | null) {
  return useQuery<Review>({
    queryKey: reviewQueryKey(id ?? ''),
    queryFn: async ({ signal }) =>
      (await apiGet(`/api/reviews/${id}`, reviewResponseSchema, signal)).review,
    enabled: Boolean(id),
  });
}

export function useGenerateReview() {
  const queryClient = useQueryClient();

  return useMutation<Review, Error, { kind: ReviewKind }>({
    mutationFn: async ({ kind }) =>
      (await apiMutate('/api/reviews/generate', 'POST', { kind }, reviewResponseSchema)).review,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

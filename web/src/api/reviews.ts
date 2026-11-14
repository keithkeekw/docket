import {
  reviewListSchema,
  reviewResponseSchema,
  reviewScheduleSchema,
  type Review,
  type ReviewKind,
  type ReviewList,
  type ReviewSchedule,
  type UpdateReviewScheduleBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiMutate } from './client';

export const reviewsQueryKey = ['reviews'] as const;
export const reviewQueryKey = (id: string) => ['reviews', id] as const;
export const reviewScheduleQueryKey = ['review-schedule'] as const;

/** Settings → Reviews: on/off, daily or weekly, and when. */
export function useReviewSchedule() {
  return useQuery<ReviewSchedule>({
    queryKey: reviewScheduleQueryKey,
    queryFn: ({ signal }) => apiGet('/api/settings/reviews', reviewScheduleSchema, signal),
  });
}

/** Applies the change at once so the controls never lag, and rolls back on failure. */
export function useUpdateReviewSchedule() {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewSchedule,
    Error,
    UpdateReviewScheduleBody,
    { previous: ReviewSchedule | undefined }
  >({
    mutationFn: (body) =>
      apiMutate('/api/settings/reviews', 'PUT', body, reviewScheduleSchema),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: reviewScheduleQueryKey });
      const previous = queryClient.getQueryData<ReviewSchedule>(reviewScheduleQueryKey);
      if (previous) {
        queryClient.setQueryData<ReviewSchedule>(reviewScheduleQueryKey, { ...previous, ...body });
      }
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(reviewScheduleQueryKey, context.previous);
      }
    },
    onSuccess: (schedule) => {
      queryClient.setQueryData(reviewScheduleQueryKey, schedule);
    },
  });
}

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

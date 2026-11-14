import {
  aiProjectSummaryResponseSchema,
  deleteMilestoneResponseSchema,
  milestoneListSchema,
  milestoneResponseSchema,
  projectListSchema,
  projectResponseSchema,
  reorderMilestonesResponseSchema,
  type AiProjectSummaryResponse,
  type CreateMilestoneBody,
  type CreateProjectBody,
  type DeleteMilestoneResponse,
  type Milestone,
  type MilestoneList,
  type ProjectList,
  type ProjectSummary,
  type UpdateMilestoneBody,
  type UpdateProjectBody,
} from '@app/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiDelete, apiDeleteJson, apiGet, apiMutate } from './client';
import { navQueryKey } from './nav';

const PROJECTS_KEY = ['projects'] as const;

export const projectQueryKey = (id: string) => ['projects', 'detail', id] as const;
export const milestonesQueryKey = (projectId: string) => ['milestones', projectId] as const;

/** A project write can move tasks between collections and change the sidebar. */
function invalidateProjectData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
  void queryClient.invalidateQueries({ queryKey: ['milestones'] });
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: navQueryKey });
}

export function useProjects() {
  return useQuery<ProjectList>({
    queryKey: [...PROJECTS_KEY, 'list'],
    queryFn: ({ signal }) => apiGet('/api/projects', projectListSchema, signal),
  });
}

export function useProject(id: string | undefined) {
  return useQuery<ProjectSummary>({
    queryKey: projectQueryKey(id ?? ''),
    queryFn: async ({ signal }) =>
      (await apiGet(`/api/projects/${id}`, projectResponseSchema, signal)).project,
    enabled: Boolean(id),
  });
}

export function useMilestones(projectId: string | undefined) {
  return useQuery<MilestoneList>({
    queryKey: milestonesQueryKey(projectId ?? ''),
    queryFn: ({ signal }) =>
      apiGet(`/api/projects/${projectId}/milestones`, milestoneListSchema, signal),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectSummary, Error, CreateProjectBody>({
    mutationFn: async (body) =>
      (await apiMutate('/api/projects', 'POST', body, projectResponseSchema)).project,
    onSuccess: () => {
      invalidateProjectData(queryClient);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectSummary, Error, { id: string } & UpdateProjectBody>({
    mutationFn: async ({ id, ...body }) =>
      (await apiMutate(`/api/projects/${id}`, 'PATCH', body, projectResponseSchema)).project,
    onSuccess: () => {
      invalidateProjectData(queryClient);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => apiDelete(`/api/projects/${id}`),
    onSuccess: () => {
      // The project screen is still mounted for a tick; refetching its detail
      // would 404, so only the list, tasks and counts are refreshed.
      void queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: navQueryKey });
    },
  });
}

export function useArchivedProjects() {
  return useQuery<ProjectList>({
    queryKey: [...PROJECTS_KEY, 'archived'],
    queryFn: ({ signal }) => apiGet('/api/projects?archived=true', projectListSchema, signal),
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation<ProjectSummary, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      (await apiMutate(`/api/projects/${id}`, 'PATCH', { archived: true }, projectResponseSchema))
        .project,
    onSuccess: () => {
      invalidateProjectData(queryClient);
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation<ProjectSummary, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      (await apiMutate(`/api/projects/${id}`, 'PATCH', { archived: false }, projectResponseSchema))
        .project,
    onSuccess: () => {
      invalidateProjectData(queryClient);
    },
  });
}

export function useProjectSummary() {
  return useMutation<AiProjectSummaryResponse, Error, { projectId: string }>({
    mutationFn: ({ projectId }) =>
      apiMutate('/api/ai/project-summary', 'POST', { projectId }, aiProjectSummaryResponseSchema),
  });
}

/** Milestone writes change pills, counts and project progress. */
function invalidateMilestoneData(queryClient: QueryClient, projectId: string): void {
  void queryClient.invalidateQueries({ queryKey: milestonesQueryKey(projectId) });
  void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
  void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: navQueryKey });
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<Milestone, Error, CreateMilestoneBody>({
    mutationFn: async (body) =>
      (
        await apiMutate(
          `/api/projects/${projectId}/milestones`,
          'POST',
          body,
          milestoneResponseSchema,
        )
      ).milestone,
    onSuccess: () => {
      invalidateMilestoneData(queryClient, projectId);
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<Milestone, Error, { id: string } & UpdateMilestoneBody>({
    mutationFn: async ({ id, ...body }) =>
      (await apiMutate(`/api/milestones/${id}`, 'PATCH', body, milestoneResponseSchema)).milestone,
    onSuccess: () => {
      invalidateMilestoneData(queryClient, projectId);
    },
  });
}

/** Its tasks move to the Inbox; the response says how many. */
export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteMilestoneResponse, Error, { id: string }>({
    mutationFn: async ({ id }) =>
      apiDeleteJson(`/api/milestones/${id}`, deleteMilestoneResponseSchema),
    onSuccess: () => {
      invalidateMilestoneData(queryClient, projectId);
    },
  });
}

/** Pills move at once; a failed save rolls the order back. */
export function useReorderMilestones(projectId: string) {
  const queryClient = useQueryClient();
  const key = milestonesQueryKey(projectId);

  return useMutation<{ reordered: number }, Error, { ids: string[] }, { previous?: MilestoneList }>(
    {
      mutationFn: (body) =>
        apiMutate(
          `/api/projects/${projectId}/milestones/reorder`,
          'POST',
          body,
          reorderMilestonesResponseSchema,
        ),
      onMutate: async ({ ids }) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<MilestoneList>(key);
        if (previous) {
          const byId = new Map(previous.milestones.map((milestone) => [milestone.id, milestone]));
          const milestones = ids.flatMap((id, position) => {
            const milestone = byId.get(id);
            return milestone ? [{ ...milestone, position }] : [];
          });
          queryClient.setQueryData<MilestoneList>(key, { milestones });
        }
        return { previous };
      },
      onError: (_error, _body, context) => {
        if (context?.previous) queryClient.setQueryData(key, context.previous);
      },
      onSettled: () => {
        invalidateMilestoneData(queryClient, projectId);
      },
    },
  );
}

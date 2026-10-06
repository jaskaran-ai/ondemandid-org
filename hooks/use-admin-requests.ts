'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
import { useAdminSession } from '@/hooks/use-admin-login';
import { toast } from 'sonner';

export function useAdminRequests(
  status?: string,
  page: number = 1,
  pageSize?: number
) {
  const { data: session, isPending: sessionPending } = useAdminSession();

  return useQuery({
    ...orpc.requests.list.queryOptions({ input: { status, page, pageSize } }),
    enabled: !sessionPending && session?.authenticated === true,
  });
}

interface RequestsListData {
  requests: Array<{ id: string | number }>;
  total: number;
}

export function useAdminDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.requests.delete.mutationOptions(),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: ['requests', 'list'] });

      const previous = queryClient.getQueriesData<RequestsListData>({
        queryKey: ['requests', 'list'],
      });

      queryClient.setQueriesData<RequestsListData>(
        { queryKey: ['requests', 'list'] },
        old =>
          old
            ? {
              ...old,
              requests: old.requests.filter(
                r => String(r.id) !== String(variables.id)
              ),
              total: Math.max(0, old.total - 1),
            }
            : old
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || 'Failed to delete request');
    },
    onSuccess: () => {
      toast.success('Request deleted successfully');
      queryClient.invalidateQueries({ queryKey: orpc.requests.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.stats.key() });
    },
  });
}
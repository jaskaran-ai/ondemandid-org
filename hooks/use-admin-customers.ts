'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
import { useAdminSession } from '@/hooks/use-admin-login';
import { toast } from 'sonner';

export function useAdminCustomers(
  status?: string,
  search?: string,
  page: number = 1,
  pageSize?: number
) {
  const { data: session, isPending: sessionPending } = useAdminSession();

  return useQuery({
    ...orpc.customers.list.queryOptions({
      input: { status, search, page, pageSize },
    }),
    enabled: !sessionPending && session?.authenticated === true,
  });
}

export function useAdminUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.customers.update.mutationOptions(),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: ['customers', 'list'] });

      const previous = queryClient.getQueriesData<CustomersListData>({
        queryKey: ['customers', 'list'],
      });

      queryClient.setQueriesData<CustomersListData>(
        { queryKey: ['customers', 'list'] },
        old =>
          old
            ? {
              ...old,
              customers: old.customers.map(c =>
                String(c.id) === String(variables.id)
                  ? {
                    ...c,
                    status: variables.status ?? c.status,
                    idConnection:
                      variables.idConnection !== undefined
                        ? variables.idConnection
                        : c.idConnection,
                    notes:
                      variables.notes !== undefined
                        ? variables.notes
                        : c.notes,
                  }
                  : c
              ),
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
      toast.error(error.message || 'Failed to update customer');
    },
    onSuccess: () => {
      toast.success('Customer updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orpc.customers.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.stats.key() });
      queryClient.invalidateQueries({ queryKey: orpc.customers.stats.key() });
    },
  });
}

function listInput(queryKey: unknown) {
  const options = (queryKey as unknown[])[2] as
    | { input?: { status?: string; search?: string; page?: number } }
    | undefined;
  return options?.input;
}

export function useAdminCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.customers.create.mutationOptions(),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: ['customers', 'list'] });

      const previous = queryClient.getQueriesData<CustomersListData>({
        queryKey: ['customers', 'list'],
      });

      const tempId = `temp-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const entries = queryClient.getQueriesData<CustomersListData>({
        queryKey: ['customers', 'list'],
      });

      for (const [key, old] of entries) {
        if (!old) continue;

        const input = listInput(key);
        if (input?.status && input.status !== 'pending') continue;
        if (input?.search) {
          const q = input.search.toLowerCase();
          const matches =
            variables.companyName.toLowerCase().includes(q) ||
            variables.contactName.toLowerCase().includes(q) ||
            variables.email.toLowerCase().includes(q);
          if (!matches) continue;
        }
        if ((input?.page ?? 1) !== 1) {
          queryClient.setQueryData(key, { ...old, total: old.total + 1 });
          continue;
        }

        const tempCustomer: CustomerRow = {
          id: tempId,
          companyName: variables.companyName,
          contactName: variables.contactName,
          email: variables.email,
          countryCode: variables.countryCode,
          mobile: variables.mobile,
          initialUsers: variables.initialUsers,
          idConnection: null,
          status: 'pending',
          notes: variables.notes ?? null,
          createdAt: Date.now(),
        };

        queryClient.setQueryData(key, {
          customers: [tempCustomer, ...old.customers],
          total: old.total + 1,
        });
      }

      return { previous: entries, tempId };
    },
    onSuccess: (result, _variables, context) => {
      toast.success('Customer created successfully');
      if (context?.tempId) {
        queryClient.setQueriesData<CustomersListData>(
          { queryKey: ['customers', 'list'] },
          old =>
            old
              ? {
                ...old,
                customers: old.customers.map(c =>
                  String(c.id) === String(context.tempId)
                    ? { ...c, id: result.id }
                    : c
                ),
              }
              : old
        );
      }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message || 'Failed to create customer');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orpc.customers.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.stats.key() });
      queryClient.invalidateQueries({ queryKey: orpc.customers.stats.key() });
    },
  });
}

interface CustomerRow {
  id: string | number;
  companyName: string;
  contactName: string;
  email: string;
  countryCode: string;
  mobile: string;
  initialUsers: number;
  idConnection: string | null;
  status: string;
  notes: string | null;
  createdAt: number;
}

interface CustomersListData {
  customers: CustomerRow[];
  total: number;
}

export function useAdminDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.customers.delete.mutationOptions(),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: ['customers', 'list'] });

      const previous = queryClient.getQueriesData<CustomersListData>({
        queryKey: ['customers', 'list'],
      });

      queryClient.setQueriesData<CustomersListData>(
        { queryKey: ['customers', 'list'] },
        old =>
          old
            ? {
              ...old,
              customers: old.customers.filter(
                c => String(c.id) !== String(variables.id)
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
      toast.error(error.message || 'Failed to delete customer');
    },
    onSuccess: () => {
      toast.success('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: orpc.customers.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.stats.key() });
      queryClient.invalidateQueries({ queryKey: orpc.customers.stats.key() });
    },
  });
}

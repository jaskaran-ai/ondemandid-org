'use client';

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
import { useAdminSession } from '@/hooks/use-admin-login';

export function useAdminCustomerStats() {
  const { data: session, isPending: sessionPending } = useAdminSession();

  return useQuery({
    ...orpc.customers.stats.queryOptions(),
    enabled: !sessionPending && session?.authenticated === true,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
import { useAdminSession } from '@/hooks/use-admin-login';

export function useAdminStats() {
  const { data: session, isPending: sessionPending } = useAdminSession();

  return useQuery({
    ...orpc.stats.queryOptions(),
    enabled: !sessionPending && session?.authenticated === true,
  });
}

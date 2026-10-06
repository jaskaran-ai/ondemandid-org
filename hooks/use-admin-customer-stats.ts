'use client';

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';

export function useAdminCustomerStats() {
  return useQuery(orpc.customers.stats.queryOptions());
}

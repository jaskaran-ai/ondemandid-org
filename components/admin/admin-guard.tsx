'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/hooks/use-admin-login';

/**
 * Redirects unauthenticated users without blocking page data fetches.
 * Session check runs in parallel with admin oRPC queries.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isPending, isError } = useAdminSession();

  useEffect(() => {
    if (isPending) return;
    if (isError || !data?.authenticated) {
      router.replace('/admin/login');
    }
  }, [data, isPending, isError, router]);

  if (!isPending && (isError || !data?.authenticated)) {
    return null;
  }

  return <>{children}</>;
}

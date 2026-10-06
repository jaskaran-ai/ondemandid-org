'use client';

import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { RouterClient } from '@orpc/server';
import type { adminRouter } from './router';

const link = new RPCLink({
  url:
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/rpc`
      : 'http://localhost:3000/api/rpc',
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: 'include',
    }),
  headers: async () => {
    if (typeof window !== 'undefined') {
      return {};
    }
    const { headers } = await import('next/headers');
    return await headers();
  },
});

export const orpcClient: RouterClient<typeof adminRouter> =
  createORPCClient(link);

export const orpc = createTanstackQueryUtils(orpcClient);

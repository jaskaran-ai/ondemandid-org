import { RPCHandler } from '@orpc/server/fetch';
import { adminRouter } from '@/lib/orpc/router';

export const runtime = 'nodejs';

const handler = new RPCHandler(adminRouter);

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: {},
  });
  return response ?? new Response('Not found', { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;

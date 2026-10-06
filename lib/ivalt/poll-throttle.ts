/** Minimum ms between iVALT result polls for the same request (in-process; serverless = per instance). */
const MIN_INTERVAL_MS = parseInt(
  process.env.IVALT_POLL_MIN_INTERVAL_MS || '2500',
  10
);

const lastPollAt = new Map<string, number>();

export function shouldPollIvalt(requestId: string): boolean {
  const now = Date.now();
  const last = lastPollAt.get(requestId) ?? 0;
  if (now - last < MIN_INTERVAL_MS) {
    return false;
  }
  lastPollAt.set(requestId, now);
  return true;
}

export function clearIvaltPollThrottle(requestId: string): void {
  lastPollAt.delete(requestId);
}

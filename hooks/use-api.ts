'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SignupValues, VerifyValues } from '@/lib/validation';

// API response types
interface SignupResponse {
  ok: boolean;
  message?: string;
}

interface VerifyResponse {
  ok: boolean;
  id?: string;
  ivaltStatusCode?: number;
  error?: string;
}

interface StatusResponse {
  status: 'initiated' | 'pending' | 'authenticated' | 'failed' | 'not_found';
  ivaltStatusCode?: number;
  completedAt?: string;
  details?: Record<string, unknown> | null;
}

// Signup mutation
export function useSignup() {
  return useMutation({
    mutationFn: async (values: SignupValues): Promise<SignupResponse> => {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.error || `Failed to submit signup (${res.status})`
        );
      }

      return res.json();
    },
    onSuccess: data => {
      if (data.ok) {
        toast.success('Signup submitted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit signup');
    },
  });
}

// Verify mutation
export function useVerify() {
  return useMutation({
    mutationFn: async (values: VerifyValues): Promise<VerifyResponse> => {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.status === 404) {
        return { ok: false, ivaltStatusCode: 404 };
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to initiate verification');
      }

      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate verification');
    },
  });
}

// Status query for polling
export function useStatus(requestId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['status', requestId],
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch(`/api/status/${requestId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }
      return res.json();
    },
    enabled: enabled && !!requestId,
    refetchInterval: query => {
      const data = query.state.data as StatusResponse | undefined;
      if (
        data &&
        (data.status === 'authenticated' ||
          data.status === 'failed' ||
          data.status === 'not_found')
      ) {
        return false;
      }
      return 3000;
    },
    refetchIntervalInBackground: true,
    retry: 1,
  });
}

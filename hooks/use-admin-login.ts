'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/axios';

export function useAdminLogin() {
  return useMutation({
    mutationFn: async (values: { countryCode: string; mobile: string }) => {
      const res = await api.post('/api/admin/login', values);
      return res.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

export function useAdminLoginStatus(requestId: string | null) {
  return useQuery({
    queryKey: ['admin-login-status', requestId],
    queryFn: async () => {
      const res = await api.get(
        `/api/admin/login-status?requestId=${requestId}`
      );
      return res.data;
    },
    enabled: !!requestId,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    retry: 1,
  });
}

export function useAdminSession() {
  return useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const res = await api.get('/api/admin/session');
      return res.data;
    },
    retry: false,
  });
}

export function useAdminLogout() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/admin/logout');
      return res.data;
    },
  });
}

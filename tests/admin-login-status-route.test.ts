import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DEMO_MODE = 'true';
process.env.AUTHORIZED_ADMIN_NUMBERS = '+91:9530654704,+91:6283974746';

import { GET } from '@/app/api/admin/login-status/route';
import { resolveAt, loginAttempts } from '@/app/api/admin/login-status/route';

describe('GET /api/admin/login-status', () => {
  beforeEach(() => {
    resolveAt.clear();
    loginAttempts.clear();
  });

  it('returns 400 when requestId is missing', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/login-status'),
      {}
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing requestId parameter');
  });

  it('returns 400 for invalid requestId in demo mode', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/login-status?requestId=invalid'),
      {}
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired login session');
  });

  it('returns pending before resolve time in demo mode', async () => {
    // Setup a requestId that will resolve in the future
    const requestId = 'admin_login_test_123';
    resolveAt.set(requestId, Date.now() + 5000);
    loginAttempts.set(requestId, {
      countryCode: '+91',
      mobile: '9530654704',
      createdAt: Date.now(),
    });

    const res = await GET(
      new Request(`http://localhost/api/admin/login-status?requestId=${requestId}`),
      {}
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.ivaltStatusCode).toBe(422);
  });

  it('returns authenticated after resolve time in demo mode', async () => {
    const requestId = 'admin_login_test_456';
    // Set resolve time in the past
    resolveAt.set(requestId, Date.now() - 1000);
    loginAttempts.set(requestId, {
      countryCode: '+91',
      mobile: '9530654704',
      createdAt: Date.now(),
    });

    const res = await GET(
      new Request(`http://localhost/api/admin/login-status?requestId=${requestId}`),
      {}
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('authenticated');
    expect(body.ivaltStatusCode).toBe(200);
    // Should have set session cookie
    const cookies = res.headers.get('set-cookie');
    expect(cookies).toBeDefined();
    expect(cookies).toContain('ivalt-admin-session=');
  });
});

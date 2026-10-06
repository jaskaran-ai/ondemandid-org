import { describe, it, expect, beforeEach } from 'vitest';

process.env.DEMO_MODE = 'true';
process.env.AUTHORIZED_ADMIN_NUMBERS =
  '+91:9530654704,+91:6283974746';

import { POST } from '@/app/api/admin/login/route';
import { loginAttempts } from '@/app/api/admin/login/route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    loginAttempts.clear();
  });

  it('returns 400 for invalid input', async () => {
    const res = await post({ countryCode: '1', mobile: '123' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 403 for unauthorized mobile number', async () => {
    const res = await post({
      countryCode: '+1',
      mobile: '5550100123',
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('This mobile number is not authorized for admin access.');
  });

  it('returns 200 with requestId for authorized admin in demo mode', async () => {
    const res = await post({
      countryCode: '+91',
      mobile: '9530654704',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.requestId).toBeDefined();
    expect(body.message).toContain('Biometric authentication request sent');
  });

  it('returns 200 for second authorized admin mobile', async () => {
    const res = await post({
      countryCode: '+91',
      mobile: '6283974746',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.requestId).toBeDefined();
  });
});

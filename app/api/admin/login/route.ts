import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security';
import { triggerAuthRequest } from '@/lib/ivalt';
import {
  isAuthorizedAdminMobile,
  ADMIN_ID_CONNECTION,
} from '@/lib/admin/auth';

const loginSchema = z.object({
  countryCode: z
    .string()
    .regex(/^\+\d{1,4}$/, 'Country code must look like +1 or +44'),
  mobile: z
    .string()
    .regex(
      /^\d{6,14}$/,
      'Mobile number must be 6-14 digits, no spaces or dashes'
    ),
});

// In-memory store for pending admin login attempts (requestId -> { mobile, createdAt })
// In production, use Redis or a database table
declare global {
  // eslint-disable-next-line no-var
  var __adminLoginAttempts:
    | Map<string, { countryCode: string; mobile: string; createdAt: number }>
    | undefined;
}

export const loginAttempts: Map<string, { countryCode: string; mobile: string; createdAt: number }> =
  globalThis.__adminLoginAttempts ?? new Map();
if (!globalThis.__adminLoginAttempts) {
  globalThis.__adminLoginAttempts = loginAttempts;
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = checkRateLimit(
    `admin-login:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { countryCode, mobile } = parsed.data;

    if (!isAuthorizedAdminMobile(countryCode, mobile)) {
      return NextResponse.json(
        { error: 'This mobile number is not authorized for admin access.' },
        { status: 403 }
      );
    }

    const isDemoMode = process.env.DEMO_MODE === 'true';

    // Generate a unique requestId for tracking (same as verify route pattern)
    const requestId = `admin_login_${Math.random().toString(36).slice(2, 12)}`;

    if (isDemoMode) {
      // Simulate iVALT auth request
      await new Promise(r => setTimeout(r, 400));
      loginAttempts.set(requestId, {
        countryCode,
        mobile,
        createdAt: Date.now(),
      });
      return NextResponse.json({
        ok: true,
        requestId,
        message: 'Biometric authentication request sent to your iVALT app.',
      });
    }

    // Production: trigger real iVALT auth request
    try {
      await triggerAuthRequest({
        idConnection: ADMIN_ID_CONNECTION,
        countryCode,
        mobile,
      });

      loginAttempts.set(requestId, {
        countryCode,
        mobile,
        createdAt: Date.now(),
      });

      return NextResponse.json({
        ok: true,
        requestId,
        message: 'Biometric authentication request sent to your iVALT app.',
      });
    } catch (error) {
      console.error('Admin login iVALT error:', error);
      const message =
        error instanceof Error && error.message.includes('IVALT_API_KEY')
          ? 'iVALT API key is not configured. Set IVALT_API_KEY in .env or enable DEMO_MODE=true.'
          : 'Failed to send authentication request. Please try again.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

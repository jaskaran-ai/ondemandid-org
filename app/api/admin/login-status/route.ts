import { NextResponse } from 'next/server';
import { getAuthResult, mapIvaltStatus } from '@/lib/ivalt';
import {
  shouldPollIvalt,
  clearIvaltPollThrottle,
} from '@/lib/ivalt/poll-throttle';
import { setSessionCookie } from '@/lib/admin/auth';

// Demo mode store for admin login resolution
declare global {
  // eslint-disable-next-line no-var
  var __adminLoginResolve: Map<string, number> | undefined;
}

export const resolveAt: Map<string, number> =
  globalThis.__adminLoginResolve ?? new Map();
if (!globalThis.__adminLoginResolve) {
  globalThis.__adminLoginResolve = resolveAt;
}

// Reference the same in-memory store used by the login route
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json(
      { error: 'Missing requestId parameter' },
      { status: 400 }
    );
  }

  const isDemoMode = process.env.DEMO_MODE === 'true';

  if (isDemoMode) {
    // In demo mode, requestId must be a known login attempt
    if (!loginAttempts.has(requestId) && !resolveAt.has(requestId)) {
      return NextResponse.json(
        { error: 'Invalid or expired login session' },
        { status: 400 }
      );
    }

    // Simulate: resolve after 4 seconds
    if (!resolveAt.has(requestId)) {
      resolveAt.set(requestId, Date.now() + 4000);
    }

    const resolveTime = resolveAt.get(requestId)!;
    if (Date.now() < resolveTime) {
      return NextResponse.json({
        status: 'pending',
        ivaltStatusCode: 422,
      });
    }

    const attempt = loginAttempts.get(requestId);
    if (!attempt) {
      return NextResponse.json(
        { error: 'Invalid or expired login session' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      status: 'authenticated',
      ivaltStatusCode: 200,
    });
    setSessionCookie(response, attempt.mobile);
    resolveAt.delete(requestId);
    loginAttempts.delete(requestId);
    return response;
  }

  // Production: poll iVALT API using stored mobile number
  const attempt = loginAttempts.get(requestId);
  if (!attempt) {
    return NextResponse.json(
      { error: 'Invalid or expired login session' },
      { status: 400 }
    );
  }

  if (!shouldPollIvalt(requestId)) {
    return NextResponse.json({
      status: 'pending',
      ivaltStatusCode: 422,
    });
  }

  try {
    const authResult = await getAuthResult({
      countryCode: attempt.countryCode,
      mobile: attempt.mobile,
    });

    // Parse iVALT response - handle both new and old response formats
    let statusCode: number;
    if (authResult.data) {
      // New format: { data: { status: true, ... }, error: null }
      statusCode = authResult.data.status === true ? 200 : 422;
    } else {
      // Old format: { statusCode: 200, ... }
      statusCode = authResult.statusCode ?? 422;
    }

    const { status, ivaltStatusCode } = mapIvaltStatus(statusCode);

    if (status === 'authenticated') {
      clearIvaltPollThrottle(requestId);
      loginAttempts.delete(requestId);
      const response = NextResponse.json({
        status: 'authenticated',
        ivaltStatusCode,
      });
      setSessionCookie(response, attempt.mobile);
      return response;
    }

    if (status === 'pending') {
      return NextResponse.json({
        status: 'pending',
        ivaltStatusCode,
      });
    }

    clearIvaltPollThrottle(requestId);
    loginAttempts.delete(requestId);
    return NextResponse.json({
      status,
      ivaltStatusCode,
    });
  } catch (error) {
    console.error('Admin login status error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}

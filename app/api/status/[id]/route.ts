import { NextResponse } from 'next/server';
import { db, schema, isUsingPostgres } from '@/lib/db';
import { and, eq, isNull } from 'drizzle-orm';
import { getAuthResult, mapIvaltStatus } from '@/lib/ivalt';
import {
  shouldPollIvalt,
  clearIvaltPollThrottle,
} from '@/lib/ivalt/poll-throttle';
import { simRequests } from '@/lib/sim-store';

const DEBUG_MODE =
  process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';

// Demo mode handler
async function handleDemoMode(id: string) {
  const r = simRequests.get(id);

  if (!r) {
    return { id, status: 'not_found', ivaltStatusCode: 404 };
  }

  // If already terminal, return as-is
  if (
    r.status === 'authenticated' ||
    r.status === 'failed' ||
    r.status === 'not_found'
  ) {
    return {
      id: r.id,
      status: r.status,
      ivaltStatusCode: r.ivaltStatusCode,
      completedAt: r.completedAt,
    };
  }

  const now = Date.now();
  if (now >= r.resolveAt) {
    r.status = r.finalStatus;
    r.ivaltStatusCode = r.finalCode;
    r.completedAt = now;
    simRequests.set(r.id, r);
    return {
      id: r.id,
      status: r.status,
      ivaltStatusCode: r.ivaltStatusCode,
      completedAt: new Date(r.completedAt).toISOString(),
    };
  }

  return {
    id: r.id,
    status: 'pending',
    ivaltStatusCode: 422,
    completedAt: undefined,
  };
}

// Production mode handler
async function handleProductionMode(id: string) {
  // Query the database for the request
  const requests = await db
    .select()
    .from(schema.ondemandRequests)
    .where(
      and(
        eq(schema.ondemandRequests.id, id),
        isNull(schema.ondemandRequests.deletedAt)
      )
    )
    .limit(1);

  if (requests.length === 0) {
    return { id, status: 'not_found', ivaltStatusCode: 404 };
  }

  const request = requests[0];

  if (DEBUG_MODE) {
    console.log('[Status API] Production mode check:', {
      requestId: id,
      currentStatus: request.status,
      ivaltStatusCode: request.ivaltStatusCode,
    });
  }

  // If already terminal (authenticated, failed, not_found, error), return as-is
  if (
    request.status === 'authenticated' ||
    request.status === 'failed' ||
    request.status === 'not_found' ||
    request.status === 'error'
  ) {
    // Ensure completedAt is a string
    const completedAt = request.completedAt;
    return {
      id: request.id,
      status: request.status,
      ivaltStatusCode: request.ivaltStatusCode,
      completedAt: completedAt
        ? new Date(completedAt).toISOString()
        : undefined,
    };
  }

  // If pending or initiated, query iVALT API for latest status
  if (request.status === 'pending' || request.status === 'initiated') {
    if (!shouldPollIvalt(id)) {
      return {
        id: request.id,
        status: request.status,
        ivaltStatusCode: request.ivaltStatusCode || 422,
        completedAt: undefined,
      };
    }

    try {
      const authResult = await getAuthResult({
        countryCode: request.countryCode,
        mobile: request.mobile,
      });

      if (DEBUG_MODE) {
        console.log('[Status API] iVALT response:', {
          requestId: id,
          response: authResult,
        });
      }

      // Parse iVALT response - handle both old and new response formats
      let statusCode: number;
      let isAuthenticated: boolean;

      if (authResult.data) {
        // New response format: { data: { status: true, ... }, error: null }
        isAuthenticated = authResult.data.status === true;
        statusCode = isAuthenticated ? 200 : 422;
      } else {
        // Old response format: { statusCode: 200, ... }
        statusCode = authResult.statusCode ?? 422;
        isAuthenticated = statusCode === 200;
      }

      // Map iVALT status code to internal status
      const { status, ivaltStatusCode } = mapIvaltStatus(statusCode);

      // Update database with latest status
      const updateData: any = {
        status,
        ivaltStatusCode,
        ivaltResponse:
          isUsingPostgres
            ? authResult
            : JSON.stringify(authResult),
      };

      // If terminal, set completedAt
      if (
        status === 'authenticated' ||
        status === 'failed' ||
        status === 'not_found'
      ) {
        clearIvaltPollThrottle(id);
        updateData.completedAt = isUsingPostgres
          ? new Date()
          : new Date().toISOString();
      }

      await db
        .update(schema.ondemandRequests)
        .set(updateData)
        .where(eq(schema.ondemandRequests.id, id));

      const completedAt =
        updateData.completedAt instanceof Date
          ? updateData.completedAt.toISOString()
          : updateData.completedAt;

      // Extract user details from iVALT response for authenticated requests
      const details = authResult.data?.details || null;

      const result = {
        id: request.id,
        status,
        ivaltStatusCode,
        completedAt,
        details,
      };

      if (DEBUG_MODE) {
        console.log('[Status API] Returning result:', result);
      }

      return result;
    } catch (error) {
      console.error('iVALT status API error:', error);
      // Return current pending status on error
      return {
        id: request.id,
        status: 'pending',
        ivaltStatusCode: request.ivaltStatusCode || 422,
      };
    }
  }

  // Default return for any other status
  return {
    id: request.id,
    status: request.status,
    ivaltStatusCode: request.ivaltStatusCode || 422,
    completedAt: undefined,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';

    const result = isDemoMode
      ? await handleDemoMode(id)
      : await handleProductionMode(id);

    if ('status' in result && result.status === 'not_found') {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

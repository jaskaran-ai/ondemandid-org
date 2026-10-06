import { NextResponse } from 'next/server';
import { verifySchema } from '@/lib/validation';
import { db, schema, isUsingPostgres } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { triggerAuthRequest, mapIvaltStatus } from '@/lib/ivalt';
import { sendAdminVerificationAlert } from '@/lib/email';
import { simRequests } from '@/lib/sim-store';

// Demo mode handler
async function handleDemoMode(data: any) {
  const { idConnection, countryCode, mobile } = data;

  // Simulate request creation latency
  await new Promise(r => setTimeout(r, 400));

  const id = `req_${Math.random().toString(36).slice(2, 10)}`;
  const now = Date.now();

  // Decide final outcome for the demo
  let finalStatus: 'authenticated' | 'failed' | 'not_found' = 'authenticated';
  let finalCode = 200;

  const NOT_REGISTERED_CODES = new Set(['MISSING01']);
  if (NOT_REGISTERED_CODES.has(idConnection)) {
    finalStatus = 'not_found';
    finalCode = 404;
  } else if (mobile.endsWith('0000')) {
    finalStatus = 'failed';
    finalCode = 403;
  }

  // Resolve after 4–7 seconds for a believable polling experience
  const resolveAt = now + 4000 + Math.floor(Math.random() * 3000);

  simRequests.set(id, {
    id,
    idConnection,
    countryCode,
    mobile,
    status: 'pending',
    ivaltStatusCode: 422,
    createdAt: now,
    resolveAt,
    finalStatus,
    finalCode,
  });

  return {
    ok: true,
    id,
    status: 'initiated',
    ivaltStatusCode: 422,
    message: "Push notification dispatched to user's iVALT mobile app",
  };
}

// Production mode handler
async function handleProductionMode(data: any, request: Request) {
  const { idConnection, countryCode, mobile } = data;

  // Validate IDCONNECTION against active customers
  const customers = await db
    .select()
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.idConnection, idConnection),
        eq(schema.customers.status, 'active')
      )
    )
    .limit(1);

  if (customers.length === 0) {
    return {
      error: 'IDCONNECTION not found or inactive',
      status: 'not_found',
    };
  }

  // Get request metadata
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create ondemand request record
  const requestRecord = await db
    .insert(schema.ondemandRequests)
    .values({
      countryCode,
      mobile,
      idConnection,
      status: 'initiated',
      ipAddress: ip,
      userAgent,
    })
    .returning();

  const requestId = requestRecord[0].id;

  // Log verification request
  console.log('[Verify API] Production mode request:', {
    requestId,
    idConnection,
    countryCode,
    mobile,
    ip,
    userAgent,
  });

  // Call iVALT API to trigger push notification
  let ivaltResponse: any = null;
  let ivaltStatusCode: number | null = null;

  try {
    const authRequest = await triggerAuthRequest({
      idConnection,
      countryCode,
      mobile,
    });
    ivaltStatusCode = 202; // iVALT returns 202 on success
    ivaltResponse = authRequest;
  } catch (error: any) {
    console.error('iVALT API error:', error);
    // Extract status code from error message if present
    const match = error?.message?.match?.(/iVALT API error \((\d+)\)/);
    ivaltStatusCode = match ? parseInt(match[1], 10) : null;
    ivaltResponse = { error: String(error) };
  }

  // Update request with iVALT response
  await db
    .update(schema.ondemandRequests)
    .set({
      ivaltStatusCode,
      ivaltResponse:
        isUsingPostgres
          ? ivaltResponse
          : JSON.stringify(ivaltResponse),
    })
    .where(eq(schema.ondemandRequests.id, requestId));

  // Send admin notification email (non-blocking)
  sendAdminVerificationAlert({
    idConnection,
    countryCode,
    mobile,
    status: 'initiated',
    ivaltStatusCode: ivaltStatusCode || 0,
    requestId,
  }).catch(error => {
    console.error('Failed to send admin verification alert email:', error);
  });

  return {
    ok: true,
    id: requestId,
    status: 'initiated',
    ivaltStatusCode: ivaltStatusCode || 422,
    message: "Push notification dispatched to user's iVALT mobile app",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid verification payload',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isDemoMode = process.env.DEMO_MODE === 'true';

    const result = isDemoMode
      ? await handleDemoMode(data)
      : await handleProductionMode(data, request);

    if ('error' in result) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}

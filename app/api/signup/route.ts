import { NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validation';
import { db, schema } from '@/lib/db';
import {
  sendAdminSignupNotification,
  sendCustomerConfirmation,
} from '@/lib/email';
import { checkRateLimit, stripHtml } from '@/lib/security';
import {
  verifyCaptchaToken,
  isCaptchaEnforced,
  isCaptchaMisconfigured,
} from '@/lib/captcha';

const MAX_BODY_SIZE = 256_000; // 256 KB
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// Demo mode handler
async function handleDemoMode(body: any) {
  await new Promise(r => setTimeout(r, 600));
  const id = `cust_${Math.random().toString(36).slice(2, 10)}`;
  return {
    ok: true,
    id,
    status: 'pending',
    message:
      'Signup received. An iVALT representative will provision your IDCONNECTION code within one business day.',
  };
}

// Production mode handler
async function handleProductionMode(data: any) {
  const customer = await db
    .insert(schema.customers)
    .values({
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      countryCode: data.countryCode,
      mobile: data.mobile,
      initialUsers: data.initialUsers,
      notes: data.notes || null,
      status: 'pending',
    })
    .returning();

  const customerId = customer[0].id;

  // Send emails (non-blocking, graceful degradation)
  Promise.all([
    sendAdminSignupNotification({
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      countryCode: data.countryCode,
      mobile: data.mobile,
      initialUsers: data.initialUsers,
      notes: data.notes || '',
      customerId,
    }).catch(error => {
      console.error('Failed to send admin notification email:', error);
    }),
    sendCustomerConfirmation({
      email: data.email,
      companyName: data.companyName,
      customerId,
    }).catch(error => {
      console.error('Failed to send customer confirmation email:', error);
    }),
  ]);

  return {
    ok: true,
    id: customerId,
    status: 'pending',
    message:
      'Signup received. An iVALT representative will provision your IDCONNECTION code within one business day.',
  };
}

export async function POST(request: Request) {
  // Body size check
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413 }
    );
  }

  // Rate limiting by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = checkRateLimit(
    `signup:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      }
    );
  }

  if (isCaptchaMisconfigured()) {
    console.error(
      'Signup blocked: CAPTCHA secret is set but NEXT_PUBLIC site key is missing'
    );
    return NextResponse.json(
      { error: 'Signup is temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid signup payload',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify CAPTCHA token (Turnstile or reCAPTCHA based on provider)
    if (data.captchaToken) {
      const captchaValid = await verifyCaptchaToken(data.captchaToken, {
        remoteIp: ip,
      });
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }
    } else if (isCaptchaEnforced()) {
      // Secret key is configured but token is missing
      return NextResponse.json(
        { error: 'Security verification required.' },
        { status: 400 }
      );
    }

    // Sanitize notes field to strip HTML tags (XSS prevention for email contexts)
    const sanitizedData = {
      ...data,
      notes: data.notes ? stripHtml(data.notes) : null,
    };

    const isDemoMode = process.env.DEMO_MODE === 'true';

    const result = isDemoMode
      ? await handleDemoMode(body)
      : await handleProductionMode(sanitizedData);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    // Duplicate email: Postgres unique violation (23505) or SQLite
    // constraint (SQLITE_CONSTRAINT_UNIQUE). Surface a friendly message —
    // the raw DB error is internal.
    if (
      error?.code === '23505' ||
      error?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      (typeof error?.message === 'string' &&
        error.message.includes('customers_email_unique'))
    ) {
      return NextResponse.json(
        {
          error:
            'This email address is already registered. Please use a different email, or contact iVALT support if you believe this is a mistake.',
        },
        { status: 409 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    );
  }
}

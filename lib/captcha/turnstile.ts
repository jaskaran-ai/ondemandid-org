const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileVerifyResult = {
  success: boolean;
  errorCodes?: string[];
};

/**
 * Server-side Turnstile validation (Siteverify API).
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string,
  options?: { remoteIp?: string }
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      'TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification'
    );
    return { success: true };
  }

  if (!token?.trim()) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (options?.remoteIp) {
    body.set('remoteip', options.remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    return {
      success: data.success === true,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return { success: false, errorCodes: ['internal-error'] };
  }
}

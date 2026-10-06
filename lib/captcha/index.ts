export type CaptchaProvider = 'turnstile' | 'recaptcha';

export { verifyTurnstileToken, type TurnstileVerifyResult } from './turnstile';

export function getCaptchaProvider(): CaptchaProvider {
  const provider = process.env.CAPTCHA_PROVIDER;
  if (provider === 'recaptcha') return 'recaptcha';
  return 'turnstile';
}

export function getCaptchaSiteKey(): string | undefined {
  const provider = getCaptchaProvider();
  if (provider === 'recaptcha') {
    return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  }
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export function getPublicCaptchaProvider(): CaptchaProvider {
  if (typeof process !== 'undefined' && process.env) {
    const provider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER;
    if (provider === 'recaptcha') return 'recaptcha';
  }
  return 'turnstile';
}

/** Server will reject signup without a token when this is true. */
export function isCaptchaEnforced(): boolean {
  const provider = getCaptchaProvider();
  if (provider === 'recaptcha') {
    return !!process.env.RECAPTCHA_SECRET_KEY;
  }
  return !!process.env.TURNSTILE_SECRET_KEY;
}

async function verifyReCaptchaToken(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn(
      'RECAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification'
    );
    return true;
  }
  try {
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }).toString(),
      }
    );
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export async function verifyCaptchaToken(
  token: string,
  options?: { remoteIp?: string }
): Promise<boolean> {
  const provider = getCaptchaProvider();
  if (provider === 'recaptcha') {
    return verifyReCaptchaToken(token);
  }
  const result = await verifyTurnstileToken(token, options);
  if (!result.success && result.errorCodes?.length) {
    console.warn('[Turnstile] siteverify failed:', result.errorCodes.join(', '));
  }
  return result.success;
}

/** Show widget on signup when the public site key is configured. */
export function isCaptchaConfigured(): boolean {
  const provider = getPublicCaptchaProvider();
  if (provider === 'recaptcha') {
    return !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  }
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

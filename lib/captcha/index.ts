export type CaptchaProvider = 'turnstile' | 'recaptcha';

import {
  verifyTurnstileToken,
  type TurnstileVerifyResult,
} from './turnstile';

export { verifyTurnstileToken, type TurnstileVerifyResult };

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

function captchaKeyPair(): { secret: boolean; siteKey: boolean } {
  const provider = getCaptchaProvider();
  if (provider === 'recaptcha') {
    return {
      secret: !!process.env.RECAPTCHA_SECRET_KEY,
      siteKey: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    };
  }
  return {
    secret: !!process.env.TURNSTILE_SECRET_KEY,
    siteKey: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };
}

/** Secret without public site key — server would block signup with no widget. */
export function isCaptchaMisconfigured(): boolean {
  const { secret, siteKey } = captchaKeyPair();
  return secret && !siteKey;
}

/** Server will reject signup without a token when both keys are set. */
export function isCaptchaEnforced(): boolean {
  if (isCaptchaMisconfigured()) {
    return false;
  }
  const { secret, siteKey } = captchaKeyPair();
  return secret && siteKey;
}

export type SignupCaptchaConfig = {
  provider: CaptchaProvider;
  siteKey: string | null;
  required: boolean;
  misconfigured: boolean;
};

/** Read at request time on the server and pass into the signup client. */
export function getSignupCaptchaConfig(): SignupCaptchaConfig {
  const provider = getCaptchaProvider();
  const siteKey = getCaptchaSiteKey() ?? null;
  const misconfigured = isCaptchaMisconfigured();
  return {
    provider,
    siteKey,
    required: isCaptchaEnforced(),
    misconfigured,
  };
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

/** @deprecated Prefer `getSignupCaptchaConfig()` from a Server Component. */
export function isCaptchaConfigured(): boolean {
  return !!getCaptchaSiteKey();
}

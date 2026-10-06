import { cookies } from 'next/headers';
import crypto from 'crypto';
import {
  getAuthorizedAdminNumbers,
  type AuthorizedAdmin,
} from './authorized-admins';

export type { AuthorizedAdmin };

export function isAuthorizedAdminMobile(
  countryCode: string,
  mobile: string
): boolean {
  return getAuthorizedAdminNumbers().some(
    admin => admin.countryCode === countryCode && admin.mobile === mobile
  );
}

function isAuthorizedAdminMobileInToken(mobile: string): boolean {
  return getAuthorizedAdminNumbers().some(admin => admin.mobile === mobile);
}

// iVALT idConnection for the admin account.
// Set ADMIN_IVALT_ID_CONNECTION in .env for production.
export const ADMIN_ID_CONNECTION =
  process.env.ADMIN_IVALT_ID_CONNECTION || 'IVALTADMIN';

// --- Session token ---

const COOKIE_NAME = 'ivalt-admin-session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

function getSigningKey(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.IVALT_API_KEY ||
    'ivalt-admin-dev-secret-change-in-production'
  );
}

/**
 * Create an HMAC-signed session token.
 * Payload: { sub: "admin", mobile, exp }
 */
export function createSessionToken(mobile: string): string {
  if (!isAuthorizedAdminMobileInToken(mobile)) {
    throw new Error('Mobile number is not authorized for admin session');
  }

  const payload = {
    sub: 'admin',
    mobile,
    jti: crypto.randomBytes(16).toString('hex'), // random nonce guarantees uniqueness
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningKey())
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify an HMAC-signed session token.
 * Returns true if the token is valid and not expired.
 */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [data, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', getSigningKey())
    .update(data)
    .digest('base64url');

  // Timing-safe comparison
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    );
    if (
      payload.sub !== 'admin' ||
      typeof payload.mobile !== 'string' ||
      !isAuthorizedAdminMobileInToken(payload.mobile)
    ) {
      return false;
    }
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the current request has a valid admin session.
 * Usage in Server Components or API routes.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Set the admin session cookie on the response.
 */
export function setSessionCookie(response: Response, mobile: string): void {
  const token = createSessionToken(mobile);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`
  );
}

/**
 * Clear the admin session cookie on the response.
 */
export function clearSessionCookie(response: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`
  );
}

export { COOKIE_NAME };

export type AuthorizedAdmin = {
  countryCode: string;
  mobile: string;
};

const COUNTRY_CODE_RE = /^\+\d{1,4}$/;
const MOBILE_RE = /^\d{6,14}$/;

/**
 * Parse AUTHORIZED_ADMIN_NUMBERS from env.
 * Format: comma-separated entries of `+<country>:<mobile>` or `<mobile>` (defaults to +91).
 * Example: +91:9530654704,+91:6283974746
 */
export function parseAuthorizedAdminNumbers(raw: string | undefined): AuthorizedAdmin[] {
  if (!raw?.trim()) {
    return [];
  }

  const admins: AuthorizedAdmin[] = [];

  for (const entry of raw.split(',')) {
    const part = entry.trim();
    if (!part) continue;

    let countryCode: string;
    let mobile: string;

    if (part.includes(':')) {
      const colon = part.indexOf(':');
      countryCode = part.slice(0, colon).trim();
      mobile = part.slice(colon + 1).trim();
    } else {
      countryCode = '+91';
      mobile = part;
    }

    if (!COUNTRY_CODE_RE.test(countryCode) || !MOBILE_RE.test(mobile)) {
      console.warn(
        `[Admin] Skipping invalid AUTHORIZED_ADMIN_NUMBERS entry: "${part}"`
      );
      continue;
    }

    admins.push({ countryCode, mobile });
  }

  return admins;
}

export function getAuthorizedAdminNumbers(): AuthorizedAdmin[] {
  return parseAuthorizedAdminNumbers(process.env.AUTHORIZED_ADMIN_NUMBERS);
}

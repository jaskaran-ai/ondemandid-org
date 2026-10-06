import { describe, it, expect } from 'vitest';
import { parseAuthorizedAdminNumbers } from '@/lib/admin/authorized-admins';

describe('parseAuthorizedAdminNumbers', () => {
  it('parses country:mobile pairs', () => {
    expect(
      parseAuthorizedAdminNumbers('+91:9530654704,+91:6283974746')
    ).toEqual([
      { countryCode: '+91', mobile: '9530654704' },
      { countryCode: '+91', mobile: '6283974746' },
    ]);
  });

  it('defaults country to +91 when omitted', () => {
    expect(parseAuthorizedAdminNumbers('9530654704')).toEqual([
      { countryCode: '+91', mobile: '9530654704' },
    ]);
  });

  it('returns empty for missing env value', () => {
    expect(parseAuthorizedAdminNumbers(undefined)).toEqual([]);
    expect(parseAuthorizedAdminNumbers('   ')).toEqual([]);
  });

  it('skips invalid entries', () => {
    expect(parseAuthorizedAdminNumbers('+91:9530654704,invalid,+1:12')).toEqual(
      [{ countryCode: '+91', mobile: '9530654704' }]
    );
  });
});

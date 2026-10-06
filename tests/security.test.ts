import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, stripHtml, verifyTurnstileToken } from '@/lib/security';

describe('checkRateLimit', () => {
  afterEach(() => {
    // Clear the rate limit store by using a unique key
    vi.clearAllTimers();
  });

  it('allows first request', () => {
    const result = checkRateLimit('test-key', 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('allows requests within limit', () => {
    checkRateLimit('test-key-2', 3, 60000);
    const result2 = checkRateLimit('test-key-2', 3, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('blocks requests exceeding limit', () => {
    checkRateLimit('test-key-3', 2, 60000);
    checkRateLimit('test-key-3', 2, 60000);
    const result3 = checkRateLimit('test-key-3', 2, 60000);
    expect(result3.allowed).toBe(false);
    expect(result3.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const result1 = checkRateLimit('test-key-4', 1, 100);
    expect(result1.allowed).toBe(true);

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 150));

    const result2 = checkRateLimit('test-key-4', 1, 100);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
  });

  it('removes script tags and content', () => {
    expect(stripHtml('<script>alert("xss")</script><p>Safe</p>')).toBe('Safe');
  });

  it('removes style tags and content', () => {
    expect(stripHtml('<style>.bad { color: red; }</style><div>Content</div>')).toBe('Content');
  });

  it('handles null and undefined', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml('')).toBe('');
  });

  it('removes HTML entities', () => {
    expect(stripHtml('<p>Hello&nbsp;World</p>')).toBe('Hello World');
  });

  it('trims whitespace', () => {
    expect(stripHtml('  <p>  Text  </p>  ')).toBe('Text');
  });
});

describe('verifyTurnstileToken', () => {
  it('returns true when TURNSTILE_SECRET_KEY is not set', async () => {
    const originalKey = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyTurnstileToken('any-token');
    expect(result.success).toBe(true);

    if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
  });

  it('skips verification when secret key is missing', async () => {
    const originalKey = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const result = await verifyTurnstileToken('any-token');
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      'TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification'
    );
    consoleSpy.mockRestore();

    if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
  });
});

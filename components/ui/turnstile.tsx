'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Loads the official Turnstile script dynamically and renders the widget
 * in a container ref. Falls back gracefully if the site key is missing.
 *
 * Requires NEXT_PUBLIC_TURNSTILE_SITE_KEY in environment variables.
 */
export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const key = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  // Load Turnstile script
  useEffect(() => {
    if (!key) {
      console.warn('Turnstile site key not configured — CAPTCHA disabled');
      return;
    }

    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    if (document.getElementById('turnstile-script')) {
      // Script tag exists but may not be loaded yet
      const checkReady = () => {
        if (window.turnstile) {
          setScriptLoaded(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }

    const script = document.createElement('script');
    script.id = 'turnstile-script';
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError(true);
    document.body.appendChild(script);
  }, [key]);

  // Render once per mount / theme / sitekey — not when parent passes new callback refs
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile || !key) {
      return;
    }

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore removal errors
      }
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: key,
      theme,
      callback: (token: string) => onVerifyRef.current(token),
      'error-callback': () => onErrorRef.current?.(),
      'expired-callback': () => onExpireRef.current?.(),
    });
  }, [scriptLoaded, key, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  if (!key) {
    return null;
  }

  if (scriptError) {
    return (
      <div className={`text-xs text-destructive ${className ?? ''}`}>
        CAPTCHA failed to load. Please refresh the page.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-[65px] ${className ?? ''}`}
      aria-label="Security verification"
      role="region"
    />
  );
}

// Global type augmentation for Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

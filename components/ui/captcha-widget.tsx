'use client';

import { Turnstile } from '@/components/ui/turnstile';
import { ReCaptcha } from '@/components/ui/recaptcha';

type CaptchaWidgetProps = {
  provider: 'turnstile' | 'recaptcha';
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
};

export function CaptchaWidget({
  provider,
  siteKey,
  onVerify,
  onError,
  onExpire,
  className,
}: CaptchaWidgetProps) {
  if (provider === 'recaptcha') {
    return (
      <ReCaptcha
        siteKey={siteKey}
        onVerify={onVerify}
        onError={onError}
        onExpire={onExpire}
        className={className}
      />
    );
  }

  return (
    <Turnstile
      siteKey={siteKey}
      onVerify={onVerify}
      onError={onError}
      onExpire={onExpire}
      className={className}
    />
  );
}

import type { Metadata } from 'next';
import { VerificationClient } from '@/components/verification/verification-client';

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://register.ondemandid.com';

export const metadata: Metadata = {
  title: 'Verify identity with iVALT',
  description:
    "Trigger biometric identity verification via the iVALT mobile app. Enter your IDCONNECTION code and the user's mobile number to send a secure push notification.",
  openGraph: {
    title: 'OnDemand ID — Verify identity with iVALT',
    description:
      "Trigger biometric identity verification via the iVALT mobile app. Enter your IDCONNECTION code and the user's mobile number.",
    url: `${baseUrl}/ondemand-id`,
  },
  alternates: {
    canonical: `${baseUrl}/ondemand-id`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function OnDemandIdPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          OnDemand ID
        </p>
        <h1 className="mt-3 text-balance font-serif text-3xl font-semibold tracking-tight md:text-5xl">
          Verify a user&apos;s identity in seconds
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Enter your IDCONNECTION code and the user&apos;s mobile number. We
          dispatch a push notification to the iVALT mobile app. The user
          approves with face or fingerprint biometrics.
        </p>
      </header>

      <div className="mt-12">
        <VerificationClient demoMode={process.env.DEMO_MODE === 'true'} />
      </div>
    </div>
  );
}

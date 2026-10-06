import type { Metadata } from 'next';
import { Hero } from '@/components/landing/hero';
import { TrustMetrics } from '@/components/landing/trust-metrics';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Security } from '@/components/landing/security';
import { CTA } from '@/components/landing/cta';

export const metadata: Metadata = {
  title: 'Password-free Identity Verification',
  description:
    'Verify user identities on demand through biometric authentication. Eliminate passwords with face and fingerprint recognition delivered through secure push notifications.',
  openGraph: {
    title: 'iVALT OnDemand ID — Password-free Identity Verification',
    description:
      'Verify user identities on demand through biometric authentication. Eliminate passwords with face and fingerprint recognition.',
  },
};

export default function HomePage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://register.ondemandid.com';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'iVALT OnDemand ID',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial for up to 100 users',
    },
    description:
      'Password-free identity verification via biometric authentication. Face and fingerprint recognition delivered through secure push notifications.',
    url: baseUrl,
    provider: {
      '@type': 'Organization',
      name: 'iVALT',
      url: 'https://ivalt.com',
    },
    featureList: [
      'Biometric security with face and fingerprint recognition',
      'Instant push notification verification',
      'Zero-password authentication',
      'Enterprise REST API',
      'Complete audit trail',
      'iOS and Android native support',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <TrustMetrics />
      <Features />
      <HowItWorks />
      <Security />
      <CTA />
    </>
  );
}

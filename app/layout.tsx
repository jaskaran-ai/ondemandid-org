import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { CustomThemeProvider } from '@/components/theme-provider-custom';
import { QueryProvider } from '@/components/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://register.ondemandid.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'iVALT OnDemand ID — Password-free Identity Verification',
    template: '%s — iVALT OnDemand ID',
  },
  description:
    'Verify user identities on demand through biometric authentication. Eliminate passwords with face and fingerprint recognition delivered through secure push notifications.',
  keywords: [
    'biometric authentication',
    'passwordless login',
    'identity verification',
    'push notification auth',
    'enterprise security',
    'face recognition',
    'fingerprint authentication',
    'zero trust',
  ],
  authors: [{ name: 'iVALT' }],
  creator: 'iVALT',
  publisher: 'iVALT',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'iVALT OnDemand ID',
    title: 'iVALT OnDemand ID — Password-free Identity Verification',
    description:
      'Verify user identities on demand through biometric authentication. Eliminate passwords with face and fingerprint recognition delivered through secure push notifications.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'iVALT OnDemand ID — Password-free biometric identity verification',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iVALT OnDemand ID — Password-free Identity Verification',
    description:
      'Verify user identities on demand through biometric authentication. Eliminate passwords with face and fingerprint recognition.',
    images: ['/og-image.png'],
    creator: '@ivalt',
  },
  verification: {
    google: undefined,
  },
  alternates: {
    canonical: baseUrl,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} bg-background`}
    >
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <QueryProvider>
          <CustomThemeProvider defaultTheme="system" storageKey="ivalt-theme">
            {children}
            <Toaster richColors position="top-center" />
          </CustomThemeProvider>
        </QueryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}

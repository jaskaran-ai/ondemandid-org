'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, Smartphone, Fingerprint, Lock } from 'lucide-react';
import { toast } from 'sonner';

type LoginPhase = 'idle' | 'sending' | 'polling' | 'success' | 'failed';

const STATUS_CONTENT_CLASS =
  'flex min-h-[300px] flex-col items-center justify-center gap-4 py-10';

export function AdminLoginForm() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [phase, setPhase] = useState<LoginPhase>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initiateLogin = async () => {
    setPhase('sending');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, mobile }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhase('idle');
        setErrorMessage(data.error || 'Login failed');
        toast.error(data.error || 'Login failed');
        return;
      }

      setRequestId(data.requestId);
      setPhase('polling');
    } catch {
      setPhase('idle');
      setErrorMessage('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    }
  };

  const pollStatus = useCallback(async () => {
    if (!requestId) return;

    try {
      const res = await fetch(`/api/admin/login-status?requestId=${requestId}`);
      const data = await res.json();

      if (data.status === 'authenticated') {
        setPhase('success');
        toast.success('Authentication successful! Redirecting...');
        setTimeout(() => router.push('/admin'), 1000);
      } else if (data.status === 'failed' || data.status === 'not_found') {
        setPhase('failed');
        setErrorMessage(
          'Authentication failed or was denied. Please try again.'
        );
        toast.error('Authentication failed. Please try again.');
      }
      // pending: continue polling
    } catch {
      // Network error during polling, keep trying
    }
  }, [requestId, router]);

  useEffect(() => {
    if (phase !== 'polling' || !requestId) return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [phase, requestId, pollStatus]);

  const resetLogin = () => {
    setPhase('idle');
    setRequestId(null);
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 sm:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">iVALT OnDemand ID</p>
          </div>
        </div>

        <Card className="w-full py-6 shadow-lg">
          {phase === 'idle' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Secure Admin Login
                </CardTitle>
                <CardDescription>
                  Enter your registered mobile number to receive a biometric
                  authentication request on your iVALT app.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mobile" className="text-sm font-medium">
                    Mobile number
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="countryCode"
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      containerClassName="w-20 shrink-0"
                      className="text-center"
                      placeholder="+91"
                      disabled
                    />
                    <Input
                      id="mobile"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      containerClassName="min-w-0 flex-1"
                      placeholder="Enter your mobile number"
                      inputMode="numeric"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                  >
                    {errorMessage}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-1">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={initiateLogin}
                  disabled={!countryCode || !mobile}
                >
                  <Fingerprint className="size-4" />
                  Send Biometric Auth Request
                </Button>
              </CardFooter>
            </>
          )}

          {phase === 'sending' && (
            <CardContent className={STATUS_CONTENT_CLASS}>
              <Spinner className="size-8" />
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">
                  Sending authentication request...
                </p>
                <p className="text-sm text-muted-foreground">
                  Contacting iVALT servers
                </p>
              </div>
            </CardContent>
          )}

          {phase === 'polling' && (
            <CardContent className={STATUS_CONTENT_CLASS}>
              <div className="relative flex size-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="size-9 text-primary" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">Check your iVALT app</p>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                  A biometric authentication request has been sent to your
                  phone. Approve it with your fingerprint or face scan.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                Waiting for approval...
              </div>
            </CardContent>
          )}

          {phase === 'success' && (
            <CardContent className={STATUS_CONTENT_CLASS}>
              <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="size-10 text-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-medium text-lg">Authentication Successful</p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard...
                </p>
              </div>
            </CardContent>
          )}

          {phase === 'failed' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldCheck className="size-5" />
                  Authentication Failed
                </CardTitle>
                <CardDescription>
                  {errorMessage ||
                    'The biometric authentication was denied or timed out.'}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={resetLogin}
                >
                  Try Again
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        <p className="mt-8 px-2 text-center text-xs leading-relaxed text-muted-foreground">
          Authorized admin access only. All login attempts are logged.
        </p>
      </div>
    </div>
  );
}
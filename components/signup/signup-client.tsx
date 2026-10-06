'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupForm } from '@/components/signup/signup-form';
import { useSignup } from '@/hooks/use-api';
import type { SignupValues } from '@/lib/validation';
import type { SignupCaptchaConfig } from '@/lib/captcha';

type SuccessState = {
  id: string;
  companyName: string;
  email: string;
};

export function SignupClient({ captcha }: { captcha: SignupCaptchaConfig }) {
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const signupMutation = useSignup();

  async function handleSubmit(values: SignupValues) {
    try {
      const result = await signupMutation.mutateAsync(values);
      if (result.ok) {
        setSuccess({
          id: crypto.randomUUID(),
          companyName: values.companyName,
          email: values.email,
        });
      }
    } catch {
      // Error handling is done in the mutation
    }
  }

  if (success) {
    return <SuccessScreen state={success} />;
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <SignupForm
          captcha={captcha}
          onSubmit={handleSubmit}
          submitting={signupMutation.isPending}
        />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-secondary/40 p-6">
          <h2 className="font-serif text-lg font-semibold tracking-tight">
            What happens next
          </h2>
          <ol className="mt-4 flex flex-col gap-4 text-sm">
            <Step n={1} title="We review your registration">
              Our team validates your organization and provisions an
              IDCONNECTION code unique to your company.
            </Step>
            <Step n={2} title="You receive trial credentials">
              We email your admin contact with API keys and the iVALT mobile app
              onboarding link, typically within one business day.
            </Step>
            <Step n={3} title="Onboard your users">
              Invite up to 100 users. They install the iVALT app and enroll
              biometrics directly — no enterprise PKI required.
            </Step>
            <Step n={4} title="Start verifying">
              Trigger verifications via API or the OnDemand ID web tool. Audit
              every attempt from day one.
            </Step>
          </ol>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Need to verify a user now?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If your company already has an IDCONNECTION code, you can verify a
            user directly.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/ondemand-id">
              Go to OnDemand ID
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function SuccessScreen({ state }: { state: SuccessState }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-7 text-primary" aria-hidden />
      </div>
      <h2 className="mt-6 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
        Registration received
      </h2>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
        Thank you for registering <strong>{state.companyName}</strong>. We sent
        a confirmation to <strong>{state.email}</strong>. An iVALT
        representative will provision your IDCONNECTION code within one business
        day.
      </p>

      <div className="mt-8 w-full max-w-md rounded-xl border border-border bg-card p-5 text-left">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Reference ID
        </p>
        <p className="mt-1 font-mono text-sm font-semibold">{state.id}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          <span>
            Status: <span className="text-foreground">pending provision</span>
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ondemand-id">Try OnDemand ID demo</Link>
        </Button>
      </div>
    </div>
  );
}

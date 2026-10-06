'use client';

import Link from 'next/link';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { cn } from '@/lib/utils';
import {
  Users,
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            accent || 'bg-primary/10'
          )}
        >
          <Icon className="size-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'authenticated':
      return 'default' as const;
    case 'failed':
      return 'destructive' as const;
    case 'pending':
    case 'initiated':
      return 'secondary' as const;
    case 'not_found':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
};

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function RequestStatusIcon({ status }: { status: string }) {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
    authenticated: { icon: CheckCircle2, cls: 'bg-green-500/10 text-green-500' },
    failed: { icon: XCircle, cls: 'bg-red-500/10 text-red-500' },
    pending: { icon: Clock, cls: 'bg-yellow-500/10 text-yellow-500' },
    initiated: { icon: Clock, cls: 'bg-yellow-500/10 text-yellow-500' },
    not_found: { icon: FileText, cls: 'bg-muted text-muted-foreground' },
  };
  const entry = map[status] ?? map.not_found;
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg',
        entry.cls
      )}
    >
      <entry.icon className="size-4" />
    </div>
  );
}

export function AdminDashboard() {
  const { data, isPending, isFetching, error } = useAdminStats();

  if (isPending || isFetching) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor customers and verification activity at a glance.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="size-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Failed to load dashboard data.
      </div>
    );
  }

  const successRate =
    data.totalRequests > 0
      ? Math.round((data.authenticatedRequests / data.totalRequests) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor customers and verification activity at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={data.totalCustomers}
          icon={Users}
          description={`${data.activeCustomers} active`}
          accent="bg-primary/10"
        />
        <StatCard
          title="Active Customers"
          value={data.activeCustomers}
          icon={UserCheck}
          description={`${data.pendingCustomers} pending provisioning`}
          accent="bg-green-500/10"
        />
        <StatCard
          title="Total Requests"
          value={data.totalRequests}
          icon={FileText}
          description="All verification requests"
          accent="bg-primary/10"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={TrendingUp}
          description={`${data.authenticatedRequests} authenticated`}
          accent="bg-green-500/10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Authenticated"
          value={data.authenticatedRequests}
          icon={CheckCircle2}
          description="Successful verifications"
          accent="bg-green-500/10"
        />
        <StatCard
          title="Failed"
          value={data.failedRequests}
          icon={XCircle}
          description="Failed verifications"
          accent="bg-red-500/10"
        />
        <StatCard
          title="Pending"
          value={data.pendingRequests}
          icon={Clock}
          description="Waiting for response"
          accent="bg-yellow-500/10"
        />
      </div>

      <Card className="overflow-hidden pt-4">
        <CardHeader>
          <CardTitle>Recent Verification Requests</CardTitle>
          <CardDescription>
            Latest activity across all customer connections
          </CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/requests">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No verification requests yet.
            </p>
          ) : (
            <div className="divide-y">
              {data.recentRequests.map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                >
                  <RequestStatusIcon status={req.status} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono normal-case">
                        {req.idConnection}
                      </code>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {req.mobile} · {formatTime(req.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(req.status)}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
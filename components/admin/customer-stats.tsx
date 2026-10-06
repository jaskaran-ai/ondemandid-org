'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminCustomerStats } from '@/hooks/use-admin-customer-stats';
import {
  Users,
  UserCheck,
  Clock,
  XCircle,
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
          className={`flex size-10 items-center justify-center rounded-lg ${accent || 'bg-primary/10'}`}
        >
          <Icon className="size-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerStats() {
  const { data, isLoading, error } = useAdminCustomerStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="size-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Customers"
        value={data.totalCustomers}
        icon={Users}
        description="All registered customers"
        accent="bg-primary/10"
      />
      <StatCard
        title="Active"
        value={data.activeCustomers}
        icon={UserCheck}
        description="Provisioned and active"
        accent="bg-green-500/10"
      />
      <StatCard
        title="Pending"
        value={data.pendingCustomers}
        icon={Clock}
        description="Awaiting IDCONNECTION"
        accent="bg-yellow-500/10"
      />
      <StatCard
        title="Inactive"
        value={data.inactiveCustomers || 0}
        icon={XCircle}
        description="Deactivated accounts"
        accent="bg-red-500/10"
      />
    </div>
  );
}

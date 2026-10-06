import { db, schema } from '@/lib/db';
import { isNull, sql, desc } from 'drizzle-orm';

export interface CustomerStatsSummary {
  totalCustomers: number;
  activeCustomers: number;
  pendingCustomers: number;
  inactiveCustomers: number;
}

export interface DashboardStats extends CustomerStatsSummary {
  totalRequests: number;
  authenticatedRequests: number;
  failedRequests: number;
  pendingRequests: number;
  recentRequests: Array<{
    id: string | number;
    idConnection: string;
    mobile: string;
    status: string;
    createdAt: number;
  }>;
}

function toTimestamp(value: string | Date | number | null | undefined): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value * 1000;
  if (value instanceof Date) return value.getTime();
  return parseInt(value, 10) * 1000;
}

function toCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

export async function getCustomerStats(): Promise<CustomerStatsSummary> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) {
    return {
      totalCustomers: 5,
      activeCustomers: 3,
      pendingCustomers: 1,
      inactiveCustomers: 1,
    };
  }

  const c = schema.customers;
  const [row] = await db
    .select({
      total: sql<number>`count(case when ${c.deletedAt} is null then 1 end)`,
      active: sql<number>`count(case when ${c.status} = 'active' and ${c.deletedAt} is null then 1 end)`,
      pending: sql<number>`count(case when ${c.status} = 'pending' and ${c.deletedAt} is null then 1 end)`,
      inactive: sql<number>`count(case when ${c.status} = 'inactive' and ${c.deletedAt} is null then 1 end)`,
    })
    .from(c);

  return {
    totalCustomers: toCount(row?.total),
    activeCustomers: toCount(row?.active),
    pendingCustomers: toCount(row?.pending),
    inactiveCustomers: toCount(row?.inactive),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) {
    return {
      totalCustomers: 5,
      activeCustomers: 3,
      pendingCustomers: 1,
      inactiveCustomers: 1,
      totalRequests: 15,
      authenticatedRequests: 5,
      failedRequests: 5,
      pendingRequests: 5,
      recentRequests: [
        {
          id: 'req_demo_1',
          idConnection: 'ACME01',
          mobile: '5550100123',
          status: 'authenticated',
          createdAt: Date.now() - 3600000,
        },
        {
          id: 'req_demo_2',
          idConnection: 'GLBX01',
          mobile: '7700900123',
          status: 'failed',
          createdAt: Date.now() - 7200000,
        },
        {
          id: 'req_demo_3',
          idConnection: 'STARK01',
          mobile: '5550400111',
          status: 'pending',
          createdAt: Date.now() - 1800000,
        },
        {
          id: 'req_demo_4',
          idConnection: 'ACME01',
          mobile: '5550100123',
          status: 'authenticated',
          createdAt: Date.now() - 10800000,
        },
        {
          id: 'req_demo_5',
          idConnection: 'GLBX01',
          mobile: '7700900123',
          status: 'authenticated',
          createdAt: Date.now() - 14400000,
        },
      ],
    };
  }

  const r = schema.ondemandRequests;

  const [customerStats, requestStats, recentRequests] = await Promise.all([
    getCustomerStats(),
    db
      .select({
        total: sql<number>`count(case when ${r.deletedAt} is null then 1 end)`,
        authenticated: sql<number>`count(case when ${r.status} = 'authenticated' and ${r.deletedAt} is null then 1 end)`,
        failed: sql<number>`count(case when ${r.status} = 'failed' and ${r.deletedAt} is null then 1 end)`,
        pending: sql<number>`count(case when ${r.status} in ('pending', 'initiated') and ${r.deletedAt} is null then 1 end)`,
      })
      .from(r),
    db
      .select({
        id: r.id,
        idConnection: r.idConnection,
        mobile: r.mobile,
        status: r.status,
        createdAt: r.createdAt,
      })
      .from(r)
      .where(isNull(r.deletedAt))
      .orderBy(desc(r.createdAt))
      .limit(5),
  ]);

  const rs = requestStats[0];

  return {
    ...customerStats,
    totalRequests: toCount(rs?.total),
    authenticatedRequests: toCount(rs?.authenticated),
    failedRequests: toCount(rs?.failed),
    pendingRequests: toCount(rs?.pending),
    recentRequests: recentRequests.map(row => ({
      ...row,
      createdAt: toTimestamp(row.createdAt),
    })),
  };
}

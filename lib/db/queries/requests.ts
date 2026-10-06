import { db, schema, isUsingPostgres } from '@/lib/db';
import {
  and,
  count,
  desc,
  eq,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

export interface VerificationRequest {
  id: string | number;
  idConnection: string;
  countryCode: string;
  mobile: string;
  status: string;
  ivaltStatusCode: number | null;
  requestFrom: string | null;
  createdAt: number;
  completedAt: number | null;
}

function toTimestamp(
  value: string | Date | number | null | undefined
): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value * 1000;
  if (value instanceof Date) return value.getTime();
  return parseInt(value) * 1000;
}

interface DemoRequest {
  id: string;
  idConnection: string;
  countryCode: string;
  mobile: string;
  status: string;
  ivaltStatusCode: number | null;
  requestFrom: string | null;
  createdAt: number;
  completedAt: number | null;
}

const deletedDemoRequestIds = new Set<string>();

const demoRequests: DemoRequest[] = [
  {
    id: 'req_demo_1',
    idConnection: 'ACME01',
    countryCode: '+1',
    mobile: '5550100123',
    status: 'authenticated',
    ivaltStatusCode: 200,
    requestFrom: 'Web portal',
    createdAt: Date.now() - 3600000,
    completedAt: Date.now() - 3500000,
  },
  {
    id: 'req_demo_2',
    idConnection: 'GLBX01',
    countryCode: '+44',
    mobile: '7700900123',
    status: 'failed',
    ivaltStatusCode: 403,
    requestFrom: 'Mobile app',
    createdAt: Date.now() - 7200000,
    completedAt: Date.now() - 7100000,
  },
  {
    id: 'req_demo_3',
    idConnection: 'STARK01',
    countryCode: '+1',
    mobile: '5550400111',
    status: 'pending',
    ivaltStatusCode: 422,
    requestFrom: 'Admin panel',
    createdAt: Date.now() - 1800000,
    completedAt: null,
  },
  {
    id: 'req_demo_4',
    idConnection: 'ACME01',
    countryCode: '+1',
    mobile: '5550100123',
    status: 'authenticated',
    ivaltStatusCode: 200,
    requestFrom: 'Web portal',
    createdAt: Date.now() - 10800000,
    completedAt: Date.now() - 10700000,
  },
  {
    id: 'req_demo_5',
    idConnection: 'GLBX01',
    countryCode: '+44',
    mobile: '7700900123',
    status: 'not_found',
    ivaltStatusCode: 404,
    requestFrom: 'API',
    createdAt: Date.now() - 14400000,
    completedAt: Date.now() - 14300000,
  },
  {
    id: 'req_demo_6',
    idConnection: 'STARK01',
    countryCode: '+1',
    mobile: '5550400111',
    status: 'authenticated',
    ivaltStatusCode: 200,
    requestFrom: 'Web portal',
    createdAt: Date.now() - 18000000,
    completedAt: Date.now() - 17900000,
  },
  {
    id: 'req_demo_7',
    idConnection: 'ACME01',
    countryCode: '+1',
    mobile: '5550100123',
    status: 'failed',
    ivaltStatusCode: 403,
    requestFrom: 'Mobile app',
    createdAt: Date.now() - 21600000,
    completedAt: Date.now() - 21500000,
  },
];

function buildRequestWhere(status?: string | null): SQL | undefined {
  const conditions: SQL[] = [isNull(schema.ondemandRequests.deletedAt)];

  if (status && status !== 'all') {
    if (status === 'pending') {
      conditions.push(
        or(
          eq(schema.ondemandRequests.status, 'pending'),
          eq(schema.ondemandRequests.status, 'initiated')
        )!
      );
    } else {
      conditions.push(eq(schema.ondemandRequests.status, status));
    }
  }

  return and(...conditions);
}

export async function getRequests(
  status?: string | null,
  page: number = 1,
  pageSize: number = 10
): Promise<{ requests: VerificationRequest[]; total: number }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  let filtered: VerificationRequest[];

  if (isDemo) {
    let list = [...demoRequests] as VerificationRequest[];
    list = list.filter(r => !deletedDemoRequestIds.has(String(r.id)));
    if (status && status !== 'all') {
      if (status === 'pending') {
        list = list.filter(
          r => r.status === 'pending' || r.status === 'initiated'
        );
      } else {
        list = list.filter(r => r.status === status);
      }
    }
    filtered = list;
  } else {
    const where = buildRequestWhere(status);
    const offset = (page - 1) * pageSize;

    const [countRow, rows] = await Promise.all([
      db
        .select({ total: count() })
        .from(schema.ondemandRequests)
        .where(where),
      db
        .select()
        .from(schema.ondemandRequests)
        .where(where)
        .orderBy(desc(schema.ondemandRequests.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return {
      requests: rows.map(r => ({
        ...r,
        createdAt: toTimestamp((r as { createdAt: unknown }).createdAt) ?? 0,
        completedAt: toTimestamp(
          (r as { completedAt: unknown }).completedAt
        ),
      })) as VerificationRequest[],
      total: countRow[0]?.total ?? 0,
    };
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const requests = filtered.slice(offset, offset + pageSize);

  return { requests, total };
}

export async function deleteRequest(
  id: string | number
): Promise<{ ok: boolean }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) {
    deletedDemoRequestIds.add(String(id));
    return { ok: true };
  }

  const deleteData: Record<string, unknown> = {};

  if (isUsingPostgres) {
    deleteData.deletedAt = new Date();
  } else {
    deleteData.deletedAt = sql`${Math.floor(Date.now() / 1000)}`;
  }

  const deleted = await db
    .update(schema.ondemandRequests)
    .set(deleteData)
    .where(eq(schema.ondemandRequests.id, id))
    .returning();
  if (deleted.length === 0) throw new Error('Request not found');
  return { ok: true };
}

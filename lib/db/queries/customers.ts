import { db, schema } from '@/lib/db';
import {
  and,
  count,
  desc,
  eq,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

export interface Customer {
  id: string | number;
  companyName: string;
  contactName: string;
  email: string;
  countryCode: string;
  mobile: string;
  initialUsers: number;
  idConnection: string | null;
  status: string;
  notes: string | null;
  createdAt: number;
}

function toTimestamp(value: string | Date | number | null | undefined): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value * 1000;
  if (value instanceof Date) return value.getTime();
  return parseInt(value) * 1000;
}

interface DemoCustomer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  countryCode: string;
  mobile: string;
  initialUsers: number;
  idConnection: string | null;
  status: string;
  notes: string | null;
  createdAt: number;
}

const deletedDemoCustomerIds = new Set<string>();

const demoCustomers: DemoCustomer[] = [
  {
    id: 'cust_demo_1',
    companyName: 'Acme Corporation',
    contactName: 'John Smith',
    email: 'john@acme.com',
    countryCode: '+1',
    mobile: '5550100123',
    initialUsers: 25,
    idConnection: 'ACME01',
    status: 'active',
    notes: 'Enterprise customer - priority support',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'cust_demo_2',
    companyName: 'Globex Inc',
    contactName: 'Jane Doe',
    email: 'jane@globex.io',
    countryCode: '+44',
    mobile: '7700900123',
    initialUsers: 50,
    idConnection: 'GLBX01',
    status: 'active',
    notes: 'Signed up via partner referral',
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'cust_demo_3',
    companyName: 'Initech Solutions',
    contactName: 'Bob Johnson',
    email: 'bob@initech.com',
    countryCode: '+1',
    mobile: '5550200456',
    initialUsers: 10,
    idConnection: null,
    status: 'pending',
    notes: 'Awaiting IDCONNECTION provisioning',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'cust_demo_4',
    companyName: 'Umbrella Corp',
    contactName: 'Alice Williams',
    email: 'alice@umbrella.co',
    countryCode: '+1',
    mobile: '5550300789',
    initialUsers: 100,
    idConnection: null,
    status: 'inactive',
    notes: 'Trial ended - requested extension',
    createdAt: Date.now() - 86400000 * 60,
  },
  {
    id: 'cust_demo_5',
    companyName: 'Stark Industries',
    contactName: 'Tony Stark',
    email: 'tony@stark.com',
    countryCode: '+1',
    mobile: '5550400111',
    initialUsers: 5,
    idConnection: 'STARK01',
    status: 'active',
    notes: 'Executive team only',
    createdAt: Date.now() - 86400000 * 10,
  },
];

function buildCustomerWhere(
  status?: string | null,
  search?: string | null
): SQL | undefined {
  const conditions: SQL[] = [isNull(schema.customers.deletedAt)];

  if (status && status !== 'all') {
    conditions.push(eq(schema.customers.status, status));
  }

  const q = search?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(schema.customers.companyName, pattern),
        like(schema.customers.contactName, pattern),
        like(schema.customers.email, pattern),
        like(schema.customers.idConnection, pattern)
      )!
    );
  }

  return and(...conditions);
}

export async function getCustomers(
  status?: string | null,
  search?: string | null,
  page: number = 1,
  pageSize: number = 10
): Promise<{ customers: Customer[]; total: number }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  let filtered: Customer[];

  if (isDemo) {
    let list = [...demoCustomers] as Customer[];
    list = list.filter(c => !deletedDemoCustomerIds.has(String(c.id)));
    if (status && status !== 'all')
      list = list.filter(c => c.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        c =>
          c.companyName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.idConnection || '').toLowerCase().includes(q)
      );
    }
    filtered = list;
  } else {
    const where = buildCustomerWhere(status, search);
    const offset = (page - 1) * pageSize;

    const [countRow, rows] = await Promise.all([
      db.select({ total: count() }).from(schema.customers).where(where),
      db
        .select()
        .from(schema.customers)
        .where(where)
        .orderBy(desc(schema.customers.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return {
      customers: rows.map(c => ({
        ...c,
        createdAt: toTimestamp((c as { createdAt: unknown }).createdAt),
      })) as Customer[],
      total: countRow[0]?.total ?? 0,
    };
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const customers = filtered.slice(offset, offset + pageSize);

  return { customers, total };
}

export async function updateCustomer(
  id: string | number,
  data: { status?: string; idConnection?: string; notes?: string }
): Promise<{ ok: boolean }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) return { ok: true };

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.idConnection !== undefined)
    updateData.idConnection = data.idConnection;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (process.env.DB_TYPE === 'neon') {
    updateData.updatedAt = new Date();
  } else {
    updateData.updatedAt = sql`${Math.floor(Date.now() / 1000)}`;
  }

  const updated = await db
    .update(schema.customers)
    .set(updateData)
    .where(eq(schema.customers.id, id))
    .returning();
  if (updated.length === 0) throw new Error('Customer not found');
  return { ok: true };
}

export async function createCustomer(
  data: {
    companyName: string;
    contactName: string;
    email: string;
    countryCode: string;
    mobile: string;
    initialUsers: number;
    notes: string | null;
  }
): Promise<{ id: string | number; ok: boolean }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) {
    const id = `cust_${Math.random().toString(36).slice(2, 10)}`;
    return { id, ok: true };
  }

  const insertData: Record<string, unknown> = {
    companyName: data.companyName,
    contactName: data.contactName,
    email: data.email,
    countryCode: data.countryCode,
    mobile: data.mobile,
    initialUsers: data.initialUsers,
    notes: data.notes,
    status: 'pending',
  };

  if (process.env.DB_TYPE === 'neon') {
    insertData.createdAt = new Date();
  } else {
    insertData.createdAt = sql`${Math.floor(Date.now() / 1000)}`;
  }

  const customer = await db
    .insert(schema.customers)
    .values(insertData)
    .returning();

  return { id: customer[0].id, ok: true };
}

export async function deleteCustomer(
  id: string | number
): Promise<{ ok: boolean }> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo) {
    deletedDemoCustomerIds.add(String(id));
    return { ok: true };
  }

  const deleteData: Record<string, unknown> = {};

  if (process.env.DB_TYPE === 'neon') {
    deleteData.deletedAt = new Date();
  } else {
    deleteData.deletedAt = sql`${Math.floor(Date.now() / 1000)}`;
  }

  const deleted = await db
    .update(schema.customers)
    .set(deleteData)
    .where(eq(schema.customers.id, id))
    .returning();
  if (deleted.length === 0) throw new Error('Customer not found');
  return { ok: true };
}

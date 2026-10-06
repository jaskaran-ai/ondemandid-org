import { drizzle } from 'drizzle-orm/postgres-js';
import { customers } from '@/lib/db/schema.pg';
import { getPostgresClient } from '@/lib/db/postgres-client';
import { sql } from 'drizzle-orm';

const client = getPostgresClient(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { customers } });

async function main() {
  console.log('Seeding database...');

  // Update existing customer or create new one
  const existing = await db
    .select()
    .from(customers)
    .where(sql`country_code = '+91' AND mobile = '9530654704'`)
    .limit(1);

  let result;
  if (existing.length > 0) {
    console.log('Customer exists, updating...');
    result = await db
      .update(customers)
      .set({ idConnection: 'IVALT' })
      .where(sql`mobile = '9530654704'`)
      .returning();
  } else {
    result = await db
      .insert(customers)
      .values({
        companyName: 'iVALT Test Org',
        contactName: 'Test User',
        email: 'test@ivalt.com',
        countryCode: '+91',
        mobile: '9530654704',
        initialUsers: 10,
        idConnection: 'IVALT',
        status: 'active',
        notes: 'Dummy test data',
      })
      .returning();
  }

  console.log('Customer:', result[0]);
  await client.end();
}

main().catch(console.error);

import type { Config } from 'drizzle-kit';
import { getDatabaseKind } from './lib/db/config';

const dbKind = getDatabaseKind();

export default {
  schema:
    dbKind === 'postgres'
      ? './lib/db/schema.pg.ts'
      : './lib/db/schema.sqlite.ts',
  out: './drizzle',
  dialect: dbKind === 'postgres' ? 'postgresql' : 'sqlite',
  dbCredentials:
    dbKind === 'postgres'
      ? { url: process.env.DATABASE_URL! }
      : { url: process.env.SQLITE_DB_PATH || './local.db' },
} satisfies Config;

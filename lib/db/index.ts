import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as pgSchema from './schema.pg';
import * as sqliteSchema from './schema.sqlite';
import { getDatabaseKind } from './config';
import { getPostgresClient } from './postgres-client';

const dbKind = getDatabaseKind();
const postgresUrl = process.env.DATABASE_URL;

export const isUsingPostgres = dbKind === 'postgres' && !!postgresUrl;

let db: any;
let schema: any;

if (isUsingPostgres) {
  const client = getPostgresClient(postgresUrl!);
  db = drizzle(client, { schema: pgSchema });
  schema = pgSchema;
} else {
  if (dbKind === 'postgres' && !postgresUrl) {
    console.warn(
      '[db] DB_TYPE is postgres (Supabase) but DATABASE_URL is unset — using SQLite.'
    );
  }
  const dbPath = process.env.SQLITE_DB_PATH || './local.db';
  const sqlite = new Database(dbPath);
  db = drizzleSqlite(sqlite, { schema: sqliteSchema });
  schema = sqliteSchema;
}

export { db, schema };
export type DbType = typeof db;

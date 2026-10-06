import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | undefined;

/**
 * Shared Postgres client for Supabase (transaction pooler) and other PG hosts.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres
 */
export function getPostgresClient(connectionString: string) {
  if (!sql) {
    sql = postgres(connectionString, {
      max: 1,
      prepare: false,
      ssl: 'require',
    });
  }
  return sql;
}

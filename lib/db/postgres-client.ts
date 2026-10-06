import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | undefined;

/**
 * Shared Postgres client for Supabase (transaction pooler) and other PG hosts.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres
 */
export function getPostgresClient(connectionString: string) {
  if (!sql) {
    sql = postgres(connectionString, {
      // Allow a few concurrent queries (dashboard stats runs multiple reads).
      max: 5,
      prepare: false,
      ssl: 'require',
      connect_timeout: 15,
      idle_timeout: 20,
    });
  }
  return sql;
}

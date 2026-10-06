/** @returns `'postgres'` for Supabase/Neon/generic PG, otherwise `'sqlite'`. */
export function getDatabaseKind(): 'postgres' | 'sqlite' {
  const raw = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  if (raw === 'sqlite') return 'sqlite';
  if (
    raw === 'postgres' ||
    raw === 'postgresql' ||
    raw === 'neon' ||
    raw === 'supabase'
  ) {
    return 'postgres';
  }
  return 'sqlite';
}

export function isPostgresDatabase(): boolean {
  return getDatabaseKind() === 'postgres';
}

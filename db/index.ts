import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PgClient = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __herdPgClient: PgClient | undefined;
}

function createClient(): PgClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a connection string do Supabase (Settings → Database → Connection string) em .env.local, veja .env.example."
    );
  }
  // prepare:false is required against Supabase's pooled connection (pgbouncer transaction mode).
  return postgres(url, { prepare: false });
}

export function getDb() {
  const client = globalThis.__herdPgClient ?? (globalThis.__herdPgClient = createClient());
  return drizzle(client, { schema });
}

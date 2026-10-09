import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// Admin client (secret key). Server-only — used to create/list/remove user
// accounts via the Supabase Auth admin API. Never import this from a Client Component.
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase Admin indisponível: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  }

  client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PHOTOS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "herd-photos";

let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Fotos indisponíveis: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local (veja .env.example)."
    );
  }

  client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return client;
}

export function getPhotoStorage() {
  return getClient().storage.from(PHOTOS_BUCKET);
}

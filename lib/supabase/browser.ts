import { createBrowserClient } from "@supabase/ssr";

// Uses the publishable key only. The secret key (SUPABASE_SERVICE_ROLE_KEY) must never reach the browser.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

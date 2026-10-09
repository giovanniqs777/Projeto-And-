import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Reads the current session from cookies. Use this in Server Components / Route
// Handlers to find out who is logged in (publishable key only — not an admin client).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a context that can't set cookies (e.g. a Server Component render); safe to ignore.
        }
      },
    },
  });
}
